'use client';
import { useEffect, useState, useCallback } from 'react';

interface Delegation {
  id: string;
  from_agent: string;
  to_agent: string;
  prompt: string | null;
  status: string;
  created_at: string;
}

const AGENT_NAMES: Record<string, string> = {
  alex: 'Alex', sara: 'Sara', leo: 'Léo',
  marco: 'Marco', nina: 'Nina', maestro: 'Maestro',
};

function agentLabel(id: string): string {
  return AGENT_NAMES[id] ?? id;
}

function timeAgo(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  return `il y a ${Math.floor(diff / 3600)}h`;
}

const STATUS_ICON: Record<string, string> = {
  pending: '⏳',
  running: '⚡',
  done:    '✅',
  error:   '❌',
};

export default function ActivityFeed() {
  const [items, setItems] = useState<Delegation[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const PAGE_SIZE = 10;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/delegations/active');
      if (!res.ok) return;
      const data = await res.json() as { delegations: Delegation[] };
      setItems(data.delegations ?? []);
    } catch {
      // silently ignore — polling will retry
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => { void fetchData(); }, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const visible = items.slice(cursor, cursor + PAGE_SIZE);
  const hasMore = cursor + PAGE_SIZE < items.length;
  const hasPrev = cursor > 0;

  if (items.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-1">
          Activité récente
        </div>
        <p className="text-xs text-slate-400 italic">Aucune activité en cours</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-2">
        Activité récente
      </div>
      <div className="space-y-2">
        {visible.map((d) => (
          <div key={d.id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 flex-shrink-0">
              {STATUS_ICON[d.status] ?? '•'}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-800">{agentLabel(d.from_agent)}</span>
              <span className="text-slate-400"> a délégué à </span>
              <span className="font-medium text-amber-700">{agentLabel(d.to_agent)}</span>
              {d.prompt && (
                <p className="text-slate-500 truncate mt-0.5">{d.prompt.slice(0, 60)}{d.prompt.length > 60 ? '…' : ''}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
              {timeAgo(d.created_at)}
            </span>
          </div>
        ))}
      </div>
      {(hasPrev || hasMore) && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200">
          {hasPrev && (
            <button
              onClick={() => setCursor((c) => Math.max(0, c - PAGE_SIZE))}
              className="text-[10px] text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Précédent
            </button>
          )}
          {hasMore && (
            <button
              onClick={() => setCursor((c) => c + PAGE_SIZE)}
              className="text-[10px] text-slate-500 hover:text-slate-700 transition-colors ml-auto"
            >
              Suivant →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
