/**
 * Alex Orchestrator — Sprint 2 Pipeline V1 + Vision Alex Autonome
 * Chief of Staff. Receives Karim messages, classifies intent,
 * answers directly (simple) or delegates to Maestro (technical).
 *
 * V2 extensions (Vision Item #4):
 * - alexHandleAutonomous(): autonomous loop + delegation to 5 employees
 * - task_breaker for file content decomposition
 * - llm_judge for quality evaluation (Gemini cross-LLM, SOP R14)
 * - session_state for DB persistence (agent_runs + agent_run_tasks)
 * - Telegram progress updates every 5 tasks
 *
 * V3 extensions (Phase 5B.3):
 * - maestroHandle() wired for tech task delegation (orchestrator pattern)
 * - graceful fallback to dispatchToMaestro if maestroHandle throws
 *
 * V4 extensions (Phase 5B.4):
 * - delegateToAgent() wired for Sara/Leo/Marco/Nina (real CLAUDE.md + MCPs + memory)
 * - Replaces hardcoded dispatchToEmployee() with dynamic orchestrator delegation
 * - Extends intent classifier to 6 classes: comms/content/ops/research/technical/main
 */

// archived: import { callLLM } from '../adapters/llm/index.js'; -- PAYANT (DeepSeek/Gemini API)
import { query } from '@anthropic-ai/claude-agent-sdk';
import { getModelForAgent } from '../config/agent_models.js';

// Helper: call Claude Code SDK Pro Max ($0 forfait Karim)
async function callProMax(prompt: string, model: string): Promise<string> {
  let resultText = '';
  let assistantText = '';
  for await (const event of query({
    prompt,
    options: {
      model,
      allowDangerouslySkipPermissions: true,
      maxTurns: 3,
      settingSources: ['user'],
    },
  })) {
    const ev = event as Record<string, unknown>;
    if (ev['type'] === 'result') {
      resultText = (ev['result'] as string | null | undefined) ?? '';
    }
    if (ev['type'] === 'assistant') {
      const msg = ev['message'] as Record<string, unknown> | null | undefined;
      if (msg && Array.isArray(msg['content'])) {
        for (const block of msg['content'] as Record<string, unknown>[]) {
          if (block['type'] === 'text' && typeof block['text'] === 'string') {
            assistantText += block['text'];
          }
        }
      }
    }
  }
  return resultText || assistantText;
}
import { classifyIntent } from './intent_classifier.js';
import { dispatchToMaestro } from './maestro_dispatcher.js';
import { maestroHandle } from './maestro_orchestrator.js';
import { logger } from '../logger.js';
import { breakDownTasks } from './task_breaker.js';
import type { BrokenDownTask } from './task_breaker.js';
import { judge as llmJudge } from '../services/llm_judge.js';
import { createRun, updateRun, endRun, createTask, updateTask } from '../services/session_state.js';
import { readEnvFile } from '../env.js';
import { dispatchToTmuxSession } from '../services/cli_tmux_dispatcher.js';
import { delegateToAgent, getAvailableAgents } from '../orchestrator.js';
import { isFactoryRequest, runFactoryWorkflow } from './factory_workflow.js';

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_RETRIES_PER_TASK = 3;
const MAX_ITERATIONS = 20;
const KARIM_CHAT_ID = '5566541774';

// ── Interfaces ────────────────────────────────────────────────────────────

export interface AlexRequest {
  message: string;
  user_id: string;
  agent_id?: string;
}

export interface AlexResponse {
  success: boolean;
  response: string;
  intent: string;
  delegated_to_maestro: boolean;
  cost_usd: number;
  latency_ms: number;
  metadata?: Record<string, unknown>;
}

export interface AlexAutonomousRequest extends AlexRequest {
  file_content?: string;
}

export interface AlexAutonomousResponse extends AlexResponse {
  run_id?: string;
}

// ── Internal types ────────────────────────────────────────────────────────

interface DispatchResult {
  result: string;
  cost_usd: number;
  latency_ms: number;
  success: boolean;
}

// ── System prompts ────────────────────────────────────────────────────────

const SYSTEM_PROMPT_ALEX = `You are Alex, Chief of Staff for Karim Kouajjou (Silver Oak founder).
Personality: warm, direct, bilingual FR/EN, ADHD-aware (short sentences, bullet points, emojis when helpful).

Answer simple questions directly and concisely (max 150 words unless more detail is needed).
Do not explain your reasoning unless asked.`;

// ── Helpers ───────────────────────────────────────────────────────────────

async function sendTelegramProgress(text: string): Promise<void> {
  if (process.env["TELEGRAM_NOTIFICATIONS_DISABLED"] === "true") return;
  const envVars = readEnvFile(['TELEGRAM_BOT_TOKEN']);
  const token = process.env['TELEGRAM_BOT_TOKEN'] ?? envVars['TELEGRAM_BOT_TOKEN'] ?? '';
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: KARIM_CHAT_ID, text }),
    });
  } catch {
    // Non-blocking — Telegram updates are best-effort
  }
}

async function dispatchToEmployee(employee: string, task: BrokenDownTask, userId: string): Promise<DispatchResult> {
  // V4 Phase 5B.4: use delegateToAgent() from orchestrator.ts
  // Loads real CLAUDE.md, agent.yaml MCPs, memory, AGENTS.md per agent.
  // Archived: hardcoded EMPLOYEE_PROMPTS with wrong descriptions + wrong model binding.

  const EMPLOYEE_TO_AGENT_ID: Record<string, string> = {
    sara: 'comms',      // Gmail, email drafts, outreach, inbox triage
    leo: 'content',     // YouTube scripts, LinkedIn posts, content calendar
    marco: 'ops',       // Google Calendar, Hetzner infra, padel, finance
    nina: 'research',   // AI competition, EU/RGPD, competitive intel
  };

  const agentId = EMPLOYEE_TO_AGENT_ID[employee];
  const start = Date.now();

  if (!agentId) {
    logger.warn({ employee }, '[ALEX] Unknown employee -- no agentId mapping');
    return { result: `Unknown employee: ${employee}`, cost_usd: 0, latency_ms: 0, success: false };
  }

  try {
    logger.info({ employee, agentId, task: task.title }, '[ALEX] Delegating to employee via delegateToAgent');
    const delegResult = await delegateToAgent(agentId, task.description, userId, 'main');
    return {
      result: delegResult.text ?? '',
      cost_usd: 0,
      latency_ms: delegResult.durationMs,
      success: !!delegResult.text,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ employee, agentId, error: msg }, 'alex.employee.fail');
    return { result: `Employee ${employee} (${agentId}) error: ${msg}`, cost_usd: 0, latency_ms: Date.now() - start, success: false };
  }
}

// ── Domain intent router — 6-class routing (Phase 5B.4) ─────────────────────
// Extends binary classifier (simple_question/technical_task) with 4 domain intents.
// Keyword-based fast-path, zero LLM cost.

type DomainIntent = 'comms_task' | 'content_task' | 'ops_task' | 'research_task' | 'maestro_task' | 'sophie_task' | 'elena_task' | 'jules_task';

const DOMAIN_ROUTES: Array<{ intent: DomainIntent; agentId: string; patterns: RegExp[] }> = [
  {
    intent: 'comms_task',
    agentId: 'comms',
    patterns: [
      /\b(email|gmail|mail|inbox|message|r[eé]pondr?[ae]?|envoie|envoyer|r[eé]dige|r[eé]diger|draft|outreach|courrier)\b/i,
    ],
  },
  {
    intent: 'content_task',
    agentId: 'content',
    patterns: [
      /\b(youtube|linkedin|script|post|contenu|content|vid[eé]o|article|carousel|caption|reels?|newsletter)\b/i,
    ],
  },
  {
    intent: 'ops_task',
    agentId: 'ops',
    patterns: [
      /\b(agenda|calendrier|calendar|r[eé]union|meeting|rendez.vous|schedule|padel|hetzner|facture|finance|paiement|stripe|h[eé]bergement|serveur)\b/i,
    ],
  },
  {
    intent: 'research_task',
    agentId: 'research',
    patterns: [
      /\b(recherche|cherch[ae]|trouve|research|analys[ae]|veille|concurren|brief|intel|rapport|benchmark|compare|comparatif|news)\b/i,
    ],
  },
  // SOP V26 PROPER ORCHESTRATION : Maestro = directeur tech parmi les autres
  {
    intent: 'maestro_task',
    agentId: 'maestro',
    patterns: [
      /\b(code|coding|debug|bug|fix|deploy|d[eé]ploi|tsc|typescript|migration|refactor|architecture|backend|frontend|api|endpoint|database|supabase|postgres|tests?|test\s+e2e|workflow|orchestrat|router|dispatcher|service|module)\b/i,
    ],
  },
  {
    intent: 'sophie_task',
    agentId: 'sophie',
    patterns: [
      /\b(prd|product|jtbd|jobs.to.be.done|rice|lean.canvas|idea\s+validation|user\s+story|ux|specs?)\b/i,
    ],
  },
  {
    intent: 'elena_task',
    agentId: 'elena',
    patterns: [
      /\b(launch|product\s+hunt|ph\s+launch|cold\s+outreach|sales|gtm|go.to.market|stripe\s+setup|stripe\s+config|email\s+sequence|cold\s+email)\b/i,
    ],
  },
  {
    intent: 'jules_task',
    agentId: 'jules',
    patterns: [
      /\b(legal|cgv|cgu|dpa|privacy|policy|gdpr|rgpd|conformit[eé]|ai\s+act|compliance|audit\s+rgpd|data\s+processing)\b/i,
    ],
  },
];

// Regex fallback (used when dynamic LLM routing fails or returns 'none')
export function classifyDomainRouteRegex(message: string): { intent: DomainIntent; agentId: string } | null {
  // PhD fix 2026-04-30: replaces first-match-wins with score-based selection.
  // Score each route by total keyword matches, return highest score.
  let bestRoute: { intent: DomainIntent; agentId: string; score: number } | null = null;

  for (const entry of DOMAIN_ROUTES) {
    let score = 0;
    for (const pattern of entry.patterns) {
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      const matches = message.match(globalPattern);
      if (matches) score += matches.length;
    }
    if (score > 0 && (!bestRoute || score > bestRoute.score)) {
      bestRoute = { intent: entry.intent, agentId: entry.agentId, score };
    }
  }

  return bestRoute ? { intent: bestRoute.intent, agentId: bestRoute.agentId } : null;
}

// Dynamic LLM-based routing — reads agentRegistry, picks the most relevant agent.
// Falls back to regex if Pro Max fails, times out, or returns 'none'.
const DYNAMIC_ROUTING_TIMEOUT_MS = 8_000;
const KNOWN_DOMAIN_INTENTS: Record<string, DomainIntent> = {
  comms: 'comms_task',
  content: 'content_task',
  ops: 'ops_task',
  research: 'research_task',
  maestro: 'maestro_task',
  sophie: 'sophie_task',
  elena: 'elena_task',
  jules: 'jules_task',
};

async function classifyDomainRouteDynamic(message: string): Promise<{ intent: DomainIntent; agentId: string } | null> {
  let agents: { id: string; name: string; description: string }[];
  try {
    agents = getAvailableAgents();
  } catch (err) {
    logger.warn({ err }, '[ALEX] getAvailableAgents threw — falling back to regex');
    return null;
  }

  // SOP V26 PROPER ORCHESTRATION : Filter only main (Alex never delegates to itself).
  const candidates = agents.filter((a) => a.id !== 'main');
  if (candidates.length === 0) {
    logger.debug('[ALEX] No candidate agents in registry — falling back to regex');
    return null;
  }

  const agentList = candidates.map((a) => `- ${a.id}: ${a.description}`).join('\n');
  const validIds = candidates.map((a) => a.id).join(', ');
  const prompt = `Tu es le routeur d'Alex (Chief of Staff de Karim Kouajjou).

Voici les agents disponibles dans la factory Silver Oak OS :

${agentList}

Demande de Karim :
"${message}"

Réponds UNIQUEMENT avec l'id de l'agent le plus approprié, ou 'none' si aucun ne convient (auquel cas Alex répondra directement).

IDs valides : ${validIds}, none

Ta réponse (un seul mot, en minuscules) :`;

  try {
    // Pro Max forfait $0 — 8s timeout via Promise.race
    const model = getModelForAgent('alex');
    const resultPromise = callProMax(prompt, model);
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('dynamic routing timeout')), DYNAMIC_ROUTING_TIMEOUT_MS),
    );
    const raw = await Promise.race([resultPromise, timeoutPromise]);
    const cleaned = String(raw).trim().toLowerCase().split(/\s|[.,;:!?\n]/)[0] ?? '';

    if (!cleaned || cleaned === 'none') {
      logger.debug({ message: message.slice(0, 60) }, '[ALEX] Dynamic routing returned none');
      return null;
    }

    // Validate against actual registry — never trust LLM output blindly
    const matched = candidates.find((a) => a.id === cleaned);
    if (!matched) {
      logger.warn({ raw, cleaned, validIds }, '[ALEX] Dynamic routing returned unknown id — falling back to regex');
      return null;
    }

    // Map agentId to DomainIntent if known, otherwise generic 'research_task' as catch-all
    const intent = KNOWN_DOMAIN_INTENTS[matched.id] ?? ('research_task' as DomainIntent);
    logger.info({ agentId: matched.id, intent, source: 'dynamic_llm' }, '[ALEX] Dynamic routing success');
    return { intent, agentId: matched.id };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[ALEX] Dynamic routing failed — falling back to regex');
    return null;
  }
}

// Public entry — try dynamic first, fallback to regex.
export async function classifyDomainRoute(message: string): Promise<{ intent: DomainIntent; agentId: string } | null> {
  const dynamic = await classifyDomainRouteDynamic(message);
  if (dynamic) return dynamic;
  return classifyDomainRouteRegex(message);
}

// ── V1 — Original alexHandle (backward-compatible) ───────────────────────

export async function alexHandle(request: AlexRequest): Promise<AlexResponse> {
  const start = Date.now();

  logger.info({ user: request.user_id, len: request.message.length }, 'alex.request');

  try {
    // 0. Factory fast-path — detect "lance un SaaS" intent before standard routing
    if (isFactoryRequest(request.message)) {
      logger.info({ msg: request.message.slice(0, 80) }, '[ALEX] Factory SaaS request detected');
      const testMode = /\btest\b/i.test(request.message);
      try {
        const factoryResult = await runFactoryWorkflow({
          idea: request.message,
          userId: request.user_id,
          testMode,
        });
        const summary = factoryResult.blocked
          ? `⏸️ Factory en pause — HITL requis à l'étape ${factoryResult.blocked}`
          : factoryResult.success
          ? `✅ Factory terminée — SaaS \`${factoryResult.saasName}\` (${factoryResult.stepsCompleted}/${factoryResult.totalSteps} étapes)`
          : `❌ Factory échouée: ${factoryResult.error ?? 'unknown error'}`;
        return {
          success: factoryResult.success,
          response: summary,
          intent: 'factory_task',
          delegated_to_maestro: false,
          cost_usd: 0,
          latency_ms: Date.now() - start,
          metadata: { saasId: factoryResult.saasId, stepsCompleted: factoryResult.stepsCompleted },
        };
      } catch (factoryErr: unknown) {
        const errMsg = factoryErr instanceof Error ? factoryErr.message : String(factoryErr);
        logger.error({ error: errMsg }, '[ALEX] Factory workflow failed');
        return {
          success: false,
          response: `❌ Factory error: ${errMsg}`,
          intent: 'factory_task',
          delegated_to_maestro: false,
          cost_usd: 0,
          latency_ms: Date.now() - start,
        };
      }
    }

    // 1. Classify intent
    const intent = await classifyIntent(request.message);
    logger.info({ intent: intent.intent, confidence: intent.confidence }, 'alex.intent');

    // 2. Technical task with high confidence → delegate to Maestro Orchestrator (Phase 5B.3)
    if (intent.intent === 'technical_task' && intent.confidence > 0.6) {
      logger.info(
        { task: request.message.slice(0, 80), user: request.user_id },
        '[ALEX] Delegating to Maestro for tech task'
      );

      try {
        const maestroResult = await maestroHandle(request.message, {
          userId: request.user_id,
        });

        logger.info(
          { success: maestroResult.success, mode: maestroResult.mode, taskId: maestroResult.taskId },
          'alex.delegated_to_maestro'
        );

        return {
          success: maestroResult.success,
          response: maestroResult.success
            ? "🤖 **Maestro** (plan d'exécution) :\n\n" + maestroResult.result
            : "❌ Maestro error: task failed",
          intent: 'technical_task',
          delegated_to_maestro: true,
          cost_usd: intent.cost_usd,
          latency_ms: Date.now() - start,
          metadata: {
            provider_used: maestroResult.provider,
            intent_confidence: intent.confidence,
            maestro_mode: maestroResult.mode,
            maestro_task_id: maestroResult.taskId,
            judge_score: maestroResult.judgeScore,
          },
        };
      } catch (maestroErr: unknown) {
        const errMsg = maestroErr instanceof Error ? maestroErr.message : String(maestroErr);
        logger.warn({ error: errMsg }, '[ALEX] maestroHandle failed, fallback to dispatchToMaestro');

        // Graceful fallback to original dispatchToMaestro
        const fallbackResult = await dispatchToMaestro({
          task_description: request.message,
          user_id: request.user_id,
          max_tokens: 500,
        });

        const totalCostFallback = intent.cost_usd + fallbackResult.cost_usd;
        return {
          success: fallbackResult.success,
          response: fallbackResult.success
            ? "🤖 **Maestro** (plan d'exécution) :\n\n" + fallbackResult.result
            : "❌ Maestro error: " + (fallbackResult.error ?? 'unknown'),
          intent: 'technical_task',
          delegated_to_maestro: true,
          cost_usd: totalCostFallback,
          latency_ms: Date.now() - start,
          metadata: {
            provider_used: fallbackResult.provider_used,
            intent_confidence: intent.confidence,
            fallback: true,
          },
        };
      }
    }

    // 3. Domain routing -- check if message targets a specific employee agent
    // Phase 5B.4: extends binary classifier with comms/content/ops/research
    const domainRoute = await classifyDomainRoute(request.message);
    if (domainRoute) {
      logger.info(
        { agentId: domainRoute.agentId, intent: domainRoute.intent, msg: request.message.slice(0, 60) },
        '[ALEX] Domain routing to employee agent',
      );
      try {
        const delegResult = await delegateToAgent(domainRoute.agentId, request.message, request.user_id, 'main');
        return {
          success: !!delegResult.text,
          response: delegResult.text ?? `${domainRoute.agentId} returned empty response`,
          intent: domainRoute.intent,
          delegated_to_maestro: false,
          cost_usd: intent.cost_usd,
          latency_ms: Date.now() - start,
          metadata: {
            intent_confidence: intent.confidence,
            domain_agent: domainRoute.agentId,
            delegation_task_id: delegResult.taskId,
            delegation_duration_ms: delegResult.durationMs,
          },
        };
      } catch (delegErr: unknown) {
        const errMsg = delegErr instanceof Error ? delegErr.message : String(delegErr);
        logger.warn({ agentId: domainRoute.agentId, error: errMsg }, '[ALEX] delegateToAgent failed, fallback to direct answer');
        // Fall through to direct Alex answer
      }
    }

    // 4. Simple question → Alex answers directly
    // Mode 1: CLI tmux Pro Max ($0 forfait) | Mode 2: API Gemini Flash (archived: was Anthropic Haiku)
    if (process.env['USE_ALEX_PRO_MAX'] === 'true') {
      // Mode 1 — dispatch via MCP Bridge tmux session 'claude-code'
      const tmuxResult = await dispatchToTmuxSession('claude-code', request.message, {
        timeoutMs: 300_000,
        pollIntervalMs: 30_000,
      });
      logger.info(
        { cost: 0, model: tmuxResult.model, mode: 'mode_1_tmux' },
        'alex.direct_reply.mode1'
      );
      return {
        success: true,
        response: tmuxResult.content,
        intent: intent.intent,
        delegated_to_maestro: false,
        cost_usd: intent.cost_usd, // intent classification cost (small)
        latency_ms: Date.now() - start,
        metadata: {
          intent_confidence: intent.confidence,
          mode: 'mode_1_tmux',
          source: 'pro_max_forfait',
          model: tmuxResult.model,
        },
      };
    }

    // Mode 2 — API Gemini Flash (archived: was Anthropic Haiku — zero-anthropic Phase F)
    // archived: callLLM({ provider: 'google', model: 'gemini-2.5-flash' }) -- PAYANT
    // archived: callLLM({ provider: 'anthropic', model: 'claude-haiku-4-5' }) -- zero-anthropic Phase F
    const alexPrompt = SYSTEM_PROMPT_ALEX + '\n\nUser: ' + request.message;
    const alexContent = await callProMax(alexPrompt, getModelForAgent('alex')); // Sonnet Pro Max

    const totalCost = intent.cost_usd + 0; // Pro Max forfait = $0
    logger.info({ cost: totalCost, intent: intent.intent, mode: 'mode_2_api' }, 'alex.direct_reply');

    return {
      success: true,
      response: alexContent,
      intent: intent.intent,
      delegated_to_maestro: false,
      cost_usd: totalCost,
      latency_ms: Date.now() - start,
      metadata: { intent_confidence: intent.confidence, mode: 'mode_2_claude_code_sdk' },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg }, 'alex.fail');
    return {
      success: false,
      response: `Alex error: ${msg}`,
      intent: 'unknown',
      delegated_to_maestro: false,
      cost_usd: 0,
      latency_ms: Date.now() - start,
    };
  }
}

// ── V2 — alexHandleAutonomous: loop + 5 employees ────────────────────────

export async function alexHandleAutonomous(
  request: AlexAutonomousRequest,
): Promise<AlexAutonomousResponse> {
  const start = Date.now();

  logger.info(
    { user: request.user_id, has_file: !!request.file_content, msg_len: request.message.length },
    'alex.autonomous.start',
  );

  // 1. Create run record in DB
  const run = await createRun({
    user_id: request.user_id,
    initial_request: request.message,
    initial_file_content: request.file_content,
    status: 'running',
    max_iterations: MAX_ITERATIONS,
  });

  const runId = run?.id;
  let totalCost = 0;

  // 2. Break down tasks (or single-task fallback)
  let tasks: BrokenDownTask[];
  if (request.file_content) {
    const broken = await breakDownTasks(request.file_content, request.user_id);
    tasks = broken.tasks;
    totalCost += broken.cost_usd;
    logger.info({ count: tasks.length, cost: broken.cost_usd }, 'alex.autonomous.tasks_broken');
  } else {
    tasks = [{
      id: 'task_001',
      title: 'Direct request',
      description: request.message,
      type: 'unknown',
      agent_target: 'maestro',
      dependencies: [],
      estimated_effort_min: 30,
      priority: 'P1',
      rationale: 'Single direct task — no file_content provided',
    }];
  }

  if (runId) {
    await updateRun(runId, {
      tasks_total: tasks.length,
      tasks_pending: tasks.length,
      tasks_completed: 0,
      tasks_failed: 0,
    });
  }

  // 3. Loop over tasks (Vision Item #4 — autonomous execution)
  const results: Array<{
    task: BrokenDownTask;
    grade: string;
    is_completed: boolean;
    result: string;
    cost_usd: number;
    attempts: number;
  }> = [];

  let completedCount = 0;
  let failedCount = 0;

  for (
    let taskIndex = 0;
    taskIndex < Math.min(tasks.length, MAX_ITERATIONS);
    taskIndex++
  ) {
    const task = tasks[taskIndex];
    if (!task) break;

    let taskResult = '';
    let taskCost = 0;
    let judgeGrade = 'F';
    let isCompleted = false;
    let attempts = 0;

    // Create DB task record (once per task, not per attempt)
    const dbTask = runId
      ? await createTask({
          run_id: runId,
          task_id: task.id,
          title: task.title,
          task_type: task.type,
          agent_target: task.agent_target,
          status: 'running',
        })
      : null;

    const dbTaskId = dbTask?.id;

    // Retry loop: up to MAX_RETRIES_PER_TASK attempts per task
    while (attempts < MAX_RETRIES_PER_TASK) {
      attempts++;

      logger.info(
        { task: task.id, attempt: attempts, target: task.agent_target },
        'alex.autonomous.dispatch',
      );

      // Dispatch to the appropriate agent
      let dispatched: DispatchResult;
      if (task.agent_target === 'maestro') {
        // Phase 5B.3: use maestroHandle (orchestrator) instead of raw dispatchToMaestro
        logger.info({ task: task.title }, '[ALEX] Delegating autonomous task to Maestro orchestrator');
        const maestroOrcResult = await maestroHandle(task.description, {
          userId: request.user_id,
          parentTaskId: runId,
        });
        dispatched = {
          result: maestroOrcResult.result,
          cost_usd: 0, // maestroHandle tracks cost internally via logAgentRun
          latency_ms: maestroOrcResult.durationMs,
          success: maestroOrcResult.success,
        };
      } else if (['sara', 'leo', 'marco', 'nina'].includes(task.agent_target)) {
        dispatched = await dispatchToEmployee(task.agent_target, task, request.user_id);
      } else {
        dispatched = { result: 'Unknown agent target', cost_usd: 0, latency_ms: 0, success: false };
      }

      totalCost += dispatched.cost_usd;
      taskCost += dispatched.cost_usd;
      taskResult = dispatched.result;

      // Judge result via Gemini cross-LLM (SOP R14 — no self-grading bias)
      // Build expected_output per agent type — sets fair judge expectations
      const expectedOutput = task.agent_target === 'maestro'
        ? 'Detailed implementation plan with specific steps, code guidance, and technical approach'
        : task.agent_target === 'sara'
        ? 'Marketing strategy with target audience, content plan, channels, KPIs, and timeline'
        : task.agent_target === 'marco'
        ? 'Financial analysis with numbers, scenarios (best/base/worst), risks, and recommendations'
        : task.agent_target === 'leo'
        ? 'Design specification with user journey, wireframe description, components, and accessibility notes'
        : task.agent_target === 'nina'
        ? 'Data analysis plan with data sources, methodology, findings, and action items'
        : 'Detailed professional deliverable addressing all key aspects of the task';

      const judged = await llmJudge({
        task_description: task.description,
        expected_output: expectedOutput,
        actual_output: dispatched.result,
        task_type: task.type,
      });
      totalCost += judged.cost_usd;
      taskCost += judged.cost_usd;
      judgeGrade = judged.grade;
      isCompleted = judged.is_completed;

      logger.info(
        { task: task.id, attempt: attempts, grade: judgeGrade, is_completed: isCompleted },
        'alex.autonomous.judged',
      );

      // Success: completed AND quality grade A or B
      if (isCompleted && (judgeGrade === 'A' || judgeGrade === 'B')) {
        break;
      }
      // grade C/D/F or not completed → retry unless max retries reached
    }

    // Final DB update for task
    if (dbTaskId) {
      await updateTask(dbTaskId, {
        status: isCompleted ? 'completed' : 'failed',
        result: taskResult.slice(0, 5000),
        cost_usd: taskCost,
        ended_at: new Date().toISOString(),
      });
    }

    if (isCompleted) {
      completedCount++;
    } else {
      failedCount++;
    }

    results.push({
      task,
      grade: judgeGrade,
      is_completed: isCompleted,
      result: taskResult,
      cost_usd: taskCost,
      attempts,
    });

    // Update run progress in DB
    if (runId) {
      await updateRun(runId, {
        tasks_completed: completedCount,
        tasks_failed: failedCount,
        tasks_pending: tasks.length - completedCount - failedCount,
        current_iteration: taskIndex + 1,
        total_cost_usd: totalCost,
      });
    }

    // Telegram progress update every 5 tasks
    if ((taskIndex + 1) % 5 === 0) {
      const progressMsg =
        `🔄 Alex Loop Progress — ${taskIndex + 1}/${tasks.length} taches traitees\n` +
        `✅ ${completedCount} completes | ❌ ${failedCount} echecs\n` +
        `💰 Cout cumule: $${totalCost.toFixed(4)}`;
      await sendTelegramProgress(progressMsg);
    }
  }

  // 4. End run in DB
  const finalStatus: 'completed' | 'failed' = completedCount === tasks.length ? 'completed' : 'failed';
  if (runId) {
    await endRun(runId, finalStatus);
  }

  // 5. Build summary response
  const summaryLines = results.map(
    (r, i) =>
      `${i + 1}. [${r.grade}] ${r.task.title} → ${r.task.agent_target} (${r.attempts} essai${r.attempts > 1 ? 's' : ''})`,
  );

  const summary =
    `🎯 Alex Autonomous Run terminé.\n\n` +
    `Tasks: ${tasks.length} total | ${completedCount} ✅ | ${failedCount} ❌\n` +
    `Cout: $${totalCost.toFixed(4)} | Run: ${runId ?? 'no-db'}\n\n` +
    summaryLines.join('\n');

  logger.info(
    { run_id: runId, completed: completedCount, failed: failedCount, cost: totalCost },
    'alex.autonomous.done',
  );

  return {
    success: completedCount > 0,
    response: summary,
    intent: 'autonomous_run',
    delegated_to_maestro: true,
    cost_usd: totalCost,
    latency_ms: Date.now() - start,
    run_id: runId,
    metadata: {
      tasks_total: tasks.length,
      tasks_completed: completedCount,
      tasks_failed: failedCount,
    },
  };
}

export default alexHandle;
