'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend : panier vocal Wilinwi AI (POS).
 *   Micro → audio brut (WAV, ré-encodé côté client) → POST /api/ai/voice/interpret
 *   → Gemini transcrit ET interprète en un seul appel côté serveur → panier
 *   proposé. Le résultat alimente le panier existant via `onResolvedItem`
 *   (même chemin que les clics manuels — `addToCart` côté page) : ce
 *   composant ne crée JAMAIS de vente lui-même, il ne fait qu'ajouter des
 *   lignes au panier local que le checkout existant confirmera ensuite.
 * @created 2026-09-08
 * @updated 2026-09-16
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import type { ProductDto, VoiceInterpretResult, VoiceProductCandidate } from '@wilinwi/types';
import { ClarificationPanel, VoiceButton, type ClarificationCandidate } from '@wilinwi/ui';
import { apiPost } from '@/lib/api';
import { useVoiceCapture } from '@/lib/use-voice-capture';

interface VoiceCartPanelProps {
  products: ProductDto[];
  onResolvedItem: (product: ProductDto, quantite: number, prixReel: number) => void;
  /** Vente désactivée (ex. vue « Toutes les boutiques ») → micro désactivé aussi. */
  disabled?: boolean;
}

type PendingClarification = {
  question: string;
  quantity?: number;
  candidates: VoiceProductCandidate[];
};

export function VoiceCartPanel({ products, onResolvedItem, disabled }: VoiceCartPanelProps) {
  const voice = useVoiceCapture();
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [clarification, setClarification] = useState<PendingClarification | null>(null);

  function resolveOne(productId: string, quantite: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setStatus({ tone: 'err', text: 'Produit introuvable dans le catalogue local.' });
      return;
    }
    onResolvedItem(product, quantite, product.prixCatalogue);
  }

  async function handleAudio(audioBase64: string, mimeType: string) {
    setStatus(null);
    setClarification(null);
    setTranscript(null);
    setLoading(true);
    try {
      const result = await apiPost<VoiceInterpretResult>('/api/ai/voice/interpret', {
        audio: audioBase64,
        mimeType,
        context: 'pos',
      });
      applyResult(result);
    } catch {
      // Panne réseau, timeout, etc. — jamais bloquant : la recherche manuelle reste disponible.
      setStatus({ tone: 'err', text: 'Assistant vocal indisponible. Utilisez la recherche.' });
    } finally {
      setLoading(false);
    }
  }

  function applyResult(result: VoiceInterpretResult) {
    if (result.transcript) setTranscript(result.transcript);

    if (!result.ok) {
      const text =
        result.error === 'FORBIDDEN'
          ? "Vous n'avez pas la permission d'utiliser l'assistant vocal pour cette action."
          : result.error === 'TRANSCRIPT_EMPTY'
            ? 'Rien entendu — parlez distinctement juste après avoir cliqué sur le micro.'
            : 'Assistant vocal indisponible. Utilisez la recherche.';
      setStatus({ tone: 'err', text });
      return;
    }

    for (const item of result.resolvedCartItems ?? []) {
      resolveOne(item.productId, item.quantite);
    }

    const messages: string[] = [];
    if (result.resolvedCartItems && result.resolvedCartItems.length > 0) {
      messages.push(
        `Ajouté : ${result.resolvedCartItems.map((i) => `${i.quantite}× ${i.nom}`).join(', ')}.`,
      );
    }
    if (result.unresolvedQueries && result.unresolvedQueries.length > 0) {
      messages.push(`Introuvable : ${result.unresolvedQueries.join(', ')}.`);
    }
    if (messages.length > 0) {
      setStatus({ tone: result.unresolvedQueries?.length ? 'err' : 'ok', text: messages.join(' ') });
    }

    if (result.clarification) {
      setClarification(result.clarification);
    }
  }

  function pickCandidate(candidate: ClarificationCandidate) {
    if (!clarification) return;
    resolveOne(candidate.id, clarification.quantity ?? 1);
    setClarification(null);
  }

  if (voice.disabled && !clarification) {
    // Non supporté ou hors-ligne : le micro disparaît, jamais de bouton mort.
    return null;
  }

  const busy = loading || voice.processing;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <VoiceButton
          state={voice.isRecording ? 'listening' : busy ? 'loading' : 'idle'}
          disabled={disabled || busy}
          onClick={() => (voice.isRecording ? voice.stop() : voice.start(handleAudio))}
          aria-label={voice.isRecording ? 'Arrêter le micro' : 'Parler pour ajouter au panier'}
        />
        <span className="text-sm text-slate-500">
          {voice.isRecording
            ? 'Je vous écoute…'
            : voice.processing
              ? 'Conversion…'
              : loading
                ? 'Analyse en cours…'
                : transcript
                  ? `« ${transcript} »`
                  : 'Parler pour ajouter des produits'}
        </span>
      </div>

      {status && (
        <p className={`mt-2 text-xs font-medium ${status.tone === 'err' ? 'text-red-600' : 'text-emerald-700'}`}>
          {status.text}
        </p>
      )}
      {voice.error && <p className="mt-2 text-xs font-medium text-red-600">{voice.error}</p>}

      {clarification && (
        <ClarificationPanel
          question={clarification.question}
          candidates={clarification.candidates.map((c) => ({ id: c.productId, label: c.nom }))}
          onPick={pickCandidate}
          onCancel={() => setClarification(null)}
        />
      )}
    </div>
  );
}
