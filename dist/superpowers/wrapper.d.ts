/**
 * SuperPowers Wrapper — Sprint 2 V2 Phase 1
 * Wraps callLLM with SuperPowers: slash commands, tool registry, subagent metadata.
 * Phase 1: slash injection + tool listing. Tool execution loop = Phase 2.
 */
import type { SuperPowersRequest, SuperPowersResponse } from './types.js';
/**
 * Call an LLM with SuperPowers enrichment.
 * - Slash commands inject system prompt prefixes (ultrathink, riper, fix-bug, security-audit)
 * - Requested tools are validated against TOOL_REGISTRY
 * - Phase 2 will add actual tool execution loop (function calling)
 */
export declare function callWithSuperPowers(request: SuperPowersRequest): Promise<SuperPowersResponse>;
export default callWithSuperPowers;
//# sourceMappingURL=wrapper.d.ts.map