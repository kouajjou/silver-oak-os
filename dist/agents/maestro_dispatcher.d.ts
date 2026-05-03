/**
 * Maestro Dispatcher — Sprint 2 Pipeline V1
 *
 * SOP V26 PROPER DISPATCH — 2 mai 2026 (v1.2 + cascade fallback)
 *
 * Mode 1 : CLI tmux via MCP Bridge (forfait Pro Max, $0 marginal)
 *   → 4 sessions Sonnet : claude-code, claude-backend, claude-frontend, opus (urgences only)
 *   → Routage automatique selon type de tâche
 *
 * Mode 2 : API LLM directe (5 providers concurrents, Anthropic banni R1)
 *   → DeepSeek → Gemini → Grok → OpenAI → Mistral (CASCADE FALLBACK AUTO)
 *   → Si TOUS échouent crédit/quota : fallback ULTIME Mode 1 tmux gratuit
 *
 * Mode 3 : Frontend Testing — claude-browser (Playwright + axe + Lighthouse)
 *   → Session tmux 'claude-browser' dédiée tests UI comme un humain
 *   → Cible : pages Next.js, dashboards, War Room, agents UI
 *   → Détection auto via keywords (test UI, screenshot, audit a11y, browse, etc.)
 *
 * SOP V26 Rules respected:
 *   R1 : Opus banni hardcodé — chooseSession() ne route à opus QUE si tâche critique
 *        ET USINE_OPUS_ALLOWED=true
 *   R47: Tier routing — Sonnet 4.6 (Mode 1) pour code, DeepSeek/Gemini (Mode 2) pour bash/audit
 *   R78: Cuisinier 1700€/h n'épluche pas — Maestro orchestre, workers exécutent
 *   R-cascade (NEW 2 mai 2026) : Plus jamais d'arrêt pour cause de crédit/quota
 */
import type { LLMProvider } from '../adapters/llm/types.js';
import type { TmuxSession } from '../services/cli_tmux_dispatcher.js';
export type { LLMProvider };
export type MaestroMode = 'mode_1_tmux' | 'mode_2_api' | 'mode_3_browser';
export interface MaestroTask {
    task_description: string;
    user_id: string;
    preferred_provider?: LLMProvider;
    preferred_session?: TmuxSession;
    max_tokens?: number;
    mode?: MaestroMode;
    is_critical?: boolean;
}
export interface MaestroResult {
    success: boolean;
    result: string;
    provider_used: LLMProvider | null;
    session_used?: TmuxSession;
    cost_usd: number;
    latency_ms: number;
    error?: string;
    mode_used?: MaestroMode;
}
/**
 * Choisit la session tmux Mode 1 selon le contenu de la tâche.
 * Précédence (haut → bas) :
 *   1. preferred_session si fourni explicitement
 *   2. opus si is_critical=true ET USINE_OPUS_ALLOWED=true (R1)
 *   3. Architecture / review → claude-code
 *   4. Frontend (UI/React/Next) → claude-frontend
 *   5. Backend (API/migration/workflow) → claude-backend
 *   6. Fallback → claude-code (orchestration générique)
 */
export declare function chooseSession(task: string, hints?: {
    preferred_session?: TmuxSession;
    is_critical?: boolean;
}): TmuxSession;
export declare function dispatchToMaestro(task: MaestroTask): Promise<MaestroResult>;
export default dispatchToMaestro;
//# sourceMappingURL=maestro_dispatcher.d.ts.map