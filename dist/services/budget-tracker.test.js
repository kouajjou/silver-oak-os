import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
// Mock better-sqlite3 with a real :memory: instance shared across the test suite.
vi.mock('better-sqlite3', async () => {
    const mod = await vi.importActual('better-sqlite3');
    const RealCtor = mod.default;
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
import { trackCost, getAgentDailyTotal, getAgentMonthlyTotal, setAgentBudget, checkBudgetStatus, getAllAgentsCosts, cleanupBudgetArtefacts, startBudgetCleanupCron, stopBudgetCleanupCron, } from './budget-tracker.js';
// Direct DB access to wipe between tests
function getMemDb() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedCtor = vi.mocked(Database);
    return mockedCtor.mock.results[0]?.value;
}
beforeAll(() => {
    const db = getMemDb();
    const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_costs'").get();
    expect(t).toBeDefined();
});
beforeEach(() => {
    const db = getMemDb();
    db.exec('DELETE FROM agent_costs');
    db.exec('DELETE FROM agent_budgets');
});
afterAll(() => {
    stopBudgetCleanupCron();
});
const baseEntry = { cost_usd: 0.001, tokens_in: 100, tokens_out: 50, model: 'sonnet' };
// ------------------------------------------------------------------
// trackCost — agent_id validation
// ------------------------------------------------------------------
describe('trackCost — agent_id validation', () => {
    it('accepts canonical agent ids: main/comms/content/maestro/ops/research', () => {
        for (const id of ['main', 'comms', 'content', 'maestro', 'ops', 'research']) {
            trackCost({ ...baseEntry, agent_id: id });
        }
        const rows = getMemDb().prepare('SELECT COUNT(*) as c FROM agent_costs').get();
        expect(rows.c).toBe(6);
    });
    it('accepts internal service ids: intent_classifier, llm_judge_gemini, memory', () => {
        for (const id of ['intent_classifier', 'llm_judge_gemini', 'memory']) {
            trackCost({ ...baseEntry, agent_id: id });
        }
        const rows = getMemDb().prepare('SELECT COUNT(*) as c FROM agent_costs').get();
        expect(rows.c).toBe(3);
    });
    it('accepts multi-tenant aliases <agent>_<userId>', () => {
        trackCost({ ...baseEntry, agent_id: 'alex_karim' });
        trackCost({ ...baseEntry, agent_id: 'sara_user-42' });
        trackCost({ ...baseEntry, agent_id: 'maestro_acme-corp' });
        const rows = getMemDb().prepare('SELECT COUNT(*) as c FROM agent_costs').get();
        expect(rows.c).toBe(3);
    });
    it('rejects empty / missing / non-string agent_id without inserting', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trackCost({ ...baseEntry, agent_id: '' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trackCost({ ...baseEntry, agent_id: null });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trackCost({ ...baseEntry, agent_id: 42 });
        const rows = getMemDb().prepare('SELECT COUNT(*) as c FROM agent_costs').get();
        expect(rows.c).toBe(0);
    });
    it('rejects agent_id longer than 50 characters', () => {
        trackCost({ ...baseEntry, agent_id: 'a'.repeat(51) });
        const rows = getMemDb().prepare('SELECT COUNT(*) as c FROM agent_costs').get();
        expect(rows.c).toBe(0);
    });
    it('rejects blocked dev/test artefact patterns', () => {
        const blocked = [
            'test-fix',
            'test-leo',
            'phd-audit',
            'phd-deep-research',
            'task_breaker_test-something',
            'maestro_test-foo',
            'maestro_factory-bar',
            'maestro_fix-baz',
            'alex_test-qux',
        ];
        for (const id of blocked)
            trackCost({ ...baseEntry, agent_id: id });
        const rows = getMemDb().prepare('SELECT COUNT(*) as c FROM agent_costs').get();
        expect(rows.c).toBe(0);
    });
    it('rejects unknown agent ids that match no whitelist pattern', () => {
        const unknowns = ['random_id', 'nina', 'alex', 'foo_bar', 'unknown'];
        for (const id of unknowns)
            trackCost({ ...baseEntry, agent_id: id });
        const rows = getMemDb().prepare('SELECT COUNT(*) as c FROM agent_costs').get();
        expect(rows.c).toBe(0);
    });
});
// ------------------------------------------------------------------
// Daily / monthly totals
// ------------------------------------------------------------------
describe('getAgentDailyTotal / getAgentMonthlyTotal', () => {
    it('returns 0 for an agent with no cost history', () => {
        expect(getAgentDailyTotal('main')).toBe(0);
        expect(getAgentMonthlyTotal('main')).toBe(0);
    });
    it("sums today's costs for the given agent", () => {
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 0.10 });
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 0.05 });
        trackCost({ ...baseEntry, agent_id: 'comms', cost_usd: 0.20 });
        expect(getAgentDailyTotal('main')).toBeCloseTo(0.15, 5);
        expect(getAgentDailyTotal('comms')).toBeCloseTo(0.20, 5);
    });
    it("monthly total includes today's spend", () => {
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 0.30 });
        expect(getAgentMonthlyTotal('main')).toBeCloseTo(0.30, 5);
    });
});
// ------------------------------------------------------------------
// Budgets
// ------------------------------------------------------------------
describe('setAgentBudget / checkBudgetStatus', () => {
    it('returns over_budget=false when no budget is set and no spend', () => {
        const status = checkBudgetStatus('main');
        expect(status.over_budget).toBe(false);
        expect(status.daily_used).toBe(0);
        expect(status.monthly_used).toBe(0);
    });
    it('flags over_budget=true when daily cap exceeded', () => {
        setAgentBudget('main', 1.0, 30.0);
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 1.50 });
        const status = checkBudgetStatus('main');
        expect(status.over_budget).toBe(true);
        expect(status.daily_cap).toBeCloseTo(1.0, 5);
        expect(status.daily_used).toBeCloseTo(1.50, 5);
    });
    it('flags over_budget=true when monthly cap exceeded', () => {
        setAgentBudget('main', 100.0, 1.0);
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 1.50 });
        const status = checkBudgetStatus('main');
        expect(status.over_budget).toBe(true);
        expect(status.monthly_cap).toBeCloseTo(1.0, 5);
    });
    it('over_budget=false when under both caps', () => {
        setAgentBudget('main', 5.0, 100.0);
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 1.50 });
        const status = checkBudgetStatus('main');
        expect(status.over_budget).toBe(false);
    });
    it('setAgentBudget overwrites previous values (upsert)', () => {
        setAgentBudget('main', 1.0, 10.0);
        setAgentBudget('main', 5.0, 50.0);
        const s = checkBudgetStatus('main');
        expect(s.daily_cap).toBeCloseTo(5.0, 5);
        expect(s.monthly_cap).toBeCloseTo(50.0, 5);
    });
    it('exposes daily_pct and monthly_pct correctly', () => {
        setAgentBudget('main', 10.0, 100.0);
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 2.5 });
        const s = checkBudgetStatus('main');
        expect(s.daily_pct).toBeCloseTo(25.0, 1);
        expect(s.monthly_pct).toBeCloseTo(2.5, 1);
    });
});
// ------------------------------------------------------------------
// getAllAgentsCosts
// ------------------------------------------------------------------
describe('getAllAgentsCosts', () => {
    it('returns one row per agent with daily and monthly totals', () => {
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 0.10 });
        trackCost({ ...baseEntry, agent_id: 'comms', cost_usd: 0.20 });
        trackCost({ ...baseEntry, agent_id: 'maestro', cost_usd: 0.05 });
        const all = getAllAgentsCosts();
        const byId = Object.fromEntries(all.map((a) => [a.agent_id, a]));
        expect(byId['main'].daily).toBeCloseTo(0.10, 5);
        expect(byId['comms'].daily).toBeCloseTo(0.20, 5);
        expect(byId['maestro'].daily).toBeCloseTo(0.05, 5);
    });
    it('returns empty array when no costs tracked', () => {
        expect(getAllAgentsCosts()).toEqual([]);
    });
});
// ------------------------------------------------------------------
// cleanupBudgetArtefacts
// ------------------------------------------------------------------
describe('cleanupBudgetArtefacts', () => {
    it('removes rows matching blocked dev patterns and reports counts + samples', () => {
        const db = getMemDb();
        // Bypass validation by inserting directly
        const stmt = db.prepare('INSERT INTO agent_costs (agent_id, cost_usd, tokens_in, tokens_out, model) VALUES (?, 0.01, 0, 0, ?)');
        stmt.run('test-fix', 'm');
        stmt.run('phd-audit', 'm');
        stmt.run('main', 'm');
        stmt.run('main', 'm');
        const result = cleanupBudgetArtefacts();
        expect(result.deleted).toBe(2);
        expect(result.samples.sort()).toEqual(['phd-audit', 'test-fix']);
        const remaining = db.prepare('SELECT agent_id FROM agent_costs ORDER BY agent_id').all();
        expect(remaining).toHaveLength(2);
        expect(remaining.every((r) => r.agent_id === 'main')).toBe(true);
    });
    it('reports 0 deletions and empty samples when there is nothing to clean', () => {
        trackCost({ ...baseEntry, agent_id: 'main', cost_usd: 0.01 });
        const result = cleanupBudgetArtefacts();
        expect(result.deleted).toBe(0);
        expect(result.samples).toEqual([]);
    });
});
// ------------------------------------------------------------------
// Cleanup cron lifecycle
// ------------------------------------------------------------------
describe('startBudgetCleanupCron / stopBudgetCleanupCron', () => {
    it('start + stop is idempotent and does not throw', () => {
        expect(() => startBudgetCleanupCron()).not.toThrow();
        expect(() => startBudgetCleanupCron()).not.toThrow();
        expect(() => stopBudgetCleanupCron()).not.toThrow();
        expect(() => stopBudgetCleanupCron()).not.toThrow();
    });
});
//# sourceMappingURL=budget-tracker.test.js.map