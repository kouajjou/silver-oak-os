interface TokenCheckResult {
    name: string;
    valid: boolean;
    error?: string;
    response_ms: number;
}
/**
 * Lance la validation de tous les tokens. Non-bloquant.
 * Doit etre appelee une fois au boot par index.ts.
 */
export declare function validateAllTokens(): Promise<TokenCheckResult[]>;
/**
 * Lecture du dernier statut depuis SQLite (pour API dashboard).
 */
export declare function getTokenStatuses(): Array<{
    name: string;
    valid: boolean;
    last_check_ts: number;
    error_msg: string | null;
    response_ms: number;
}>;
export {};
//# sourceMappingURL=token-validator.d.ts.map