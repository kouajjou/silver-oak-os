/**
 * Slash Command Resolver — Sprint 2 V2 Phase 1
 * Maps slash commands to system prompt prefixes injected before LLM call.
 */

import type { SlashCommand } from './types.js';

const SLASH_PROMPTS: Record<SlashCommand, string> = {
  ultrathink:
    'Take your time. Think step by step. Reason deeply about edge cases, failure modes, and side effects before responding. Use extended thinking.',
  riper:
    'Apply RIPER pattern: Research (read existing code first), Implement (minimum change), Plan (list steps), Execute (write code), Review (test + tsc). Document each phase explicitly.',
  'fix-bug':
    'Apply 6-step bug fix: 1) Reproduce the bug, 2) Isolate the root cause, 3) Form hypothesis, 4) Apply minimal fix, 5) Test (tsc + curl), 6) Verify no regression in related paths.',
  'security-audit':
    'Apply OWASP Top 10 security review: check for SQL injection, XSS, CSRF, secrets exposure, broken auth, insecure deserialization, RLS gaps, vulnerable dependencies.',
};

/**
 * Return the system prompt prefix for a slash command, or empty string if none.
 */
export function resolveSlashCommand(slash: SlashCommand | undefined): string {
  if (!slash) return '';
  return SLASH_PROMPTS[slash] ?? '';
}

export default resolveSlashCommand;
