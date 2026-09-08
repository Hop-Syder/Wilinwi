'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend : panier vocal Wilinwi AI (POS).
 *   Micro → transcription (client) → POST /api/ai/voice/interpret → panier
 *   proposé. Le résultat alimente le panier existant via `onResolvedItem`
 *   (même chemin que les clics manuels — `addToCart` côté page) : ce
 *   composant ne crée JAMAIS de vente lui-même, il ne fait qu'ajouter des
 *   lignes au panier local que le checkout existant confirmera ensuite.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import type { ProductDto, VoiceInterpretResult, VoiceProductCandidate } from '@wilinwi/types';
import { Button, BottomSheet, VoiceButton } from '@wilinwi/ui';
import { apiPost } from '@/lib/api';
import { useVoiceCapture } from '@/lib/use-voice-capture';
import { useMinWidth } from '@/lib/use-min-width';

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
  const isDesktop = useMinWidth(640);
  const [loading, setLoading] = useState(false);
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

  async function handleTranscript(transcript: string) {
    setStatus(null);
    setClarification(null);
    setLoading(true);
    try {
      const result = await apiPost<VoiceInterpretResult>('/api/ai/voice/interpret', {
        transcript,
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
    if (!result.ok) {
      const text =
        result.error === 'FORBIDDEN'
          ? "Vous n'avez pas la permission d'utiliser l'assistant vocal pour cette action."
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

  function pickCandidate(candidate: VoiceProductCandidate) {
    if (!clarification) return;
    resolveOne(candidate.productId, clarification.quantity ?? 1);
    setClarification(null);
  }

  if (voice.disabled && !clarification) {
    // Non supporté ou hors-ligne : le micro disparaît, jamais de bouton mort.
    return null;
  }

  const candidateChips = clarification && (
    <div className="flex flex-wrap gap-2">
      {clarification.candidates.map((c) => (
        <button
          key={c.productId}
          onClick={() => pickCandidate(c)}
          className="rounded-lg border border-brand/30 bg-white px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10"
        >
          {c.nom}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <VoiceButton
          state={loading ? 'loading' : voice.isRecording ? 'listening' : 'idle'}
          disabled={disabled || loading}
          onClick={() => (voice.isRecording ? voice.stop() : voice.start(handleTranscript))}
          aria-label={voice.isRecording ? 'Arrêter le micro' : 'Parler pour ajouter au panier'}
        />
        <span className="text-sm text-slate-500">
          {voice.isRecording
            ? 'Je vous écoute…'
            : loading
              ? 'Analyse en cours…'
              : voice.transcript
                ? `« ${voice.transcript} »`
                : 'Parler pour ajouter des produits'}
        </span>
      </div>

      {status && (
        <p className={`mt-2 text-xs font-medium ${status.tone === 'err' ? 'text-red-600' : 'text-emerald-700'}`}>
          {status.text}
        </p>
      )}

      {/* Ambiguïté produit : carte en ligne desktop (rendu existant, inchangé),
          bottom sheet en dessous de 640px (§19) — jamais de choix automatique
          silencieux dans les deux cas. */}
      {clarification && isDesktop && (
        <div className="mt-2 rounded-xl border border-brand/20 bg-brand/5 p-3">
          <p className="text-sm font-medium text-slate-700">{clarification.question}</p>
          <div className="mt-2">{candidateChips}</div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setClarification(null)}>
            Annuler
          </Button>
        </div>
      )}
      {clarification && !isDesktop && (
        <BottomSheet open onClose={() => setClarification(null)} title={clarification.question}>
          {candidateChips}
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setClarification(null)}>
            Annuler
          </Button>
        </BottomSheet>
      )}
    </div>
  );
}
