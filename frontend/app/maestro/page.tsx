'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface DispatchStats {
  total: number;
  success: number;
  fail: number;
  total_cost_usd: number;
  by_mode: Array<{ mode: string; count: number; cost: number }>;
  by_provider: Array<{ provider: string | null; count: number; cost: number; fail_rate_pct: number }>;
}

interface DispatchRow {
  id: number;
  ts: number;
  user_id: string;
  mode: string;
  task_preview: string;
  provider: string | null;
  model: string | null;
  success: number;
}

interface TokenRow {
  name: string;
  valid: boolean;
  last_check_ts: number;
  error_msg: string | null;
  response_ms: number;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-so-card border border-so-border rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-so-muted">{label}</p>
      <p className="text-2xl font-semibold text-so-text mt-2">{value}</p>
      {hint && <p className="text-xs text-so-muted mt-1">{hint}</p>}
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`}
      aria-label={ok ? 'valid' : 'invalid'}
    />
  );
}

function formatTime(unixSec: number): string {
  if (!unixSec) return '—';
  const d = new Date(unixSec * 1000);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  return `$${usd.toFixed(4)}`;
}

export default function MaestroDashboard() {
  const [stats, setStats] = useState<DispatchStats | null>(null);
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [revalidateMsg, setRevalidateMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [s, d, t] = await Promise.all([
        fetch('/api/maestro/stats?days=7').then((r) => r.json()),
        fetch('/api/maestro/dispatches?limit=20').then((r) => r.json()),
        fetch('/api/maestro/tokens').then((r) => r.json()),
      ]);
      if (s.error) throw new Error(`stats: ${s.error}`);
      if (d.error) throw new Error(`dispatches: ${d.error}`);
      if (t.error) throw new Error(`tokens: ${t.error}`);
      setStats(s as DispatchStats);
      setDispatches((d.dispatches ?? []) as DispatchRow[]);
      setTokens((t.tokens ?? []) as TokenRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    const i = setInterval(() => { void loadAll(); }, 60_000);
    return () => clearInterval(i);
  }, [loadAll]);

  const handleRevalidate = useCallback(async () => {
    setRevalidating(true);
    setRevalidateMsg(null);
    try {
      const r = await fetch('/api/maestro/tokens/validate', { method: 'POST' });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      const validCount = (data.results ?? []).filter((x: { valid: boolean }) => x.valid).length;
      const totalCount = (data.results ?? []).length;
      setRevalidateMsg(`${validCount}/${totalCount} tokens valides`);
      await loadAll();
    } catch (err) {
      setRevalidateMsg(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRevalidating(false);
      setTimeout(() => setRevalidateMsg(null), 5000);
    }
  }, [loadAll]);

  return (
    <main className="min-h-screen bg-so-bg safe-top safe-bottom">
      <header className="sticky top-0 z-10 bg-so-bg/95 backdrop-blur-sm border-b border-so-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-so-text">
              Maestro <span className="text-so-gold">Dashboard</span>
            </h1>
            <p className="text-xs text-so-muted mt-0.5 tracking-wider uppercase">
              Factory monitoring — derniers 7 jours
            </p>
          </div>
          <Link
            href="/"
            className="text-[10px] uppercase tracking-widest text-so-muted border border-so-border rounded-full px-3 py-1.5 hover:bg-so-card transition-colors"
          >
            Retour
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && !stats ? (
          <div className="text-so-muted text-center py-8">Chargement...</div>
        ) : (
          <>
            {stats && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-so-muted mb-3 font-medium">
                  Dispatches
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Total" value={String(stats.total)} />
                  <StatCard
                    label="Reussis"
                    value={String(stats.success)}
                    hint={stats.total > 0 ? `${Math.round((stats.success / stats.total) * 100)}%` : '-'}
                  />
                  <StatCard
                    label="Echoues"
                    value={String(stats.fail)}
                    hint={stats.total > 0 ? `${Math.round((stats.fail / stats.total) * 100)}%` : '-'}
                  />
                  <StatCard label="Cout total" value={formatCost(stats.total_cost_usd)} />
                </div>
              </section>
            )}

            {stats && (stats.by_mode.length > 0 || stats.by_provider.length > 0) && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.by_mode.length > 0 && (
                  <div className="bg-so-card border border-so-border rounded-2xl p-4">
                    <h3 className="text-xs uppercase tracking-widest text-so-muted mb-3">Par mode</h3>
                    <div className="space-y-2">
                      {stats.by_mode.map((m) => (
                        <div key={m.mode} className="flex justify-between text-sm">
                          <span className="text-so-text">{m.mode}</span>
                          <span className="text-so-muted tabular-nums">
                            {m.count} - {formatCost(m.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {stats.by_provider.length > 0 && (
                  <div className="bg-so-card border border-so-border rounded-2xl p-4">
                    <h3 className="text-xs uppercase tracking-widest text-so-muted mb-3">Par provider</h3>
                    <div className="space-y-2">
                      {stats.by_provider.map((p) => (
                        <div key={p.provider ?? 'unknown'} className="flex justify-between text-sm">
                          <span className="text-so-text">{p.provider ?? '-'}</span>
                          <span className="text-so-muted tabular-nums">
                            {p.count} - {formatCost(p.cost)}{p.fail_rate_pct > 0 && ` - ${p.fail_rate_pct}% fail`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs uppercase tracking-widest text-so-muted font-medium">
                  Tokens API
                </h2>
                <div className="flex items-center gap-3">
                  {revalidateMsg && <span className="text-xs text-so-muted">{revalidateMsg}</span>}
                  <button
                    onClick={() => { void handleRevalidate(); }}
                    disabled={revalidating}
                    className="text-[10px] uppercase tracking-widest text-so-gold border border-so-gold/40 rounded-full px-3 py-1.5 hover:bg-so-gold/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {revalidating ? 'Verification...' : 'Re-verifier'}
                  </button>
                </div>
              </div>
              <div className="bg-so-card border border-so-border rounded-2xl overflow-hidden">
                {tokens.length === 0 ? (
                  <div className="p-4 text-sm text-so-muted text-center">Aucun token enregistre</div>
                ) : (
                  <ul className="divide-y divide-so-border">
                    {tokens.map((t) => (
                      <li key={t.name} className="px-4 py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <StatusDot ok={t.valid} />
                          <span className="text-so-text font-mono">{t.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-so-muted tabular-nums">{t.response_ms ? `${t.response_ms}ms` : '-'}</div>
                          <div className="text-xs text-so-muted">{formatTime(t.last_check_ts)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {tokens.some((t) => !t.valid && t.error_msg) && (
                <div className="mt-3 bg-so-card border border-so-border rounded-2xl p-4 space-y-1 text-xs">
                  {tokens.filter((t) => !t.valid && t.error_msg).map((t) => (
                    <div key={t.name} className="text-red-300">
                      <span className="font-mono">{t.name}</span>: {t.error_msg}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs uppercase tracking-widest text-so-muted mb-3 font-medium">
                Dispatches recents (20 derniers)
              </h2>
              <div className="bg-so-card border border-so-border rounded-2xl overflow-hidden">
                {dispatches.length === 0 ? (
                  <div className="p-4 text-sm text-so-muted text-center">Aucun dispatch</div>
                ) : (
                  <ul className="divide-y divide-so-border">
                    {dispatches.map((d) => (
                      <li key={d.id} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusDot ok={d.success === 1} />
                            <span className="text-xs text-so-muted">{formatTime(d.ts)}</span>
                            <span className="text-xs text-so-muted">-</span>
                            <span className="text-xs text-so-gold">{d.mode}</span>
                            {d.provider && (
                              <>
                                <span className="text-xs text-so-muted">-</span>
                                <span className="text-xs text-so-muted">{d.provider}</span>
                              </>
                            )}
                          </div>
                          <p className="text-so-text truncate">{d.task_preview}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div className="text-xs text-so-muted text-center pt-2">
              Auto-refresh toutes les 60 secondes
            </div>
          </>
        )}
      </div>
    </main>
  );
}
