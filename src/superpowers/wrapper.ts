/**
 * SuperPowers Wrapper — Sprint 2 V2 Phase 1
 * Wraps callLLM with SuperPowers: slash commands, tool registry, subagent metadata.
 * Phase 1: slash injection + tool listing. Tool execution loop = Phase 2.
 */

import { callLLM } from '../adapters/llm/index.js';
import type { SuperPowersRequest, SuperPowersResponse } from './types.js';
import { TOOL_REGISTRY } from './tool-executor.js';
import { resolveSlashCommand } from './slash-resolver.js';
import { logger } from '../logger.js';

/**
 * Call an LLM with SuperPowers enrichment.
 * - Slash commands inject system prompt prefixes (ultrathink, riper, fix-bug, security-audit)
 * - Requested tools are validated against TOOL_REGISTRY
 * - Phase 2 will add actual tool execution loop (function calling)
 */
export async function callWithSuperPowers(request: SuperPowersRequest): Promise<SuperPowersResponse> {
  const slashPrefix = resolveSlashCommand(request.slash_command);

  // Validate requested tools exist in registry
  const requestedTools = request.tools ?? [];
  const unknownTools = requestedTools.filter(t => !(t in TOOL_REGISTRY));
  if (unknownTools.length > 0) {
    logger.warn({ unknown: unknownTools, available: Object.keys(TOOL_REGISTRY) }, 'superpowers.unknown_tools');
  }
  const activeToolNames = requestedTools.filter(t => t in TOOL_REGISTRY);

  // Build enriched system message
  const existingSystem = request.messages.find(m => m.role === 'system')?.content ?? '';
  const enrichedParts = [slashPrefix, existingSystem].filter(Boolean);
  const enrichedSystem = enrichedParts.join('\n\n');

  const messages = [
    ...(enrichedSystem ? [{ role: 'system' as const, content: enrichedSystem }] : []),
    ...request.messages.filter(m => m.role !== 'system'),
  ];

  logger.info(
    {
      provider: request.provider,
      slash: request.slash_command ?? 'none',
      tools: activeToolNames,
      subagent: request.subagent ?? 'none',
    },
    'superpowers.call.start',
  );

  const llmResp = await callLLM({ ...request, messages });

  const superpowersActive: string[] = [
    ...(request.slash_command ? [`slash:${request.slash_command}`] : []),
    ...activeToolNames.map(t => `tool:${t}`),
    ...(request.subagent ? [`subagent:${request.subagent}`] : []),
  ];

  logger.info({ cost: llmResp.cost_usd, active: superpowersActive }, 'superpowers.call.done');

  return {
    ...llmResp,
    tool_calls_executed: [],  // Phase 2: will be populated during tool execution loop
    iterations: 1,
    superpowers_active: superpowersActive,
  };
}

export default callWithSuperPowers;
