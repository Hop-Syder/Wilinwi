'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend : assistant vocal du directeur (dashboard).
 *   Micro → transcription (client) → POST /api/ai/voice/interpret → réponse
 *   affichée telle quelle. Le texte provient exclusivement du backend
 *   (AnalyticsService/StockService) : ce composant ne fait qu'afficher —
 *   il n'invente jamais de chiffre et n'écrit jamais rien.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import { Mic, Loader2, Volume2 } from 'lucide-react';
import type { VoiceInterpretResult } from '@wilinwi/types';
import { apiPost } from '@/lib/api';
import { useVoiceCapture } from '@/lib/use-voice-capture';
import { useTts } from '@/lib/use-tts';

export function VoiceDashboardPanel() {
  const voice = useVoiceCapture();
  const tts = useTts();
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleTranscript(transcript: string) {
    setAnswer(null);
    setErrorText(null);
    setLoading(true);
    try {
      const result = await apiPost<VoiceInterpretResult>('/api/ai/voice/interpret', {
        transcript,
        context: 'dashboard',
      });
      applyResult(result);
    } catch {
      setErrorText('Assistant vocal indisponible pour le moment.');
    } finally {
      setLoading(false);
    }
  }

  function applyResult(result: VoiceInterpretResult) {
    if (!result.ok) {
      setErrorText(
        result.error === 'FORBIDDEN'
          ? "Vous n'avez pas la permission de poser cette question à l'assistant vocal."
          : 'Assistant vocal indisponible pour le moment.',
      );
      return;
    }
    if (result.answer) {
      setAnswer(result.answer.text);
      if (ttsEnabled) tts.speak(result.answer.text);
      return;
    }
    if (result.clarification) {
      setAnswer(result.clarification.question);
    }
  }

  if (voice.disabled) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 p-3">
      <button
        type="button"
        onClick={() => (voice.isRecording ? voice.stop() : voice.start(handleTranscript))}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          voice.isRecording ? 'animate-pulse bg-red-500 text-white' : 'bg-brand text-white hover:bg-brand/90'
        }`}
        aria-label={voice.isRecording ? 'Arrêter le micro' : "Poser une question à l'assistant"}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-600">
            {voice.isRecording
              ? 'Je vous écoute…'
              : loading
                ? 'Analyse en cours…'
                : "Demandez « Combien avons-nous vendu aujourd'hui ? »"}
          </span>
          {tts.supported && (
            <button
              type="button"
              onClick={() => setTtsEnabled((v) => !v)}
              className={`shrink-0 rounded-full p-1.5 ${ttsEnabled ? 'text-brand' : 'text-slate-300'}`}
              aria-label="Activer la lecture vocale des réponses"
              title="Lecture vocale des réponses"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {voice.transcript && !loading && !answer && !errorText && (
          <p className="mt-1 text-xs text-slate-400">« {voice.transcript} »</p>
        )}
        {answer && <p className="mt-1 text-sm font-medium text-slate-800">{answer}</p>}
        {errorText && <p className="mt-1 text-xs font-medium text-red-600">{errorText}</p>}
      </div>
    </div>
  );
}
