export interface ObsidianConfig {
    vault: string;
    folders: string[];
    readOnly?: string[];
}
export declare function buildObsidianContext(config: ObsidianConfig | undefined): string;
/** Reset cache (for testing). */
export declare function _resetObsidianCache(): void;
//# sourceMappingURL=obsidian.d.ts.map