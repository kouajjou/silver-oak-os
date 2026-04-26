'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAgent } from '@/lib/agents';
import VoiceInput from '@/components/VoiceInput';
import DelegationTrace from '@/components/DelegationTrace';
import ActivityFeed from '@/components/ActivityFeed';
import ChannelSwitcher, { type Channel } from '@/components/ChannelSwitcher';
import FacetimeMode from '@/components/FacetimeMode';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  agentId?: string;
  agentName?: string;
  delegationChain?: string[];
  delegated?: boolean;
}

function getInitialChannel(): Channel {
  if (typeof window === 'undefined') return 'message';
  const params = new URLSearchParams(window.location.search);
  const ch = params.get('channel');
  if (ch === 'voice') return 'voice';
  if (ch === 'facetime') return 'facetime';
  if (ch === 'email') return 'email';
  return 'message';
}

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = typeof params.id === 'string' ? params.id : '';
  const agent = getAgent(agentId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel>('message');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Latest delegation chain (for FacetimeMode transition)
  const lastDelegationChain = messages
    .filter((m) => m.role === 'agent' && m.delegationChain)
    .at(-1)?.delegationChain;

  // Read channel from URL on mount
  useEffect(() => {
    setActiveChannel(getInitialChannel());
  }, []);

  // Initialize with greeting
  useEffect(() => {
    if (!agent) return;
    setMessages([
      {
        id: 'greeting',
        role: 'agent',
        content: agent.greeting,
        timestamp: new Date(),
        agentId: agent.id,
        agentName: agent.name,
        delegationChain: [agent.id],
        delegated: false,
      },
    ]);
  }, [agent]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playTTS = useCallback(
    async (msgId: string, text: string) => {
      if (!agent) return;
      setIsTTSPlaying(msgId);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, agent_id: agent.id }),
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setIsTTSPlaying(null); URL.revokeObjectURL(url); };
        audio.onerror = () => setIsTTSPlaying(null);
        await audio.play();
      } catch {
        setIsTTSPlaying(null);
      }
    },
    [agent]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending || !agent) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsSending(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent.id,
            message: text.trim(),
            history: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = await res.json() as {
          reply?: string;
          error?: string;
          agent_id?: string;
          agent_name?: string;
          delegation_chain?: string[];
          delegated?: boolean;
        };
        const reply = data.reply ?? 'Je réfléchis à votre demande. Veuillez patienter.';

        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: reply,
          timestamp: new Date(),
          agentId: data.agent_id ?? agent.id,
          agentName: data.agent_name ?? agent.name,
          delegationChain: data.delegation_chain ?? [agent.id],
          delegated: data.delegated ?? false,
        };
        setMessages((prev) => [...prev, agentMsg]);

        if (ttsEnabled) {
          await playTTS(agentMsg.id, reply);
        }
      } catch {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: 'agent',
          content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [agent, isSending, messages, ttsEnabled, playTTS]
  );

  const handleVoiceResult = (transcript: string) => {
    setInput(transcript);
    void sendMessage(transcript);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  if (!agent) {
    return (
      <div className="min-h-screen bg-so-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-so-muted text-lg">Agent introuvable</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-so-gold underline"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-so-bg safe-top safe-bottom">
      {/* Header */}
      <header className="flex-shrink-0 bg-so-navy/95 backdrop-blur-sm border-b border-so-border px-4 py-3 safe-top">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-so-muted hover:text-so-gold transition-colors p-1 -ml-1"
            aria-label="Retour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-so-gold/40 flex-shrink-0">
            <Image src={agent.photo} alt={agent.name} fill className="object-cover" sizes="40px" unoptimized />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-so-text truncate">{agent.name}</p>
            <p className="text-[10px] text-so-gold uppercase tracking-widest font-medium">
              {agent.role_short}
            </p>
          </div>

          {/* TTS toggle (hidden in FaceTime — state still active) */}
          {activeChannel !== 'facetime' && (
            <button
              onClick={() => setTtsEnabled((v) => !v)}
              className={`p-2 rounded-full transition-colors ${
                ttsEnabled ? 'text-so-gold bg-so-gold/10' : 'text-so-muted'
              }`}
              title={ttsEnabled ? 'Désactiver la voix' : 'Activer la voix'}
            >
              {ttsEnabled ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Channel switcher tabs */}
      <ChannelSwitcher
        agent={agent}
        initialChannel={activeChannel}
        onChannelChange={setActiveChannel}
      />

      {/* === FACETIME CHANNEL === */}
      {activeChannel === 'facetime' && (
        <>
          <FacetimeMode
            agent={agent}
            isSpeaking={isTTSPlaying !== null}
            isListening={isVoiceListening}
            delegationChain={lastDelegationChain}
          />
          {/* Voice input footer in FaceTime mode */}
          <footer className="flex-shrink-0 bg-so-navy/95 backdrop-blur-sm border-t border-so-border px-4 py-4 safe-bottom">
            <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
              <VoiceInput
                onResult={handleVoiceResult}
                disabled={isSending}
              />
              <p className="text-so-muted text-xs">
                {isSending ? 'En cours…' : 'Appuyez pour parler'}
              </p>
            </div>
          </footer>
        </>
      )}

      {/* === EMAIL CHANNEL === */}
      {activeChannel === 'email' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-so-card border border-so-border flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <p className="text-so-text font-semibold mb-2">
              Envoyer un email à {agent.name}
            </p>
            <p className="text-so-muted text-sm mb-6">
              Votre email sera traité et une réponse vous sera envoyée sous 24h.
            </p>
            <a
              href={`mailto:karim@silveroak.one?subject=Question pour ${encodeURIComponent(agent.name)}&body=Bonjour ${encodeURIComponent(agent.name)},%0A%0A`}
              className="inline-block bg-so-gold text-so-bg font-semibold px-6 py-3 rounded-full hover:bg-so-gold/80 transition-colors"
            >
              Ouvrir l&apos;email
            </a>
          </div>
        </div>
      )}

      {/* === VOICE + MESSAGE CHANNELS (chat UI) === */}
      {(activeChannel === 'message' || activeChannel === 'voice') && (
        <>
          {/* Active delegations trace */}
          <div className="flex-shrink-0 px-4 pt-2 max-w-2xl mx-auto w-full">
            <DelegationTrace />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  agentName={agent.name}
                  agentPhoto={agent.photo}
                  isPlaying={isTTSPlaying === msg.id}
                  onPlayTTS={() => void playTTS(msg.id, msg.content)}
                />
              ))}

              {isSending && (
                <div className="flex gap-3 items-end">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-so-gold/30 flex-shrink-0">
                    <Image src={agent.photo} alt={agent.name} fill className="object-cover" sizes="32px" unoptimized />
                  </div>
                  <div className="bg-so-card border border-so-border rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-2 h-2 rounded-full bg-so-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-so-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-so-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <ActivityFeed />
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <footer className="flex-shrink-0 bg-so-navy/95 backdrop-blur-sm border-t border-so-border px-4 py-3 safe-bottom">
            <div className="max-w-2xl mx-auto flex items-end gap-3">
              <VoiceInput
                onResult={(t) => { setIsVoiceListening(false); handleVoiceResult(t); }}
                disabled={isSending}
              />
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${agent.name}…`}
                  rows={1}
                  disabled={isSending}
                  className="w-full bg-so-card border border-so-border rounded-2xl px-4 py-3 pr-12 text-so-text placeholder-so-muted text-sm resize-none focus:outline-none focus:border-so-gold/60 transition-colors disabled:opacity-50"
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px',
                    overflowY: input.length > 80 ? 'auto' : 'hidden',
                  }}
                />
                <button
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || isSending}
                  className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-so-gold text-so-bg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-so-gold/80 transition-colors"
                  aria-label="Envoyer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

function formatDelegationLabel(chain: string[]): string {
  const NAMES: Record<string, string> = {
    alex: 'Alex', sara: 'Sara', leo: 'Léo',
    marco: 'Marco', nina: 'Nina', maestro: 'Maestro',
  };
  return chain.map((id) => NAMES[id] ?? id).join(' → ');
}

function MessageBubble({
  message, agentName, agentPhoto, isPlaying, onPlayTTS,
}: {
  message: Message;
  agentName: string;
  agentPhoto: string;
  isPlaying: boolean;
  onPlayTTS: () => void;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-so-gold/20 border border-so-gold/30 rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-so-text text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className="text-[10px] text-so-muted mt-1 text-right">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    );
  }

  const showDelegation =
    message.delegated === true &&
    message.delegationChain !== undefined &&
    message.delegationChain.length > 1;

  return (
    <div className="flex gap-3 items-end">
      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-so-gold/30 flex-shrink-0">
        <Image src={agentPhoto} alt={agentName} fill className="object-cover" sizes="32px" unoptimized />
      </div>
      <div className="max-w-[80%]">
        {showDelegation && message.delegationChain && (
          <p className="text-[10px] italic text-so-gold/60 mb-1 pl-1">
            {formatDelegationLabel(message.delegationChain)} :
          </p>
        )}
        <div className="bg-so-card border border-so-border rounded-2xl rounded-bl-sm px-4 py-3 relative group">
          <p className="text-so-text text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <button
            onClick={onPlayTTS}
            className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] transition-all ${
              isPlaying
                ? 'bg-so-gold border-so-gold text-so-bg voice-pulse'
                : 'bg-so-card border-so-border text-so-muted opacity-0 group-hover:opacity-100 hover:border-so-gold hover:text-so-gold'
            }`}
            title="Lire à voix haute"
          >
            {isPlaying ? '🔊' : '🔈'}
          </button>
        </div>
        <p className="text-[10px] text-so-muted mt-1 pl-1">{formatTime(message.timestamp)}</p>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
