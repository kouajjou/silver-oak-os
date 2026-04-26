'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Agent } from '@/lib/agents';

export type Channel = 'voice' | 'facetime' | 'message' | 'email';

const CHANNELS: { id: Channel; icon: string; label: string }[] = [
  { id: 'voice',    icon: '📞', label: 'Voix' },
  { id: 'facetime', icon: '🎥', label: 'FaceTime' },
  { id: 'message',  icon: '💬', label: 'Message' },
  { id: 'email',    icon: '✉️', label: 'Email' },
];

interface Props {
  agent: Agent;
  initialChannel?: Channel;
  onChannelChange: (channel: Channel) => void;
}

export default function ChannelSwitcher({ agent, initialChannel, onChannelChange }: Props) {
  const storageKey = `so-channel-${agent.id}`;

  const getInitial = useCallback((): Channel => {
    if (initialChannel) return initialChannel;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey) as Channel | null;
      if (saved && CHANNELS.some((c) => c.id === saved)) return saved;
    }
    return 'message';
  }, [initialChannel, storageKey]);

  const [active, setActive] = useState<Channel>(getInitial);

  // Re-sync when initialChannel changes (e.g. URL navigation)
  useEffect(() => {
    if (initialChannel && initialChannel !== active) {
      setActive(initialChannel);
      onChannelChange(initialChannel);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChannel]);

  const select = (ch: Channel) => {
    setActive(ch);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, ch);
    }
    onChannelChange(ch);
  };

  return (
    <div className="flex flex-shrink-0 border-b border-so-border bg-so-navy/60">
      {CHANNELS.map((ch) => (
        <button
          key={ch.id}
          onClick={() => select(ch.id)}
          aria-selected={active === ch.id}
          className={[
            'flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors',
            'text-[10px] font-semibold tracking-widest uppercase',
            active === ch.id
              ? 'text-so-gold border-b-2 border-so-gold -mb-px'
              : 'text-so-muted hover:text-so-text',
          ].join(' ')}
        >
          <span className="text-base leading-none">{ch.icon}</span>
          <span>{ch.label}</span>
        </button>
      ))}
    </div>
  );
}
