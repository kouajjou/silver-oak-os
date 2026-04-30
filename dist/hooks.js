import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
const HOOK_POINTS = [
    'preMessage',
    'postMessage',
    'onSessionStart',
    'onSessionEnd',
    'onError',
];
const HOOK_TIMEOUT_MS = 5000;
// ── Public API ──────────────────────────────────────────────────────
/**
 * Create an empty hook registry with all hook point arrays initialized.
 */
export function createHookRegistry() {
    return {
        preMessage: [],
        postMessage: [],
        onSessionStart: [],
        onSessionEnd: [],
        onError: [],
    };
}
/**
 * Scan a directory for .js and .ts hook files.
 * Each file should default-export or named-export functions matching hook points
 * (preMessage, postMessage, onSessionStart, onSessionEnd, onError).
 *
 * Files are loaded in alphabetical order.
 */
export async function loadHooksFromDir(dir, registry) {
    if (!fs.existsSync(dir)) {
        logger.debug({ dir }, 'Hooks directory does not exist, skipping');
        return;
    }
    let entries;
    try {
        entries = fs.readdirSync(dir)
            .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))
            .sort();
    }
    catch {
        logger.warn({ dir }, 'Could not read hooks directory');
        return;
    }
    for (const filename of entries) {
        const filePath = path.join(dir, filename);
        try {
            const mod = await import(filePath);
            for (const hookPoint of HOOK_POINTS) {
                if (typeof mod[hookPoint] === 'function') {
                    registry[hookPoint].push(mod[hookPoint]);
                    logger.debug({ filename, hookPoint }, 'Registered hook');
                }
            }
        }
        catch (err) {
            logger.warn({ filename, error: err instanceof Error ? err.message : String(err) }, 'Failed to load hook file');
        }
    }
}
/**
 * Run an array of hook functions sequentially in order.
 * Each hook has a 5 second timeout. Failed or timed-out hooks log a
 * warning but do not block execution of subsequent hooks.
 */
export async function runHooks(hooks, ctx) {
    for (const hook of hooks) {
        try {
            await withTimeout(hook(ctx), HOOK_TIMEOUT_MS);
        }
        catch (err) {
            logger.warn({ error: err instanceof Error ? err.message : String(err) }, 'Hook failed, continuing');
        }
    }
}
// ── Internal helpers ────────────────────────────────────────────────
function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Hook timed out after ${ms}ms`));
        }, ms);
        promise
            .then((val) => {
            clearTimeout(timer);
            resolve(val);
        })
            .catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
//# sourceMappingURL=hooks.js.map