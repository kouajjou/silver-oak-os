/**
 * backlog-parser.ts — BACKLOG.md autonomous parser for Maestro
 *
 * Reads a BACKLOG.md file and returns a structured TaskWave ready for dispatch.
 * Follows the BACKLOG_TEMPLATE.md format.
 *
 * Usage:
 *   const wave = parseBacklog(fs.readFileSync('BACKLOG.md', 'utf-8'));
 *   // wave.tasks are ordered respecting dependencies
 *   // wave.metadata contains budget cap, HITL reactivity, etc.
 */
// ── Parser helpers ───────────────────────────────────────────────────────────
function extractField(block, fieldName) {
    const re = new RegExp(`\\*\\*${fieldName}\\*\\*\\s*:\\s*(.+?)(?=\\n-\\s\\*\\*|\\n###|$)`, 's');
    const m = block.match(re);
    return m ? m[1].trim() : '';
}
function extractBudget(text) {
    const m = text.match(/\$(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
}
function extractAutonomy(titleLine) {
    if (titleLine.includes('[AUTO]'))
        return 'AUTO';
    if (titleLine.includes('[NOTIFY]'))
        return 'NOTIFY';
    if (titleLine.includes('[HITL]'))
        return 'HITL';
    return 'NOTIFY'; // safe default
}
function extractTaskId(titleLine) {
    const m = titleLine.match(/###\s+(T\d+)/);
    return m ? m[1] : 'T?';
}
function extractTitle(titleLine) {
    return titleLine
        .replace(/###\s+T\d+\s+\[AUTO\]\s+/g, '')
        .replace(/###\s+T\d+\s+\[NOTIFY\]\s+/g, '')
        .replace(/###\s+T\d+\s+\[HITL\]\s+/g, '')
        .trim();
}
function generateBranch(taskId, title) {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
    return `feature/${taskId.toLowerCase()}-${slug}`;
}
function generateWaveId() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `wave-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}
// ── Dependency parser ────────────────────────────────────────────────────────
/**
 * Parse dependency rules like:
 *   "T2 attend T1 done"     → T2 dependsOn [T1]
 *   "T3 + T4 parallèle"     → no dependencies
 *   "T5 attend T3 OU T4"    → T5 dependsOn [T3, T4] with OR semantics (first wins)
 *   "T6 attend T3 ET T4"    → T6 dependsOn [T3, T4]
 */
function parseDependencies(depSection, tasks) {
    const lines = depSection.split('\n').filter(l => l.trim());
    for (const line of lines) {
        // Skip comment lines
        if (line.trim().startsWith('#') || line.trim().startsWith('//'))
            continue;
        // Find the "dependent" task (first T-ID in the line)
        const taskMatch = line.match(/^(T\d+)/);
        if (!taskMatch)
            continue;
        const dependentId = taskMatch[1];
        const task = tasks.find(t => t.id === dependentId);
        if (!task)
            continue;
        // Look for "attend" / "after" / "requires" / "depends on"
        const waitKeywords = /attend|after|requires?|depends?\s*on/i;
        if (!waitKeywords.test(line))
            continue;
        // Extract all referenced task IDs after the keyword
        const afterKeyword = line.replace(/^T\d+\s+(?:attend|after|requires?|depends?\s*on)\s+/i, '');
        const deps = afterKeyword.match(/T\d+/g) ?? [];
        for (const dep of deps) {
            if (!task.dependsOn.includes(dep)) {
                task.dependsOn.push(dep);
            }
        }
    }
}
// ── Main parser ──────────────────────────────────────────────────────────────
/**
 * Parse a BACKLOG.md string into a structured TaskWave.
 *
 * @param content  Raw markdown content of the BACKLOG.md file
 * @returns        Structured TaskWave with tasks in dependency order
 */
export function parseBacklog(content) {
    const tasks = [];
    let depSection = '';
    // ── Extract metadata ──
    const metadataMatch = content.match(/## Métadonnées([\s\S]*?)(?=##)/);
    const metaBlock = metadataMatch ? metadataMatch[1] : '';
    const budgetMatch = metaBlock.match(/Budget cap\s*:\s*\$(\d+(?:\.\d+)?)/);
    const durationMatch = metaBlock.match(/Durée max\s*:\s*(\d+(?:\.\d+)?)h/);
    const hitlMatch = metaBlock.match(/HITL réactivité\s*:\s*(haute|normale|faible)/i);
    const parallelMatch = metaBlock.match(/Max parallélisme\s*:\s*(\d+)/);
    const dateMatch = metaBlock.match(/Date\s*:\s*(\S+\s*\S*)/);
    const authorMatch = metaBlock.match(/Auteur\s*:\s*(.+)/);
    const metadata = {
        author: authorMatch ? authorMatch[1].trim() : 'Karim',
        date: dateMatch ? dateMatch[1].trim() : new Date().toISOString().slice(0, 16),
        budgetCapUsd: budgetMatch ? parseFloat(budgetMatch[1]) : 1.0,
        durationMaxH: durationMatch ? parseFloat(durationMatch[1]) : 2,
        hitlReactivity: hitlMatch?.[1]?.toLowerCase() ?? 'normale',
        maxParallelism: parallelMatch ? parseInt(parallelMatch[1]) : 3,
    };
    // ── Extract tasks ──
    // Split on task headers: "### T1 [AUTO] ..."
    const taskPattern = /^(### T\d+ \[(?:AUTO|NOTIFY|HITL)\][^\n]+)/gm;
    const taskStarts = [];
    let m;
    while ((m = taskPattern.exec(content)) !== null) {
        taskStarts.push({ index: m.index, line: m[0] });
    }
    for (let i = 0; i < taskStarts.push.length; i++) {
        const start = taskStarts[i];
        const end = taskStarts[i + 1]?.index ?? content.length;
        const block = content.slice(start.index, end);
        const taskId = extractTaskId(start.line);
        const title = extractTitle(start.line);
        const autonomy = extractAutonomy(start.line);
        const description = extractField(block, 'Description');
        const acceptance = extractField(block, 'Acceptance criteria');
        const workerRaw = extractField(block, 'Worker suggéré');
        const budgetRaw = extractField(block, 'Budget cap');
        const branchRaw = extractField(block, 'Branche feature');
        const testsRaw = extractField(block, 'Tests');
        const notesRaw = extractField(block, 'Notes Karim');
        const task = {
            id: taskId,
            title,
            autonomy,
            description,
            acceptanceCriteria: acceptance,
            suggestedWorker: workerRaw || undefined,
            budgetCapUsd: budgetRaw ? extractBudget(budgetRaw) : undefined,
            featureBranch: branchRaw && !branchRaw.includes('auto') ? branchRaw : generateBranch(taskId, title),
            tests: testsRaw || undefined,
            notes: notesRaw || undefined,
            dependsOn: [],
            status: 'pending',
            failCount: 0,
        };
        tasks.push(task);
    }
    // ── Extract dependencies ──
    const depSectionMatch = content.match(/## Dépendances entre tâches([\s\S]*?)(?=##|$)/);
    if (depSectionMatch) {
        depSection = depSectionMatch[1];
        parseDependencies(depSection, tasks);
    }
    return {
        waveId: generateWaveId(),
        metadata,
        tasks,
        dependencyRules: depSection ? depSection.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')) : [],
    };
}
// ── Task readiness ───────────────────────────────────────────────────────────
/**
 * Returns tasks that are ready to execute (pending + all deps done).
 */
export function getReadyTasks(wave) {
    return wave.tasks.filter(task => {
        if (task.status !== 'pending')
            return false;
        return task.dependsOn.every(depId => {
            const dep = wave.tasks.find(t => t.id === depId);
            return dep?.status === 'done';
        });
    });
}
/**
 * Apply anti-churn: mark task as skipped after 2 fails.
 * Returns true if the task was skipped.
 */
export function applyAntiChurn(task) {
    task.failCount++;
    if (task.failCount >= 2) {
        task.status = 'skipped';
        return true;
    }
    return false;
}
/**
 * Build the full prompt for a worker given a task.
 * Includes AGENTS.md context, task details, and mandatory SOP rules.
 */
export function buildWorkerPrompt(task, agentsMd, waveId) {
    return `[Contexte partagé AGENTS.md]
${agentsMd}
[Fin contexte]

[Tâche BACKLOG — ${task.id}]
TITRE: ${task.title}
WAVE: ${waveId}
NIVEAU: ${task.autonomy}
BRANCHE: ${task.featureBranch}
BUDGET CAP: $${task.budgetCapUsd ?? 'hérité du global'}

DESCRIPTION:
${task.description}

ACCEPTANCE CRITERIA:
${task.acceptanceCriteria}

${task.notes ? `NOTES KARIM:\n${task.notes}\n` : ''}

RÈGLES OBLIGATOIRES:
- Lire le code existant avant de modifier (R7)
- tsc --noEmit après chaque modification TypeScript
- Commit propre sur ${task.featureBranch}
- JAMAIS de commit direct sur master
- TASK_DONE_${waveId}-${task.id} quand terminé
- Si impossible → CANNOT_EXECUTE + raison précise (jamais simuler)
`;
}
//# sourceMappingURL=backlog-parser.js.map