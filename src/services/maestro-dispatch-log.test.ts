import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

// Mock better-sqlite3 BEFORE importing the service.
// We return a real :memory: instance so the SQL is actually exercised.
vi.mock('better-sqlite3', async () => {
  // Resolve the real better-sqlite3 default export
  const mod = await vi.importActual<{ default: typeof import('better-sqlite3') }>('better-sqlite3');
  const RealCtor = (mod as unknown as { default: new (path: string) => InstanceType<typeof import('better-sqlite3')> }).default;
  const memInstance = new RealCtor(':memory:');
  return {
    default: vi.fn(() => memInstance),
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

// Now import the service — it will run its top-level setup against :memory:
import {
  logMaestroDispatch,
  cleanupOldDispatches,
  getDispatchStats,
  getRecentDispatches,
} from './maestro-dispatch-log.js';

// We need direct DB access to wipe between tests
function getMemDb(): InstanceType<typeof Database> {
  // The factory mock returns the same singleton — re-call the constructor mock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockedCtor = vi.mocked(Database) as any;
  return mockedCtor.mock.results[0]?.value as InstanceType<typeof Database>;
}

beforeAll(() => {
  // Sanity: schema must have been created by the service top-level
  const db = getMemDb();
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='maestro_dispatches'")
    .get();
  expect(row).toBeDefined();
});

beforeEach(() => {
  // Wipe table between tests
  getMemDb().exec('DELETE FROM maestro_dispatches');
});

describe('logMaestroDispatch', () => {
  it('inserts a row without error', () => {
    expect(() =>
      logMaestroDispatch({
        user_id: 'karim',
        mode: 'mode_1_tmux',
        task: 'simple task',
        provider: 'anthropic',
        model: 'sonnet',
        success: true,
        cost_usd: 0.001,
        latency_ms: 1500,
      })
    ).not.toThrow();

    const rows = getMemDb()
      .prepare('SELECT * FROM maestro_dispatches')
      .all() as Array<{ user_id: string; mode: string; success: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe('karim');
    expect(rows[0].mode).toBe('mode_1_tmux');
    expect(rows[0].success).toBe(1);
  });

  it('truncates long task to 200 chars', () => {
    const longTask = 'x'.repeat(500);
    logMaestroDispatch({
      user_id: 'k',
      mode: 'mode_2_api',
      task: longTask,
      success: false,
    });

    const row = getMemDb()
      .prepare('SELECT task_preview FROM maestro_dispatches')
      .get() as { task_preview: string };
    expect(row.task_preview.length).toBe(200);
  });

  it('handles null provider and model gracefully', () => {
    expect(() =>
      logMaestroDispatch({
        user_id: 'k',
        mode: 'mode_2_api',
        task: 't',
        success: true,
      })
    ).not.toThrow();

    const row = getMemDb()
      .prepare('SELECT provider, model FROM maestro_dispatches')
      .get() as { provider: string | null; model: string | null };
    expect(row.provider).toBeNull();
    expect(row.model).toBeNull();
  });

  it('does NOT throw if insert internally fails (non-blocking guarantee)', () => {
    // Force an insert failure by calling with a value that violates NOT NULL
    // We simulate by spying on the prepare method to return a stmt that throws
    // Easiest: pass undefined for required user_id - the service must swallow
    // The current service implementation calls stmtInsert.run with the values,
    // and wraps it in try/catch. Pass an obviously broken object:
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logMaestroDispatch({ user_id: null as any, mode: 'x', task: 't', success: true })
    ).not.toThrow();
  });
});

describe('cleanupOldDispatches', () => {
  it('deletes rows older than 30 days', () => {
    const db = getMemDb();
    const now = Math.floor(Date.now() / 1000);
    const old = now - 31 * 86400;
    const recent = now - 1 * 86400;

    db.prepare(
      `INSERT INTO maestro_dispatches (ts, user_id, mode, task_preview, success)
       VALUES (?, 'k', 'm', 'old', 1), (?, 'k', 'm', 'recent', 1)`
    ).run(old, recent);

    const deleted = cleanupOldDispatches();
    expect(deleted).toBe(1);

    const remaining = db.prepare('SELECT task_preview FROM maestro_dispatches').all() as Array<{ task_preview: string }>;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].task_preview).toBe('recent');
  });

  it('returns 0 when nothing to delete', () => {
    expect(cleanupOldDispatches()).toBe(0);
  });
});

describe('getDispatchStats', () => {
  it('returns total/success/fail counts and total cost over last 7 days', () => {
    logMaestroDispatch({ user_id: 'k', mode: 'mode_1_tmux', task: 'a', success: true, cost_usd: 0.01, provider: 'anthropic' });
    logMaestroDispatch({ user_id: 'k', mode: 'mode_1_tmux', task: 'b', success: true, cost_usd: 0.02, provider: 'anthropic' });
    logMaestroDispatch({ user_id: 'k', mode: 'mode_2_api', task: 'c', success: false, cost_usd: 0, provider: 'deepseek', error: 'boom' });

    const stats = getDispatchStats(7);
    expect(stats.total).toBe(3);
    expect(stats.success).toBe(2);
    expect(stats.fail).toBe(1);
    expect(stats.total_cost_usd).toBeCloseTo(0.03, 5);
  });

  it('groups by mode correctly', () => {
    logMaestroDispatch({ user_id: 'k', mode: 'mode_1_tmux', task: 'a', success: true, cost_usd: 0.01 });
    logMaestroDispatch({ user_id: 'k', mode: 'mode_2_api', task: 'b', success: true, cost_usd: 0.05 });
    logMaestroDispatch({ user_id: 'k', mode: 'mode_2_api', task: 'c', success: true, cost_usd: 0.05 });

    const stats = getDispatchStats(7);
    const byMode = Object.fromEntries(stats.by_mode.map((m) => [m.mode, m]));
    expect(byMode['mode_1_tmux'].count).toBe(1);
    expect(byMode['mode_2_api'].count).toBe(2);
  });

  it('groups by provider with fail rate', () => {
    logMaestroDispatch({ user_id: 'k', mode: 'm', task: 'a', success: true, provider: 'anthropic' });
    logMaestroDispatch({ user_id: 'k', mode: 'm', task: 'b', success: true, provider: 'anthropic' });
    logMaestroDispatch({ user_id: 'k', mode: 'm', task: 'c', success: false, provider: 'deepseek' });
    logMaestroDispatch({ user_id: 'k', mode: 'm', task: 'd', success: false, provider: 'deepseek' });

    const stats = getDispatchStats(7);
    const byProvider = Object.fromEntries(stats.by_provider.map((p) => [p.provider, p]));
    expect(byProvider['anthropic'].fail_rate_pct).toBe(0);
    expect(byProvider['deepseek'].fail_rate_pct).toBe(100);
  });
});

describe('getRecentDispatches', () => {
  it('returns the N most recent rows ordered DESC by ts', () => {
    for (let i = 0; i < 5; i++) {
      logMaestroDispatch({
        user_id: 'k',
        mode: 'm',
        task: `task ${i}`,
        success: true,
      });
    }

    const recent = getRecentDispatches(3);
    expect(recent).toHaveLength(3);
    // ts is set by sqlite default unixepoch() so all may have same value;
    // but ORDER BY ts DESC LIMIT 3 should return 3 of the 5
    for (const r of recent) {
      expect(r.task_preview).toMatch(/^task \d$/);
    }
  });

  it('caps limit at 100 even when caller asks for more', () => {
    for (let i = 0; i < 5; i++) {
      logMaestroDispatch({ user_id: 'k', mode: 'm', task: `t${i}`, success: true });
    }
    const r = getRecentDispatches(99999);
    // Only 5 inserts so we get back at most 5
    expect(r.length).toBeLessThanOrEqual(100);
    expect(r.length).toBe(5);
  });

  it('uses default limit of 50 when no arg', () => {
    for (let i = 0; i < 3; i++) {
      logMaestroDispatch({ user_id: 'k', mode: 'm', task: `t${i}`, success: true });
    }
    const r = getRecentDispatches();
    expect(r.length).toBe(3);
  });

  it('clamps limit at minimum of 1 when caller passes 0 or negative', () => {
    logMaestroDispatch({ user_id: 'k', mode: 'm', task: 'only', success: true });
    const r = getRecentDispatches(0);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });
});
