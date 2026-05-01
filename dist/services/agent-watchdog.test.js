import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mocks BEFORE module under test imports
vi.mock('child_process', () => ({
    execSync: vi.fn(),
}));
vi.mock('os', async () => {
    const actual = await vi.importActual('os');
    return {
        ...actual,
        default: { ...actual, platform: vi.fn(() => 'linux') },
        platform: vi.fn(() => 'linux'),
    };
});
vi.mock('../logger.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));
vi.mock('../config.js', () => ({
    TELEGRAM_BOT_TOKEN: 'fake-token-for-tests-1234567890',
    ALLOWED_CHAT_ID: '5566541774',
}));
import { execSync } from 'child_process';
import os from 'os';
import { startAgentWatchdog, stopAgentWatchdog, getWatchdogStats } from './agent-watchdog.js';
const mockedExecSync = vi.mocked(execSync);
const mockedPlatform = vi.mocked(os.platform);
// Mock global fetch (Telegram alert)
const mockedFetch = vi.fn();
beforeEach(() => {
    mockedExecSync.mockReset();
    mockedPlatform.mockReturnValue('linux');
    mockedFetch.mockReset();
    mockedFetch.mockResolvedValue({ ok: true });
    global.fetch = mockedFetch;
    // Ensure a fresh state
    stopAgentWatchdog();
});
afterEach(() => {
    stopAgentWatchdog();
    vi.useRealTimers();
});
// Helpers
function mockSystemctlState(agentId, opts) {
    const active = opts.active ?? true;
    const loaded = opts.loaded ?? true;
    return [
        `ActiveState=${active ? 'active' : 'inactive'}`,
        `SubState=${active ? 'running' : 'dead'}`,
        `LoadState=${loaded ? 'loaded' : 'not-found'}`,
        `NRestarts=${opts.nRestarts ?? 0}`,
    ].join('\n');
}
describe('startAgentWatchdog / stopAgentWatchdog', () => {
    it('skips silently on non-linux platforms', () => {
        mockedPlatform.mockReturnValue('darwin');
        startAgentWatchdog();
        // execSync should not have been called for systemctl since we skipped
        const calls = mockedExecSync.mock.calls.filter((c) => String(c[0]).includes('systemctl'));
        expect(calls.length).toBe(0);
    });
    it('starts the interval on linux without throwing', () => {
        expect(() => startAgentWatchdog()).not.toThrow();
    });
    it('warns and is idempotent if started twice', () => {
        startAgentWatchdog();
        expect(() => startAgentWatchdog()).not.toThrow();
    });
    it('stop is safe to call when not started', () => {
        expect(() => stopAgentWatchdog()).not.toThrow();
    });
    it('stop clears the interval cleanly', () => {
        startAgentWatchdog();
        expect(() => stopAgentWatchdog()).not.toThrow();
    });
});
describe('getWatchdogStats', () => {
    it('returns initial stats with shape { monitored_agents, histories }', () => {
        const stats = getWatchdogStats();
        expect(stats).toHaveProperty('monitored_agents');
        expect(stats).toHaveProperty('histories');
        expect(Array.isArray(stats.histories)).toBe(true);
    });
    it('monitored_agents is a non-negative number', () => {
        const stats = getWatchdogStats();
        expect(stats.monitored_agents).toBeGreaterThanOrEqual(0);
    });
});
describe('crash loop detection (via timer simulation)', () => {
    it('detects crash loop after threshold restarts in window and triggers Telegram alert', async () => {
        vi.useFakeTimers();
        // Unique agent_id to avoid Map pollution between tests
        const agentId = 'sara_crash_t1';
        let nRestarts = 0;
        mockedExecSync.mockImplementation((cmd) => {
            const cmdStr = String(cmd);
            if (cmdStr.includes('list-units')) {
                return `com.claudeclaw.agent-${agentId}.service loaded active running\n`;
            }
            if (cmdStr.includes('show')) {
                const state = mockSystemctlState(agentId, { active: true, nRestarts });
                nRestarts += 5; // big jump per tick to ensure delta >= 3 quickly
                return state;
            }
            // stop / disable
            return '';
        });
        startAgentWatchdog();
        // Tick repeatedly and flush microtasks each time
        for (let i = 0; i < 5; i++) {
            await vi.advanceTimersByTimeAsync(60_000);
            // Flush pending promises (sendCrashAlert is fire-and-forget async)
            await Promise.resolve();
            await Promise.resolve();
        }
        // Telegram alert should have fired
        const telegramCalls = mockedFetch.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('telegram.org'));
        expect(telegramCalls.length).toBeGreaterThanOrEqual(1);
        const body = JSON.parse(telegramCalls[0][1].body);
        expect(body.text).toContain('CRASH LOOP');
        expect(body.text).toContain(agentId);
        const stopCalls = mockedExecSync.mock.calls.filter((c) => String(c[0]).includes('stop'));
        expect(stopCalls.length).toBeGreaterThanOrEqual(1);
    });
    it('does NOT trigger alert when restarts are stable', async () => {
        vi.useFakeTimers();
        mockedExecSync.mockImplementation((cmd) => {
            const cmdStr = String(cmd);
            if (cmdStr.includes('list-units')) {
                return 'com.claudeclaw.agent-leo.service loaded active running\n';
            }
            if (cmdStr.includes('show')) {
                // NRestarts stays at 1 forever
                return mockSystemctlState('leo', { active: true, nRestarts: 1 });
            }
            return '';
        });
        startAgentWatchdog();
        await vi.advanceTimersByTimeAsync(60_000);
        await vi.advanceTimersByTimeAsync(60_000);
        await vi.advanceTimersByTimeAsync(60_000);
        const telegramCalls = mockedFetch.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('telegram.org'));
        expect(telegramCalls.length).toBe(0);
    });
    it('skips silently if systemctl returns "LoadState=not-found" (agent not loaded)', async () => {
        vi.useFakeTimers();
        mockedExecSync.mockImplementation((cmd) => {
            const cmdStr = String(cmd);
            if (cmdStr.includes('list-units')) {
                return 'com.claudeclaw.agent-ghost.service loaded active running\n';
            }
            if (cmdStr.includes('show')) {
                return mockSystemctlState('ghost', { loaded: false });
            }
            return '';
        });
        startAgentWatchdog();
        await vi.advanceTimersByTimeAsync(60_000);
        // No Telegram, no stop
        const tgCalls = mockedFetch.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('telegram.org'));
        expect(tgCalls.length).toBe(0);
    });
});
//# sourceMappingURL=agent-watchdog.test.js.map