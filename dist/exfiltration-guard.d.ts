/**
 * Exfiltration guard: scans outbound text for leaked secrets and credentials.
 *
 * Pure regex/string analysis with zero dependencies. Designed to catch
 * API keys, tokens, and other sensitive values before they leave the agent.
 */
export interface SecretMatch {
    type: string;
    position: number;
    length: number;
    preview: string;
}
/**
 * Scan text for leaked secrets and credentials.
 *
 * @param text         The text to scan
 * @param protectedValues  Optional array of sensitive env values to check
 *                         (raw plaintext, base64-encoded, and URL-encoded variants)
 * @returns Array of matches found, empty if clean
 */
export declare function scanForSecrets(text: string, protectedValues?: string[]): SecretMatch[];
/**
 * Replace each matched secret in the text with [REDACTED].
 *
 * Processes matches from end to start so positions remain valid.
 */
export declare function redactSecrets(text: string, matches: SecretMatch[]): string;
//# sourceMappingURL=exfiltration-guard.d.ts.map