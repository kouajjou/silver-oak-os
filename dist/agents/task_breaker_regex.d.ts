/**
 * task_breaker_regex — Zero-cost multi-task pattern detector
 *
 * Detects numbered lists like "1) ... 2) ... 3) ..." and splits them
 * into BrokenDownTask items. No LLM cost — pure regex.
 */
import type { BrokenDownTask } from './task_breaker.js';
/**
 * Detect multi-task numbered list in a message.
 * Returns an array of BrokenDownTask if ≥2 numbered items found, else null.
 */
export declare function detectMultiTaskPattern(message: string): BrokenDownTask[] | null;
//# sourceMappingURL=task_breaker_regex.d.ts.map