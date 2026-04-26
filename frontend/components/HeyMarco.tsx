'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Mapping of spoken names to agent IDs (handles accents + variants)
const HEY_PATTERNS: [RegExp, string][] = [
  [/\bhey\s+(alex|alexandre)\b/i, 'alex'],
  [/\bhey\s+sara\b/i,             'sara'],
  [/\bhey\s+l[ée]o\b/i,          'leo'],
  [/\bhey\s+marco\b/i,           'marco'],
  [/\bhey\s+nina\b/i,            'nina'],
  [/\bhey\s+maestro\b/i,         'maestro'],
];

interface Props {
  /** Called when transcript does not match a Hey-X pattern */
  onTranscript?: (text: string) => void;
}

export default function HeyMarco({ onTranscript }: Props) {
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }, []);

  const handleTranscript = useCallback(
    (transcript: string) => {
      for (const [pattern, agentId] of HEY_PATTERNS) {
        if (pattern.test(transcript)) {
          router.push(`/agent/${agentId}`);
          return;
        }
      }
      onTranscript?.(transcript);
    },
    [router, onTranscript]
  );

  const start = useCallback(() => {
    // Use the globally-declared SpeechRecognition from VoiceInput.tsx declare global
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(' ');
      handleTranscript(text);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }, [handleTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  if (!supported) return null;

  return (
    <button
      onClick={isListening ? stop : start}
      title={
        isListening
          ? 'En écoute… Dites "Hey Alex", "Hey Marco"…'
          : 'Activer commande vocale (Hey Marco…)'
      }
      aria-label="Hey Marco — commande vocale directe"
      className={[
        'fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full shadow-xl',
        'flex items-center justify-center transition-all duration-200',
        isListening
          ? 'bg-so-gold text-so-bg scale-110 voice-pulse shadow-so-gold/40'
          : 'bg-so-navy border border-so-gold/40 text-so-gold hover:scale-110 hover:border-so-gold',
      ].join(' ')}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-3 7a7 7 0 0014 0h-2a5 5 0 01-10 0H4zm5 7v-2h2v2h-1z" />
      </svg>
    </button>
  );
}
