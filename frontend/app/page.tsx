'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AGENTS } from '@/lib/agents';

const CHANNEL_BUTTONS = [
  { icon: '📞', label: 'Voix', channel: 'voice' },
  { icon: '💬', label: 'Message', channel: 'chat' },
  { icon: '📧', label: 'Email', channel: 'email' },
  { icon: '📹', label: 'FaceTime', channel: 'facetime' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-so-bg safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-so-bg/95 backdrop-blur-sm border-b border-so-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-so-text">
              Silver Oak <span className="text-so-gold">OS</span>
            </h1>
            <p className="text-xs text-so-muted mt-0.5 tracking-wider uppercase">
              Virtual Staff
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Tous les agents actifs" />
        </div>
      </header>

      {/* Agent grid */}
      <section className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-so-muted text-xs uppercase tracking-widest mb-4 font-medium">
          Votre équipe
        </p>
        <div className="grid grid-cols-2 gap-4">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>
    </main>
  );
}

function AgentCard({ agent }: { agent: (typeof AGENTS)[number] }) {
  return (
    <div className="bg-so-card border border-so-border rounded-2xl overflow-hidden flex flex-col">
      {/* Photo + name area — clickable */}
      <Link href={`/agent/${agent.id}`} className="block group">
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={agent.photo}
            alt={agent.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 300px"
            unoptimized
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-so-card via-transparent to-transparent" />
          {/* Name + role */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-so-text font-semibold text-sm">{agent.name}</p>
            <span className="inline-block text-[9px] font-bold tracking-widest text-so-gold border border-so-gold/40 rounded px-1.5 py-0.5 mt-1 uppercase">
              {agent.role_short}
            </span>
          </div>
        </div>
      </Link>

      {/* Channel buttons */}
      <div className="grid grid-cols-4 border-t border-so-border">
        {CHANNEL_BUTTONS.map((btn) => (
          <ChannelButton key={btn.channel} agentId={agent.id} {...btn} />
        ))}
      </div>
    </div>
  );
}

function ChannelButton({
  agentId,
  icon,
  label,
  channel,
}: {
  agentId: string;
  icon: string;
  label: string;
  channel: string;
}) {
  // Voice and chat → go to agent page; others → MVP placeholder
  const href =
    channel === 'voice' || channel === 'chat'
      ? `/agent/${agentId}?channel=${channel}`
      : undefined;

  const handleClick = () => {
    if (!href) {
      // MVP: show toast or just focus agent chat
      window.location.href = `/agent/${agentId}`;
    }
  };

  const cls =
    'flex flex-col items-center justify-center py-2 gap-0.5 text-so-muted hover:text-so-gold hover:bg-so-navy/50 transition-colors cursor-pointer select-none';

  if (href) {
    return (
      <Link href={href} className={cls} title={label}>
        <span className="text-base">{icon}</span>
        <span className="text-[9px] tracking-wide uppercase">{label}</span>
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className={cls} title={label}>
      <span className="text-base">{icon}</span>
      <span className="text-[9px] tracking-wide uppercase">{label}</span>
    </button>
  );
}
