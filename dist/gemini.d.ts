/**
 * Generate text content via Gemini.
 * Defaults to gemini-2.5-flash. Google's free tier on 2.0 models was retired
 * in 2026; 2.5-flash is the current flash-tier default with the same API shape.
 */
export declare function generateContent(prompt: string, model?: string): Promise<string>;
/**
 * Parse a JSON response from Gemini, with fallback on malformed output.
 * Returns null if parsing fails.
 */
export declare function parseJsonResponse<T>(text: string): T | null;
//# sourceMappingURL=gemini.d.ts.map