/**
 * Message complexity classifier for smart model routing.
 *
 * Classifies incoming messages as 'simple' (can use a lighter/faster model)
 * or 'complex' (needs the full model). Pure string analysis, no dependencies.
 */
export declare function classifyMessageComplexity(message: string): 'simple' | 'complex';
//# sourceMappingURL=message-classifier.d.ts.map