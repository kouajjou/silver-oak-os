'use client';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import type { Agent } from '@/lib/agents';

const AGENT_NAMES: Record<string, string> = {
  alex: 'Alex', sara: 'Sara', leo: 'Léo',
  marco: 'Marco', nina: 'Nina', maestro: 'Maestro',
};

const BAR_COUNT = 15;

interface Props {
  agent: Agent;
  isSpeaking: boolean;
  isListening: boolean;
  delegationChain?: string[];
}

export default function FacetimeMode({ agent, isSpeaking, isListening, delegationChain }: Props) {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const [outgoingPhoto, setOutgoingPhoto] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const prevAgentId = useRef<string>(agent.id);

  // Animate waveform bars when agent speaks
  useEffect(() => {
    if (!isSpeaking) {
      setBars(Array(BAR_COUNT).fill(4));
      return;
    }
    const interval = setInterval(() => {
      setBars(Array.from({ length: BAR_COUNT }, () => Math.random() * 32 + 4));
    }, 80);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Slide transition when delegation changes active agent
  useEffect(() => {
    const chain = delegationChain ?? [agent.id];
    const current = chain[chain.length - 1] ?? agent.id;
    if (current !== prevAgentId.current) {
      setOutgoingPhoto(agent.photo);
      setTransitioning(true);
      const t = setTimeout(() => {
        setOutgoingPhoto(null);
        setTransitioning(false);
      }, 600);
      prevAgentId.current = current;
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delegationChain]);

  const chain = delegationChain ?? [agent.id];
  const showChainLabel = chain.length > 1;

  return (
    <div className="relative flex-1 overflow-hidden bg-so-bg flex flex-col">
      {/* Breathing background photo */}
      <div
        className="absolute inset-0"
        style={{ animation: 'so-breathing 3s ease-in-out infinite' }}
      >
        <Image
          src={agent.photo}
          alt={agent.name}
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-so-bg/40 via-transparent to-so-bg/70" />
      </div>

      {/* Outgoing photo slides up during agent transition */}
      {transitioning && outgoingPhoto && (
        <div
          className="absolute inset-0 z-10"
          style={{ animation: 'so-slideUp 0.6s ease-in-out forwards' }}
        >
          <Image src={outgoingPhoto} alt="prev agent" fill className="object-cover" sizes="100vw" unoptimized />
          <div className="absolute inset-0 bg-so-bg/40" />
        </div>
      )}

      {/* Agent name + delegation chain */}
      <div className="relative z-20 flex flex-col items-center pt-8 px-4">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-so-gold/60 shadow-lg shadow-so-gold/20 mb-3">
          <Image src={agent.photo} alt={agent.name} width={80} height={80} className="object-cover" unoptimized />
        </div>
        <p className="text-so-text font-semibold text-xl tracking-wide">{agent.name}</p>
        <p className="text-[10px] text-so-gold uppercase tracking-widest mt-0.5">{agent.role_short}</p>
        {showChainLabel && (
          <p className="text-so-gold/70 text-xs italic mt-2">
            {chain.map((id) => AGENT_NAMES[id] ?? id).join(' → ')}
          </p>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Waveform — agent speaking */}
      {isSpeaking && (
        <div className="relative z-20 flex items-end justify-center gap-1 px-8 pb-8 h-16">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 max-w-[10px] rounded-full bg-so-gold transition-all"
              style={{ height: `${h}px`, opacity: 0.5 + (h / 48) * 0.5, transitionDuration: '75ms' }}
            />
          ))}
        </div>
      )}

      {/* Mic pulse — user's turn */}
      {isListening && !isSpeaking && (
        <div className="relative z-20 flex items-center justify-center pb-8">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full bg-so-gold/20 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-so-gold/30 border border-so-gold/60 flex items-center justify-center">
              <svg className="w-6 h-6 text-so-gold" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-3 7a7 7 0 0014 0h-2a5 5 0 01-10 0H4zm5 7v-2h2v2h-1z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Idle — waiting */}
      {!isSpeaking && !isListening && (
        <div className="relative z-20 flex items-center justify-center pb-8 gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-so-gold/50 animate-pulse" />
          <p className="text-so-muted text-sm">Connexion active…</p>
        </div>
      )}
    </div>
  );
}
