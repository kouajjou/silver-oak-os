/**
 * task_breaker_regex — Zero-cost multi-task pattern detector
 *
 * Detects numbered lists like "1) ... 2) ... 3) ..." and splits them
 * into BrokenDownTask items. No LLM cost — pure regex.
 */

import type { BrokenDownTask } from './task_breaker.js';

// Patterns for numbered items: "1.", "1)", "(1)", "Step 1:", etc.
const NUMBERED_ITEM_RE = /(?:^|\n)\s*(?:\d+[.):]|\(\d+\)|step\s+\d+:?)\s+(.+?)(?=(?:\n\s*(?:\d+[.):]|\(\d+\)|step\s+\d+:?)|\n\n|$))/gi;

/**
 * Detect multi-task numbered list in a message.
 * Returns an array of BrokenDownTask if ≥2 numbered items found, else null.
 */
export function detectMultiTaskPattern(message: string): BrokenDownTask[] | null {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  const re = new RegExp(NUMBERED_ITEM_RE.source, NUMBERED_ITEM_RE.flags);
  while ((match = re.exec(message)) !== null) {
    const task = match[1]?.trim();
    if (task && task.length > 3) {
      matches.push(task);
    }
  }

  if (matches.length < 2) return null;

  return matches.map((desc, i): BrokenDownTask => ({
    id: `task_${String(i + 1).padStart(3, '0')}`,
    title: desc.slice(0, 60),
    description: desc,
    type: 'unknown',
    agent_target: 'maestro',
    dependencies: i > 0 ? [`task_${String(i).padStart(3, '0')}`] : [],
    estimated_effort_min: 30,
    priority: 'P2',
    rationale: 'Detected from numbered list in user message (regex fast-path)',
  }));
}
