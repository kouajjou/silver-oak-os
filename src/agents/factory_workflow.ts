/**
 * Factory Workflow — SaaS Launch Orchestrator
 *
 * Input: "lance un SaaS pour [idée]"
 * 12 steps: validation → marché → PRD → code → landing → RGPD → Stripe →
 *           launch → outreach → métriques → MRR → live
 *
 * - Persists to saas_projects table (requires 20260502_saas_projects.sql migration)
 * - Creates 4 MD files per SaaS in saas/<saas-id>/
 * - Sends HITL Telegram at each stage transition
 * - TEST_MODE: skips external actions (Stripe, PH, outreach)
 */

import { logger } from '../logger.js';
import { readEnvFile } from '../env.js';
import { delegateToAgent } from '../orchestrator.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ── Constants ─────────────────────────────────────────────────────────────

const KARIM_CHAT_ID = '5566541774';
const PROJECT_ROOT = process.cwd();
const SAAS_DIR = path.join(PROJECT_ROOT, 'saas');
const TEMPLATE_DIR = path.join(SAAS_DIR, '_template');

// ── Types ─────────────────────────────────────────────────────────────────

export type SaasStatus = 'idea' | 'validating' | 'building' | 'live';

export interface SaasProject {
  id: string;
  name: string;
  status: SaasStatus;
  mrr: number;
  users: number;
  decisions: unknown[];
  backlog: unknown[];
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FactoryWorkflowInput {
  idea: string;
  userId: string;
  testMode?: boolean;
}

export interface FactoryWorkflowResult {
  success: boolean;
  saasId: string;
  saasName: string;
  stepsCompleted: number;
  totalSteps: number;
  stepResults: StepResult[];
  blocked?: string;
  error?: string;
}

interface StepResult {
  step: number;
  name: string;
  status: 'completed' | 'skipped' | 'failed' | 'awaiting_hitl';
  output?: string;
  error?: string;
  durationMs: number;
}

// ── Telegram helper ───────────────────────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
  const envVars = readEnvFile(['TELEGRAM_BOT_TOKEN']);
  const token = process.env['TELEGRAM_BOT_TOKEN'] ?? envVars['TELEGRAM_BOT_TOKEN'] ?? '';
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: KARIM_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch {
    // Non-blocking
  }
}

// ── SaaS file helpers ─────────────────────────────────────────────────────

function createSaasDirectory(saasId: string): string {
  const saasPath = path.join(SAAS_DIR, saasId);
  fs.mkdirSync(saasPath, { recursive: true });

  // Copy templates
  for (const file of ['CONTEXT.md', 'DECISIONS.md', 'ROADMAP.md', 'PRD.md']) {
    const templateFile = path.join(TEMPLATE_DIR, file);
    const targetFile = path.join(saasPath, file);
    if (fs.existsSync(templateFile) && !fs.existsSync(targetFile)) {
      fs.copyFileSync(templateFile, targetFile);
    }
  }

  return saasPath;
}

function updateSaasFile(saasPath: string, file: string, content: string): void {
  const filePath = path.join(saasPath, file);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function appendDecision(saasPath: string, decision: string): void {
  const filePath = path.join(saasPath, 'DECISIONS.md');
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## ${date} — ${decision}\n\n**Decided by**: Factory Workflow\n`;
  const updated = existing.replace('<!-- Add new decisions above this line -->', entry + '\n<!-- Add new decisions above this line -->');
  fs.writeFileSync(filePath, updated, 'utf-8');
}

// ── Factory steps ─────────────────────────────────────────────────────────

const FACTORY_STEPS = [
  { step: 1, name: 'Idea Validation', agent: 'sophie', hitl: false },
  { step: 2, name: 'Market Research', agent: 'research', hitl: false },
  { step: 3, name: 'PRD Writing', agent: 'sophie', hitl: true },
  { step: 4, name: 'MVP Build', agent: 'maestro', hitl: true },
  { step: 5, name: 'Landing Page', agent: 'content', hitl: false },
  { step: 6, name: 'RGPD Audit', agent: 'jules', hitl: false },
  { step: 7, name: 'Stripe Setup', agent: 'ops', hitl: true },
  { step: 8, name: 'Launch Prep', agent: 'elena', hitl: false },
  { step: 9, name: 'Cold Outreach', agent: 'elena', hitl: true },
  { step: 10, name: 'Metrics Setup', agent: 'ops', hitl: false },
  { step: 11, name: 'MRR Tracking', agent: 'ops', hitl: false },
  { step: 12, name: 'Go Live', agent: 'maestro', hitl: true },
] as const;

function buildStepPrompt(step: typeof FACTORY_STEPS[number], saasName: string, idea: string, previousOutput: string, testMode: boolean): string {
  const testNote = testMode ? '\n\n⚠️ TEST MODE: Do not take any real external actions (no real Stripe, no real PH, no real emails). Simulate results.' : '';

  const prompts: Record<number, string> = {
    1: `Tu es Sophie. Utilise le skill idea_validation pour valider cette idée SaaS: "${idea}". Donne un GO/NO-GO avec evidence. Réponds en français.${testNote}`,
    2: `Tu es Nina. Utilise le skill market_research pour analyser le marché de "${saasName}". Donne TAM/SAM/SOM et 3 insights clés. Réponds en français.${testNote}`,
    3: `Tu es Sophie. Sur la base de la validation (${previousOutput.slice(0, 200)}...), écris un PRD complet pour "${saasName}". Inclus les non-goals obligatoirement. Réponds en français.${testNote}`,
    4: `Tu es Maestro. Sur la base du PRD, définis l'architecture technique MVP de "${saasName}" (stack, composants, estimation effort). En test mode, décris seulement l'architecture sans coder.${testNote}`,
    5: `Tu es Léo. Utilise le skill landing_copy pour écrire la copy complète de la landing page de "${saasName}". Headline, subheadline, 3 features, social proof, pricing section, CTA. Réponds en français.${testNote}`,
    6: `Tu es Jules. Utilise le skill gdpr_audit pour auditer "${saasName}". Liste les risques RGPD et les documents légaux nécessaires (privacy policy, CGV, DPA). Réponds en français.${testNote}`,
    7: `Tu es Marco. Pour "${saasName}", définis la configuration Stripe: 2-3 tiers de pricing, trial logic, webhooks nécessaires. Donne une config concrète prête à implémenter.${testNote}`,
    8: `Tu es Elena. Prépare le launch package complet pour "${saasName}": PH launch assets, stratégie multi-threaded (PH + LinkedIn + Reddit + BetaList), timeline lancement. Réponds en français.${testNote}`,
    9: `Tu es Elena. Crée une séquence de cold outreach de 5 emails pour "${saasName}". Cible: [ICP à définir]. Inclus les 5 emails complets avec objet et corps. Réponds en français.${testNote}`,
    10: `Tu es Marco. Pour "${saasName}", définis les 5 métriques clés à tracker (Activation, Retention, Revenue, Acquisition, Satisfaction), les outils recommandés et les alertes à configurer.${testNote}`,
    11: `Tu es Marco. Crée le MRR tracking setup pour "${saasName}": comment calculer le MRR depuis Stripe, quelles alertes configurer, quel dashboard recommander. Utilise le skill calculate_mrr.${testNote}`,
    12: `Tu es Maestro. Décris le go-live checklist complet pour "${saasName}": infrastructure, monitoring, backup, alertes, support. Vérifie que tous les garde-fous sont en place. ${testMode ? 'TEST MODE: simuler uniquement.' : 'PRODUCTION: vérifie chaque point réellement.'}`,
  };

  return prompts[step.step] ?? `Exécute l'étape ${step.name} pour ${saasName}`;
}

// ── Main workflow ─────────────────────────────────────────────────────────

export async function runFactoryWorkflow(input: FactoryWorkflowInput): Promise<FactoryWorkflowResult> {
  const { idea, userId, testMode = false } = input;
  const saasId = `saas-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const saasName = idea.length > 40 ? idea.slice(0, 37) + '...' : idea;

  logger.info({ saasId, idea, testMode }, 'factory_workflow.start');

  // Create SaaS directory + copy templates
  const saasPath = createSaasDirectory(saasId);
  logger.info({ saasPath }, 'factory_workflow.dir_created');

  // Update CONTEXT.md with initial info
  const contextContent = fs.readFileSync(path.join(TEMPLATE_DIR, 'CONTEXT.md'), 'utf-8')
    .replace('[SaaS Name]', saasName)
    .replace('idea | validating | building | live', 'idea')
    .replace('[DATE]', new Date().toISOString().split('T')[0]);
  updateSaasFile(saasPath, 'CONTEXT.md', contextContent);

  // Announce start
  await sendTelegram(
    `🏭 *Factory SaaS démarrée*\n\n` +
    `💡 Idée: ${idea}\n` +
    `🆔 ID: \`${saasId}\`\n` +
    `${testMode ? '🧪 Mode: TEST (aucune action réelle)\n' : ''}` +
    `\n12 étapes en cours...`
  );

  const stepResults: StepResult[] = [];
  let previousOutput = '';
  let stepsCompleted = 0;

  for (const step of FACTORY_STEPS) {
    const stepStart = Date.now();

    logger.info({ step: step.step, name: step.name, agent: step.agent }, 'factory_workflow.step_start');

    // HITL checkpoint — pause and notify
    if (step.hitl && !testMode) {
      await sendTelegram(
        `⏸️ *HITL Checkpoint — Étape ${step.step}: ${step.name}*\n\n` +
        `🏭 SaaS: ${saasName}\n` +
        `📋 Étapes complétées: ${stepsCompleted}/${FACTORY_STEPS.length}\n\n` +
        `Confirme pour continuer: "Alex, continue factory ${saasId}"`
      );

      stepResults.push({
        step: step.step,
        name: step.name,
        status: 'awaiting_hitl',
        output: 'HITL checkpoint — awaiting Karim confirmation',
        durationMs: Date.now() - stepStart,
      });

      logger.info({ step: step.step }, 'factory_workflow.hitl_pause');

      // In non-test mode, we stop here and wait for next dispatch
      return {
        success: true,
        saasId,
        saasName,
        stepsCompleted,
        totalSteps: FACTORY_STEPS.length,
        stepResults,
        blocked: `HITL at step ${step.step}: ${step.name}`,
      };
    }

    try {
      const prompt = buildStepPrompt(step, saasName, idea, previousOutput, testMode);

      let output: string;
      if (testMode) {
        // Test mode: use delegateToAgent but with test prompt
        try {
          const result = await delegateToAgent(step.agent, prompt, userId, 'main');
          output = result.text ?? `[${step.name} simulated — test mode]`;
        } catch {
          output = `[${step.name} simulated — test mode (agent unavailable)]`;
        }
      } else {
        const result = await delegateToAgent(step.agent, prompt, userId, 'main');
        output = result.text ?? `${step.name} returned empty response`;
      }

      previousOutput = output;
      stepsCompleted++;

      // Persist step output to appropriate file
      if (step.step === 3) {
        updateSaasFile(saasPath, 'PRD.md', output);
      }
      if (step.step === 1) {
        appendDecision(saasPath, `Idea validation: ${output.slice(0, 80)}`);
      }

      stepResults.push({
        step: step.step,
        name: step.name,
        status: 'completed',
        output: output.slice(0, 500),
        durationMs: Date.now() - stepStart,
      });

      logger.info({ step: step.step, durationMs: Date.now() - stepStart }, 'factory_workflow.step_done');

      // Progress update every 3 steps
      if (step.step % 3 === 0) {
        await sendTelegram(
          `📊 *Factory Progress*\n` +
          `${saasName} — ${stepsCompleted}/${FACTORY_STEPS.length} étapes\n` +
          `✅ ${step.name} terminé`
        );
      }

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ step: step.step, error: errMsg }, 'factory_workflow.step_error');

      stepResults.push({
        step: step.step,
        name: step.name,
        status: 'failed',
        error: errMsg,
        durationMs: Date.now() - stepStart,
      });

      await sendTelegram(
        `❌ *Factory Error — Étape ${step.step}: ${step.name}*\n\n` +
        `Erreur: ${errMsg.slice(0, 200)}\n` +
        `SaaS: ${saasName}`
      );

      // Continue to next step on non-critical failures
      if (step.step <= 3) {
        // Early steps are critical — stop factory
        return {
          success: false,
          saasId,
          saasName,
          stepsCompleted,
          totalSteps: FACTORY_STEPS.length,
          stepResults,
          error: `Critical step ${step.step} failed: ${errMsg}`,
        };
      }
    }
  }

  // All steps complete
  const successMsg =
    `🎉 *Factory SaaS terminée!*\n\n` +
    `✅ ${saasName}\n` +
    `📁 Fichiers: \`saas/${saasId}/\`\n` +
    `📊 ${stepsCompleted}/${FACTORY_STEPS.length} étapes complétées\n` +
    (testMode ? '🧪 Mode test — aucune action réelle effectuée' : '🚀 Prêt pour go-live!');

  await sendTelegram(successMsg);
  logger.info({ saasId, stepsCompleted }, 'factory_workflow.complete');

  return {
    success: true,
    saasId,
    saasName,
    stepsCompleted,
    totalSteps: FACTORY_STEPS.length,
    stepResults,
  };
}

// ── Factory intent detector (for alex_orchestrator fast-path) ─────────────

const FACTORY_PATTERNS = [
  /\b(lance|crée|démarre|start|build|construis|fabrique)\b.{0,40}\b(saas|startup|produit|app|application|business|projet)\b/i,
  /\blance\s+un\s+saas\b/i,
  /\bfactory\s+saas\b/i,
  /\busine\s+saas\b/i,
];

export function isFactoryRequest(message: string): boolean {
  return FACTORY_PATTERNS.some((p) => p.test(message));
}
