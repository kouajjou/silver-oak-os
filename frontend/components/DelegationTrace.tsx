'use client';
import { useEffect, useState } from 'react';

interface Delegation {
  id: string;
  from_agent: string;
  to_agent: string;
  prompt: string | null;
  status: string;
  created_at: string;
}

const AGENT_COLORS: Record<string, string> = {
  alex:    'text-blue-900 font-semibold',
  sara:    'text-emerald-700 font-semibold',
  leo:     'text-violet-700 font-semibold',
  marco:   'text-amber-700 font-semibold',
  nina:    'text-rose-700 font-semibold',
  maestro: 'text-slate-800 font-semibold',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  running: 'bg-blue-100 text-blue-700',
};

function agentLabel(id: string): string {
  const NAMES: Record<string, string> = {
    alex: 'Alex', sara: 'Sara', leo: 'Léo',
    marco: 'Marco', nina: 'Nina', maestro: 'Maestro',
  };
  return NAMES[id] ?? id;
}

export default function DelegationTrace() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/delegations/active');
        if (!res.ok) return;
        const data = await res.json() as { delegations: Delegation[] };
        setDelegations(data.delegations ?? []);
      } catch {
        // silently ignore — polling will retry
      }
    };

    void fetchData();
    const interval = setInterval(() => { void fetchData(); }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (delegations.length === 0) return null;

  return (
    <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/80 mb-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-widest text-amber-600 font-medium mb-2">
        Délégations actives
      </div>
      <div className="space-y-1.5">
        {delegations.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <span className={agentLabel(d.from_agent) ? AGENT_COLORS[d.from_agent] ?? 'font-semibold text-gray-700' : 'font-semibold text-gray-700'}>
              {agentLabel(d.from_agent)}
            </span>
            <span className="text-gray-300 text-xs">→</span>
            <span className={AGENT_COLORS[d.to_agent] ?? 'font-semibold text-gray-700'}>
              {agentLabel(d.to_agent)}
            </span>
            <span className="ml-auto">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {d.status}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
