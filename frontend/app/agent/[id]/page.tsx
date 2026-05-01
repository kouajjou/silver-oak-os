'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAgent } from '@/lib/agents';
import VoiceInput from '@/components/VoiceInput';
import DelegationTrace from '@/components/DelegationTrace';
import ActivityFeed from '@/components/ActivityFeed';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  // Attribution fields (populated from /api/chat response)
  agentId?: string;
  agentName?: string;
  delegationChain?: string[];
  delegated?: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // PhD fix 2026-05-01: Safari iOS-compliant TTS
  // Safari iOS blocks audio.play() if not called in same synchronous task as user gesture.
  // Solution: create audio element + start play() IMMEDIATELY (synchronously), then set src
  // when blob arrives. This works because Safari counts the empty play() as the gesture.
  const playTTS = useCallback((msgId: string, text: string) => {
    if (!agent) return;
    setIsTTSPlaying(msgId);

    // STEP 1: Create audio element NOW (synchronously, in user gesture context)
    if (audioRef.current) {
      audioRef.current.pause();
      try { URL.revokeObjectURL(audioRef.current.src); } catch {}
    }
    const audio = new Audio();
    audioRef.current = audio;

    // STEP 2: Trigger play() with silent placeholder (Safari iOS unlock trick)
    // 1-frame silent MP3 (base64), allows Safari to consider audio "unlocked"
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MUxAMNgAJ/+UEQAJgAAA0gAAABMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

    audio.onended = () => {
      setIsTTSPlaying(null);
      try { URL.revokeObjectURL(audio.src); } catch {}
    };
    audio.onerror = (e) => {
      console.error('[TTS] audio.onerror', e);
      setIsTTSPlaying(null);
    };

    // Lock audio context for Safari iOS — play silent placeholder synchronously
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((err) => {
        console.warn('[TTS] silent play() rejected — Safari iOS may block', err);
      });
    }

    // STEP 3: Now fetch the real audio (async, no longer needs user gesture)
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, agent_id: agent.id }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        // Replace silent src with real audio — Safari iOS keeps audio unlocked
        audio.src = url;
        const playReal = audio.play();
        if (playReal) {
          playReal.catch((err) => {
            console.error('[TTS] real audio.play() failed:', err);
            setIsTTSPlaying(null);
          });
        }
      })
      .catch((err) => {
        console.error('[TTS] fetch failed:', err);
        setIsTTSPlaying(null);
      });
  }, [agent]);

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
        const reply = data.reply ?? "Je réfléchis à votre demande. Veuillez patienter.";

        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: reply,
          timestamp: new Date(),
          // Attribution fields from API response
          agentId: data.agent_id ?? agent.id,
          agentName: data.agent_name ?? agent.name,
          delegationChain: data.delegation_chain ?? [agent.id],
          delegated: data.delegated ?? false,
        };
        setMessages((prev) => [...prev, agentMsg]);

        // PhD fix 2026-04-30: Auto-play TTS only on user gesture (Safari iOS compliance)
        // The reply is always visible; user can tap the speaker icon to hear it
        // Auto-play removed — Safari iOS blocks audio without prior user interaction
        // Note: we keep ttsEnabled state for future preference, but no longer auto-play
        if (ttsEnabled && typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches) {
          // Desktop only — auto-play OK
          playTTS(agentMsg.id, reply);
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
    sendMessage(transcript);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
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
    <main className="flex flex-col h-screen bg-so-bg safe-top safe-bottom" aria-label={`Conversation avec ${agent.name}`}>
      {/* PhD a11y fix 2026-04-30: <h1> visually hidden but read by screen readers */}
      <h1 className="sr-only">{agent.name} — {agent.role}</h1>

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

          {/* Agent avatar */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-so-gold/40 flex-shrink-0">
            <Image
              src={agent.photo}
              alt={agent.name}
              fill
              className="object-cover"
              sizes="40px"
              unoptimized
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-so-text truncate">{agent.name}</p>
            <p className="text-[10px] text-so-gold uppercase tracking-widest font-medium">
              {agent.role_short}
            </p>
          </div>

          {/* TTS toggle */}
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className={`p-2 rounded-full transition-colors ${
              ttsEnabled ? 'text-so-gold bg-so-gold/10' : 'text-so-muted'
            }`}
            title={ttsEnabled ? 'Désactiver la voix' : 'Activer la voix'}
          >
            {ttsEnabled ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Active delegations trace — hidden when no delegations */}
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
              onPlayTTS={() => playTTS(msg.id, msg.content)}
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

          {/* Activity feed at bottom of messages */}
          <ActivityFeed />

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <footer className="flex-shrink-0 bg-so-navy/95 backdrop-blur-sm border-t border-so-border px-4 py-3 safe-bottom">
        <div className="max-w-2xl mx-auto flex items-end gap-3">
          {/* Voice input */}
          <VoiceInput onResult={handleVoiceResult} disabled={isSending} />

          {/* Text input */}
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
            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isSending}
              className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-so-gold text-so-bg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-so-gold/80 transition-colors"
              aria-label="Envoyer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {/* PhD fix 2026-04-30: clear send arrow icon (was paper-plane misread as warning) */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Renders "Alex → Marco" from a delegation_chain of agent IDs
function formatDelegationLabel(chain: string[]): string {
  const NAMES: Record<string, string> = {
    alex: 'Alex', sara: 'Sara', leo: 'Léo',
    marco: 'Marco', nina: 'Nina', maestro: 'Maestro',
  };
  return chain.map((id) => NAMES[id] ?? id).join(' → ');
}

function MessageBubble({
  message,
  agentName,
  agentPhoto,
  isPlaying,
  onPlayTTS,
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

  // Show delegation label only when a real multi-agent chain occurred
  const showDelegation =
    message.delegated === true &&
    message.delegationChain !== undefined &&
    message.delegationChain.length > 1;

  return (
    <div className="flex gap-3 items-end">
      {/* Agent avatar */}
      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-so-gold/30 flex-shrink-0">
        <Image src={agentPhoto} alt={agentName} fill className="object-cover" sizes="32px" unoptimized />
      </div>

      <div className="max-w-[80%]">
        {/* Delegation chain label — shown before bubble when delegated */}
        {showDelegation && message.delegationChain && (
          <p className="text-[10px] italic text-so-gold/60 mb-1 pl-1">
            {formatDelegationLabel(message.delegationChain)} :
          </p>
        )}

        <div className="bg-so-card border border-so-border rounded-2xl rounded-bl-sm px-4 py-3 relative group">
          <p className="text-so-text text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {/* TTS play button */}
          {/* PhD fix 2026-04-30: TTS button always visible (was opacity-0 group-hover, broken on mobile) */}
          <button
            onClick={onPlayTTS}
            className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-all touch-target-min ${
              isPlaying
                ? 'bg-so-gold border-so-gold text-so-bg voice-pulse shadow-md'
                : 'bg-so-navy border-so-gold/50 text-so-gold hover:bg-so-gold hover:text-so-bg'
            }`}
            title="Lire à voix haute"
            aria-label={isPlaying ? 'Lecture en cours' : 'Lire à voix haute'}
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
