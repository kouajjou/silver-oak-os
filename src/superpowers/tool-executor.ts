/**
 * Tool Executor — Sprint 2 V2 Phase 1
 * Three baseline tools: bash_exec (read-only whitelist), file_read, file_write.
 * All operations are sandboxed to SANDBOX_ROOT.
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ToolDefinition, ToolRegistry } from './types.js';
import { logger } from '../logger.js';

const exec = promisify(execCallback);

// Only read-only bash commands are allowed (no rm, no sed, no npm)
const ALLOWED_BASH_PREFIXES = ['ls', 'cat', 'grep', 'find', 'wc', 'echo', 'date', 'head', 'tail'];
const SANDBOX_ROOT = '/app/silver-oak-os';

// ── bash_exec ──────────────────────────────────────────────────────────────
export const bashExecTool: ToolDefinition = {
  name: 'bash_exec',
  description: 'Execute a safe read-only bash command inside the sandbox directory.',
  input_schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Bash command to execute (whitelist: ls, cat, grep, find, wc, echo, date, head, tail)' },
    },
    required: ['command'],
  },
  handler: async (input: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const cmd = (input['command'] as string).trim();
    const firstWord = cmd.split(' ')[0];

    if (!ALLOWED_BASH_PREFIXES.includes(firstWord)) {
      throw new Error(`bash_exec: "${firstWord}" not in whitelist. Allowed: ${ALLOWED_BASH_PREFIXES.join(', ')}`);
    }

    logger.info({ tool: 'bash_exec', command: cmd }, 'superpowers.tool');
    const { stdout, stderr } = await exec(cmd, { cwd: SANDBOX_ROOT, timeout: 10_000 });
    return {
      stdout: stdout.slice(0, 5_000),
      stderr: stderr.slice(0, 1_000),
    };
  },
};

// ── file_read ──────────────────────────────────────────────────────────────
export const fileReadTool: ToolDefinition = {
  name: 'file_read',
  description: 'Read a file from the sandbox. Returns content (truncated at 10K chars).',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative or absolute path inside sandbox' },
    },
    required: ['path'],
  },
  handler: async (input: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const inputPath = input['path'] as string;
    const fullPath = path.resolve(SANDBOX_ROOT, inputPath);
    if (!fullPath.startsWith(SANDBOX_ROOT)) {
      throw new Error('file_read: path escapes sandbox');
    }

    logger.info({ tool: 'file_read', path: inputPath }, 'superpowers.tool');
    const content = await fs.readFile(fullPath, 'utf-8');
    return { content: content.slice(0, 10_000), size: content.length };
  },
};

// ── file_write ─────────────────────────────────────────────────────────────
export const fileWriteTool: ToolDefinition = {
  name: 'file_write',
  description: 'Write content to a file in the sandbox. Always audited.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative or absolute path inside sandbox' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  },
  handler: async (input: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const inputPath = input['path'] as string;
    const content = input['content'] as string;
    const fullPath = path.resolve(SANDBOX_ROOT, inputPath);
    if (!fullPath.startsWith(SANDBOX_ROOT)) {
      throw new Error('file_write: path escapes sandbox');
    }

    logger.info({ tool: 'file_write', path: inputPath, size: content.length }, 'superpowers.tool');
    await fs.writeFile(fullPath, content, 'utf-8');
    return { ok: true, path: inputPath, size: content.length };
  },
};

// ── Registry ──────────────────────────────────────────────────────────────
export const TOOL_REGISTRY: ToolRegistry = {
  bash_exec: bashExecTool,
  file_read: fileReadTool,
  file_write: fileWriteTool,
};

export default TOOL_REGISTRY;
