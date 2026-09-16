'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description React Hook personnalisé : use-voice-capture.ts
 *   Capture audio brute (`getUserMedia` + `MediaRecorder`), ré-encodée en WAV
 *   mono 16 kHz côté client (Web Audio API) avant envoi au backend, qui la
 *   transmet à Gemini pour transcription + interprétation en un seul appel
 *   (cf. apps/api/src/ai/gemini.client.ts) — plus aucune transcription dans
 *   le navigateur.
 *
 *   Remplace l'ancienne implémentation basée sur la Web Speech API
 *   (`SpeechRecognition`/`webkitSpeechRecognition`), dont le support est
 *   incohérent selon le navigateur (absente de Firefox, dégradée sur Safari)
 *   ET selon la région : le moteur de Chrome route l'audio vers un serveur de
 *   reconnaissance Google externe, souvent indisponible ou instable hors de
 *   quelques pays — cause la plus probable des micros signalés en panne sur
 *   un produit ciblant le commerce africain. `getUserMedia` + `MediaRecorder`
 *   sont supportés de façon large et homogène, sans dépendre d'un service de
 *   reconnaissance tiers côté navigateur : le seul aller-retour réseau requis
 *   est celui, déjà nécessaire, vers Gemini.
 *
 *   Le ré-encodage WAV (au lieu d'envoyer tel quel le conteneur choisi par
 *   `MediaRecorder` — webm/opus sur Chrome, mp4/aac sur Safari...) garantit un
 *   format accepté par l'API Gemini quel que soit le navigateur d'origine, et
 *   le sous-échantillonnage à 16 kHz (largement suffisant pour de la parole)
 *   réduit la taille du payload envoyé.
 * @created 2026-09-08
 * @updated 2026-09-16
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { VOICE_MAX_RECORDING_MS } from '@wilinwi/types';

/** Fréquence cible du WAV envoyé au backend — largement suffisante pour la parole. */
const TARGET_SAMPLE_RATE = 16000;
/** En-deçà, on considère qu'il n'y a pas eu de parole (clic accidentel) — évite un aller-retour réseau inutile. */
const MIN_RECORDING_MS = 300;

function getAudioContextCtor(): (new () => AudioContext) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

/**
 * Traduit les erreurs brutes de `getUserMedia`/`MediaRecorder` en message
 * compréhensible (§33 du cahier des charges UI/UX : jamais de code technique brut).
 */
function describeMediaError(err: unknown): string {
  const name = (err as { name?: string } | undefined)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return "Microphone bloqué — Cliquez sur l'icône 🔒 (ou paramètres du site) à gauche de la barre d'adresse en haut, activez 'Microphone' sur Autoriser, puis réessayez.";
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Aucun microphone physique détecté sur cet appareil.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Microphone déjà utilisé par une autre application.';
    default:
      return 'Micro indisponible. Utilisez la recherche manuelle.';
  }
}

function writeAsciiString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

/** Encode un signal mono en WAV PCM 16 bits — format accepté par Gemini quel que
 *  soit le conteneur d'origine capturé par `MediaRecorder` (webm/opus, mp4/aac…). */
function encodeWavMono16(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAsciiString(view, 8, 'WAVE');
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits/sample
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Décode l'enregistrement (quel que soit son format d'origine), le ré-échantillonne
 *  en mono {@link TARGET_SAMPLE_RATE} Hz (Web Audio API native), puis l'encode en WAV. */
async function blobToWav(blob: Blob): Promise<Blob> {
  const AudioCtx = getAudioContextCtor();
  if (!AudioCtx) throw new Error('AudioContext non supporté');

  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    void decodeCtx.close();
  }

  const frameCount = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offlineCtx = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();

  return encodeWavMono16(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // "data:audio/wav;base64,AAAA..." → ne garder que la partie base64.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Lecture audio échouée'));
    reader.readAsDataURL(blob);
  });
}

export interface VoiceCaptureState {
  /** Capture + conversion audio disponibles dans ce navigateur. */
  supported: boolean;
  /** Le micro doit être désactivé : non supporté OU hors-ligne (l'IA a besoin du réseau). */
  disabled: boolean;
  isRecording: boolean;
  /** Conversion locale en cours (arrêt du micro → ré-échantillonnage → WAV), avant l'appel réseau. */
  processing: boolean;
  error: string | null;
}

/** Capture une phrase, appelle `onResult(audioBase64, mimeType)` une fois le WAV prêt à envoyer. */
export function useVoiceCapture() {
  const [supported, setSupported] = useState(false);
  const [online, setOnline] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef<(audioBase64: string, mimeType: string) => void>(() => {});
  const startedAtRef = useRef(0);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined' &&
        !!getAudioContextCtor(),
    );
  }, []);

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

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Coupe le micro si le composant démonte pendant un enregistrement en cours.
  useEffect(() => releaseStream, [releaseStream]);

  const stop = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop(); // → déclenche onstop, qui traite les chunks accumulés
    }
  }, []);

  const start = useCallback(
    async (onResult: (audioBase64: string, mimeType: string) => void) => {
      if (!supported || isRecording || processing) return;
      onResultRef.current = onResult;
      setError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        startedAtRef.current = Date.now();

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onerror = () => {
          setIsRecording(false);
          releaseStream();
          setError('Micro indisponible. Utilisez la recherche manuelle.');
        };
        recorder.onstop = () => {
          setIsRecording(false);
          releaseStream();
          const elapsed = Date.now() - startedAtRef.current;
          const recordedType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: recordedType });
          chunksRef.current = [];

          if (elapsed < MIN_RECORDING_MS || blob.size === 0) {
            setError("Rien entendu — parlez distinctement juste après avoir cliqué sur le micro.");
            return;
          }

          setProcessing(true);
          void blobToWav(blob)
            .then((wav) => blobToBase64(wav))
            .then((base64) => onResultRef.current(base64, 'audio/wav'))
            .catch(() => setError('Micro indisponible. Utilisez la recherche manuelle.'))
            .finally(() => setProcessing(false));
        };

        recorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        maxDurationTimerRef.current = setTimeout(stop, VOICE_MAX_RECORDING_MS);
      } catch (err) {
        setIsRecording(false);
        releaseStream();
        setError(describeMediaError(err));
      }
    },
    [supported, isRecording, processing, releaseStream, stop],
  );

  const state: VoiceCaptureState = {
    supported,
    disabled: !supported || !online,
    isRecording,
    processing,
    error,
  };
  return { ...state, start, stop };
}
