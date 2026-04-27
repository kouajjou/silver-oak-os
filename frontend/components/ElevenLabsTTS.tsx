'use client';

import { useState, useRef } from 'react';

interface ElevenLabsTTSProps {
  text: string;
  voiceId: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  className?: string;
}

/**
 * Standalone TTS button component.
 * Fetches audio from /api/tts proxy (avoids CORS).
 */
export default function ElevenLabsTTS({
  text,
  voiceId,
  onPlayStart,
  onPlayEnd,
  className = '',
}: ElevenLabsTTSProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
    if (isPlaying) {
      // Stop current playback
      audioRef.current?.pause();
      setIsPlaying(false);
      onPlayEnd?.();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: voiceId }),
      });

      if (!res.ok) throw new Error(`TTS error: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Cleanup previous
      if (audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsPlaying(true);
        onPlayStart?.();
      };

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        onPlayEnd?.();
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <button
      onClick={play}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 text-so-muted hover:text-so-gold transition-colors disabled:opacity-50 ${className}`}
      title={isPlaying ? 'Arrêter' : 'Lire à voix haute'}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-so-muted border-t-so-gold rounded-full animate-spin" />
      ) : isPlaying ? (
        <svg className="w-4 h-4 text-so-gold" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="text-xs">{isPlaying ? 'Stop' : 'Écouter'}</span>
    </button>
  );
}
