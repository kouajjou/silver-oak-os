/**
 * Maestro Dispatcher — Sprint 2 Pipeline V1
 * Mode 1 : CLI tmux via MCP Bridge (forfait Pro Max, $0 marginal)
 * Mode 2 : API DeepSeek/Gemini directe (fallback ou override — archived: était Anthropic)
 *
 * Sélection du mode :
 *   - task.mode === 'mode_1_tmux'      → toujours Mode 1
 *   - USE_MAESTRO_PRO_MAX=true (env)   → Mode 1 par défaut
 *   - sinon                            → Mode 2 (API DeepSeek — archived: était Anthropic)
 */
import type { LLMProvider } from '../adapters/llm/types.js';
export type { LLMProvider };
export type MaestroMode = 'mode_1_tmux' | 'mode_2_api';
export interface MaestroTask {
    task_description: string;
    user_id: string;
    preferred_provider?: LLMProvider;
    max_tokens?: number;
    mode?: MaestroMode;
}
export interface MaestroResult {
    success: boolean;
    result: string;
    provider_used: LLMProvider | null;
    cost_usd: number;
    latency_ms: number;
    error?: string;
    mode_used?: MaestroMode;
}
export declare function dispatchToMaestro(task: MaestroTask): Promise<MaestroResult>;
export default dispatchToMaestro;
//# sourceMappingURL=maestro_dispatcher.d.ts.map