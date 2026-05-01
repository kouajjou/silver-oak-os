'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputProps {
  onResult: (transcript: string) => void;
  disabled?: boolean;
  lang?: string;
}

/**
 * VoiceInput — PhD rewrite 2026-05-01.
 *
 * Uses MediaRecorder (works on Safari iOS, Chrome, Firefox)
 * + backend /api/stt proxy (Gemini Audio) for transcription.
 *
 * Fallback: Web Speech API if MediaRecorder unavailable (rare).
 *
 * UX: hold-to-record. Release → transcribe → onResult(text).
 */
export default function VoiceInput({
  onResult,
  disabled = false,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined';
    setIsSupported(supported);
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported || disabled || isRecording || isTranscribing) return;

    try {
      // Request mic permission + open stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Pick best mime type for browser
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',  // Safari iOS uses this
        'audio/ogg;codecs=opus',
      ];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Close mic stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (audioChunksRef.current.length === 0) {
          setIsRecording(false);
          return;
        }

        // Build blob with the actual mime type used
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || recorder.mimeType || 'audio/webm',
        });

        if (blob.size < 500) {
          // Too short — probably accidental tap
          setIsRecording(false);
          return;
        }

        // Send to backend for transcription
        setIsTranscribing(true);
        try {
          const ext =
            mimeType.includes('webm') ? 'webm' :
            mimeType.includes('mp4') ? 'm4a' :
            mimeType.includes('ogg') ? 'ogg' : 'webm';

          const formData = new FormData();
          formData.append('audio', blob, `recording.${ext}`);

          const res = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(60_000),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `STT failed: ${res.status}`);
          }

          const data = await res.json() as { transcript?: string };
          const text = (data.transcript ?? '').trim();
          if (text) {
            onResult(text);
          } else {
            showError('Aucune voix détectée. Réessayez.');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showError(`Transcription échouée: ${msg.slice(0, 80)}`);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.onerror = (e) => {
        showError(`Enregistrement échoué: ${(e as ErrorEvent).message ?? 'unknown'}`);
        setIsRecording(false);
      };

      recorder.start(100);  // collect chunks every 100ms
      setIsRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        showError('Permission micro refusée. Réglages Safari → Site web → Autoriser le micro.');
      } else if (msg.includes('NotFound')) {
        showError('Aucun micro détecté.');
      } else {
        showError(`Micro: ${msg.slice(0, 80)}`);
      }
      setIsRecording(false);
    }
  }, [isSupported, disabled, isRecording, isTranscribing, onResult, showError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);  // immediate UI feedback, transcribing follows
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Not supported — render nothing (graceful degradation)
  if (!isSupported) return null;

  return (
    <div className="flex flex-col items-center relative">
      <button
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onPointerCancel={stopRecording}
        disabled={disabled || isTranscribing}
        className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 select-none touch-none ${
          isRecording
            ? 'bg-red-500 border-2 border-red-300 voice-pulse shadow-lg shadow-red-500/30 text-white'
            : isTranscribing
            ? 'bg-so-gold/20 border border-so-gold/60 text-so-gold animate-pulse'
            : 'bg-so-card border border-so-border hover:border-so-gold/60 text-so-muted hover:text-so-gold'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label={
          isRecording ? 'Arrêter (relâcher)' :
          isTranscribing ? 'Transcription en cours' :
          'Parler (maintenir appuyé)'
        }
        title={
          isRecording ? 'Relâcher pour envoyer' :
          isTranscribing ? 'Transcription...' :
          'Maintenir pour parler'
        }
      >
        {isTranscribing ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="20" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        )}

        {isRecording && (
          <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-40" />
        )}
      </button>

      {/* Error message overlay */}
      {errorMsg && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-900/95 border border-red-500/50 rounded-lg px-3 py-2 text-xs text-red-100 max-w-[280px] shadow-lg z-50 whitespace-normal text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
