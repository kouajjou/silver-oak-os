'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAgent } from '@/lib/agents';

/**
 * Voice Call Page — PhD 2026-05-01
 *
 * Full-screen "phone call" experience: Karim presses big button to talk,
 * releases to send, agent responds with voice. Continuous loop until hangup.
 *
 * Pipeline: MediaRecorder → /api/stt → /api/chat → /api/tts → audio.play()
 *
 * Safari iOS compliant: audio unlock at first user tap (start of call).
 */

type CallState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = typeof params.id === 'string' ? params.id : '';
  const agent = getAgent(agentId);

  const [callState, setCallState] = useState<CallState>('idle');
  const [callStarted, setCallStarted] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [reply, setReply] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'agent'; content: string }>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 6000);
  }, []);

  // Format call duration
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // STEP 1: Start the call (Safari iOS audio unlock happens here)
  const startCall = useCallback(() => {
    if (!agent) return;

    // Pre-create audio element for Safari iOS unlock
    const audio = new Audio();
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MUxAMNgAJ/+UEQAJgAAA0gAAABMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    audio.play().catch(() => { /* silent fail OK */ });
    audioRef.current = audio;

    setCallStarted(true);
    setCallState('idle');

    // Start call timer
    callTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, [agent]);

  // STEP 2: Press to talk → start recording
  const startListening = useCallback(async () => {
    if (!callStarted || callState !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (audioChunksRef.current.length === 0) {
          setCallState('idle');
          return;
        }

        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || recorder.mimeType || 'audio/webm',
        });

        if (blob.size < 500) {
          setCallState('idle');
          return;
        }

        // Process the audio
        await processAudio(blob, mimeType);
      };

      recorder.onerror = () => {
        showError('Erreur enregistrement');
        setCallState('idle');
      };

      recorder.start(100);
      setCallState('listening');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        showError('Permission micro refusée. Réglages Safari → Site → Micro');
      } else {
        showError(`Micro: ${msg.slice(0, 80)}`);
      }
      setCallState('idle');
    }
  }, [callStarted, callState, showError]);

  // STEP 3: Release → stop recording → STT → chat → TTS
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setCallState('transcribing');
      mediaRecorderRef.current.stop();
    }
  }, []);

  // STEP 4: Process audio pipeline
  const processAudio = async (blob: Blob, mimeType: string) => {
    if (!agent) return;

    try {
      // STT
      const ext =
        mimeType.includes('webm') ? 'webm' :
        mimeType.includes('mp4') ? 'm4a' :
        mimeType.includes('ogg') ? 'ogg' : 'webm';

      const formData = new FormData();
      formData.append('audio', blob, `recording.${ext}`);

      const sttRes = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(45_000),
      });

      if (!sttRes.ok) throw new Error(`STT failed: ${sttRes.status}`);

      const sttData = await sttRes.json() as { transcript?: string };
      const userText = (sttData.transcript ?? '').trim();

      if (!userText || userText.length < 2) {
        showError('Aucune voix détectée');
        setCallState('idle');
        return;
      }

      setTranscript(userText);
      setConversationHistory((h) => [...h, { role: 'user', content: userText }]);
      setCallState('thinking');

      // Chat
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: userText,
          history: conversationHistory.slice(-10),
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!chatRes.ok) throw new Error(`Chat failed: ${chatRes.status}`);

      const chatData = await chatRes.json() as { reply?: string };
      const agentReply = chatData.reply ?? "Désolé, je n'ai pas compris.";
      setReply(agentReply);
      setConversationHistory((h) => [...h, { role: 'agent', content: agentReply }]);

      // TTS
      setCallState('speaking');
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: agentReply, agent_id: agent.id }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!ttsRes.ok) throw new Error(`TTS failed: ${ttsRes.status}`);

      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setCallState('idle');
          setTimeout(() => URL.revokeObjectURL(audioUrl), 1000);
        };
        audioRef.current.onerror = () => {
          showError('Lecture audio échouée');
          setCallState('idle');
        };
        await audioRef.current.play();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(msg.slice(0, 80));
      setCallState('idle');
    }
  };

  // Hangup
  const hangup = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    router.push(`/agent/${agentId}`);
  }, [agentId, router]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!agent) {
    return (
      <main className="min-h-screen bg-so-bg flex items-center justify-center">
        <p className="text-so-muted">Agent introuvable</p>
      </main>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────

  // Pre-call screen (must tap to unlock audio for Safari iOS)
  if (!callStarted) {
    return (
      <main className="min-h-screen bg-so-bg flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="text-center mb-12">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-so-gold/40 mx-auto mb-6">
            <Image
              src={agent.photo}
              alt={agent.name}
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
              priority
            />
          </div>
          <h1 className="text-3xl font-semibold text-so-text mb-1">{agent.name}</h1>
          <p className="text-sm text-so-gold uppercase tracking-widest">{agent.role_short}</p>
          <p className="text-so-muted text-sm mt-4">Appel vocal</p>
        </div>

        <button
          onClick={startCall}
          className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 flex items-center justify-center shadow-lg shadow-green-500/30 transition-all touch-none"
          aria-label="Démarrer l'appel"
        >
          <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
          </svg>
        </button>
        <p className="text-so-muted text-xs mt-4">Touche pour démarrer</p>

        <button
          onClick={() => router.push(`/agent/${agentId}`)}
          className="absolute top-6 left-6 text-so-muted hover:text-so-gold p-2"
          aria-label="Retour"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </main>
    );
  }

  // In-call screen
  const stateLabels: Record<CallState, string> = {
    idle: 'Maintiens pour parler',
    listening: 'Je t\'écoute…',
    transcribing: 'Transcription…',
    thinking: 'Réflexion…',
    speaking: 'En train de parler…',
  };

  return (
    <main className="min-h-screen bg-so-bg flex flex-col safe-top safe-bottom">
      {/* Top: agent info */}
      <div className="flex-shrink-0 pt-12 pb-6 text-center px-6">
        <div className={`relative w-32 h-32 rounded-full overflow-hidden border-4 mx-auto mb-4 transition-all duration-300 ${
          callState === 'listening' ? 'border-red-500 voice-pulse' :
          callState === 'speaking' ? 'border-so-gold voice-pulse' :
          callState === 'thinking' || callState === 'transcribing' ? 'border-so-gold/60' :
          'border-so-gold/40'
        }`}>
          <Image src={agent.photo} alt={agent.name} fill className="object-cover" sizes="128px" unoptimized priority />
        </div>
        <h1 className="text-2xl font-semibold text-so-text">{agent.name}</h1>
        <p className="text-xs text-so-gold uppercase tracking-widest mt-1">{agent.role_short}</p>
        <p className="text-so-muted text-xs mt-2 font-mono">{formatDuration(callDuration)}</p>
      </div>

      {/* Middle: state + transcript */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4 gap-4">
        <p className={`text-base text-center transition-colors ${
          callState === 'listening' ? 'text-red-400' :
          callState === 'speaking' ? 'text-so-gold' :
          'text-so-muted'
        }`}>
          {stateLabels[callState]}
        </p>

        {transcript && callState !== 'idle' && (
          <div className="bg-so-card/40 border border-so-border rounded-2xl px-4 py-3 max-w-md">
            <p className="text-[11px] uppercase tracking-wider text-so-muted mb-1">Tu as dit</p>
            <p className="text-sm text-so-text">{transcript}</p>
          </div>
        )}

        {reply && (callState === 'speaking' || callState === 'idle') && (
          <div className="bg-so-navy/60 border border-so-gold/30 rounded-2xl px-4 py-3 max-w-md">
            <p className="text-[11px] uppercase tracking-wider text-so-gold mb-1">{agent.name}</p>
            <p className="text-sm text-so-text">{reply}</p>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-900/80 border border-red-500/50 rounded-2xl px-4 py-3 max-w-md">
            <p className="text-sm text-red-100">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Bottom: controls */}
      <div className="flex-shrink-0 pb-8 px-6">
        <div className="flex items-center justify-center gap-12">
          {/* Push-to-talk button */}
          <button
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerLeave={stopListening}
            onPointerCancel={stopListening}
            disabled={callState !== 'idle' && callState !== 'listening'}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all touch-none select-none ${
              callState === 'listening'
                ? 'bg-red-500 voice-pulse scale-110 shadow-red-500/40'
                : callState === 'idle'
                ? 'bg-so-gold/20 border-2 border-so-gold hover:bg-so-gold/30 active:scale-95'
                : 'bg-so-card border-2 border-so-border opacity-50'
            }`}
            aria-label={callState === 'listening' ? 'Relâcher pour envoyer' : 'Maintiens pour parler'}
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Hangup button */}
          <button
            onClick={hangup}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-lg shadow-red-600/30 transition-all"
            aria-label="Raccrocher"
          >
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(135deg)' }}>
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
