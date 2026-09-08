'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description React Hook personnalisé : use-voice-capture.ts
 *   Capture vocale côté client (Web Speech API), sans aucune dépendance
 *   réseau propre — la transcription se fait entièrement dans le navigateur.
 *   Détection de support + suivi de l'état réseau : le micro doit se
 *   désactiver proprement (jamais planter) si le navigateur ne supporte pas
 *   la reconnaissance vocale, ou si la connexion est indisponible (l'appel
 *   d'interprétation qui suit la transcription a lui besoin du réseau).
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

// La Web Speech API n'a pas de typage standard dans lib.dom — on type le
// strict nécessaire ici plutôt que d'ajouter une dépendance de types externe.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface VoiceCaptureState {
  /** Reconnaissance vocale disponible dans ce navigateur. */
  supported: boolean;
  /** Le micro doit être désactivé : non supporté OU hors-ligne (l'IA a besoin du réseau). */
  disabled: boolean;
  isRecording: boolean;
  transcript: string;
  error: string | null;
}

/** Capture une phrase, appelle `onResult` une fois la transcription obtenue. */
export function useVoiceCapture(lang = 'fr-FR') {
  const [supported, setSupported] = useState(false);
  const [online, setOnline] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef<(transcript: string) => void>(() => {});

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    setSupported(Boolean(Ctor));
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? '';
      setTranscript(text);
      setIsRecording(false);
      if (text) onResultRef.current(text);
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      setError(event.error || 'erreur inconnue');
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback((onResult: (transcript: string) => void) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    onResultRef.current = onResult;
    setTranscript('');
    setError(null);
    setIsRecording(true);
    try {
      recognition.start();
    } catch {
      // Déjà démarrée ou permission refusée — état cohérent, pas de crash.
      setIsRecording(false);
      setError('démarrage impossible');
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const state: VoiceCaptureState = {
    supported,
    disabled: !supported || !online,
    isRecording,
    transcript,
    error,
  };
  return { ...state, start, stop };
}
