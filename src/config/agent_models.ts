/**
 * Agent to Claude Model mapping
 * Fix #2 V2 — All agents use SDK Claude Code Pro Max (/bin/bash forfait Karim)
 *
 * IMPORTANT: Never use @anthropic-ai/sdk (Anthropic API = PAYANT).
 * Always use @anthropic-ai/claude-agent-sdk (Pro Max OAuth forfait = /bin/bash).
 */

export type AgentName = 'alex' | 'sara' | 'leo' | 'marco' | 'nina' | 'maestro';
export type ClaudeModel = 'claude-haiku-4-5' | 'claude-sonnet-4-5' | 'claude-opus-4-5';

export const AGENT_MODELS: Record<AgentName, ClaudeModel> = {
  alex: 'claude-sonnet-4-5',    // Chief of Staff — intelligent routing
  sara: 'claude-haiku-4-5',     // Emails Gmail — simple tasks
  leo: 'claude-haiku-4-5',      // YouTube/LinkedIn — simple tasks
  marco: 'claude-haiku-4-5',    // Agenda/finance/ops — simple tasks
  nina: 'claude-haiku-4-5',     // Research/veille — simple tasks
  maestro: 'claude-sonnet-4-5', // Dev senior PhD — code/architecture
};

export function getModelForAgent(agent: AgentName): ClaudeModel {
  return AGENT_MODELS[agent] ?? 'claude-haiku-4-5';
}

// Opus = reserved for CRITICAL tasks only, on explicit request
export function getCriticalModel(): ClaudeModel {
  return 'claude-opus-4-5';
}
