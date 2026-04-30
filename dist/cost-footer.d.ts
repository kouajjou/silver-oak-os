import type { CostFooterMode } from './config.js';
import type { UsageInfo } from './agent.js';
/**
 * Build a cost footer string to append to Telegram responses.
 * Returns empty string if mode is 'off' or no usage data.
 *
 * Modes:
 *   'compact' - model name only (good for subscription users)
 *   'verbose' - model + token counts
 *   'cost'    - model + cost (for pay-per-use users)
 *   'full'    - model + tokens + cost
 *   'off'     - nothing
 */
export declare function buildCostFooter(mode: CostFooterMode, usage: UsageInfo | null, model?: string): string;
//# sourceMappingURL=cost-footer.d.ts.map