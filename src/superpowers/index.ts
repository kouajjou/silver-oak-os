/**
 * SuperPowers — public API
 */
export { callWithSuperPowers } from './wrapper.js';
export { TOOL_REGISTRY, bashExecTool, fileReadTool, fileWriteTool } from './tool-executor.js';
export { resolveSlashCommand } from './slash-resolver.js';
export type { SuperPowersRequest, SuperPowersResponse, ToolDefinition, ToolRegistry, SlashCommand, SubagentRole } from './types.js';
