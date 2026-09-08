'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : clarification-panel.tsx
 *   Ambiguïté produit vocale (spec-03 §14, §23) : carte en ligne desktop,
 *   `BottomSheet` sous `sm:` (640px) — jamais de choix automatique silencieux.
 *   Remplace le bloc quasi identique dupliqué dans `voice-cart-panel.tsx` et
 *   `entrepot/dispatch/page.tsx` (audit indépendant, recommandation Priorité
 *   2.2) : un seul point de correction pour ce pattern. Reste agnostique du
 *   domaine métier comme le reste de `packages/ui` — pas de dépendance à
 *   `@wilinwi/types`, l'appelant fait le mapping vers `ClarificationCandidate`.
 * @created 2026-09-09
 * @updated 2026-09-09
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Button } from './button.js';
import { BottomSheet } from './bottom-sheet.js';
import { useMinWidth } from './use-min-width.js';

export interface ClarificationCandidate {
  id: string;
  label: string;
}

export interface ClarificationPanelProps {
  question: string;
  candidates: ClarificationCandidate[];
  onPick: (candidate: ClarificationCandidate) => void;
  onCancel: () => void;
}

export function ClarificationPanel({ question, candidates, onPick, onCancel }: ClarificationPanelProps) {
  const isDesktop = useMinWidth(640);

  const candidateChips = (
    <div className="flex flex-wrap gap-2">
      {candidates.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          className="rounded-lg border border-brand/30 bg-white px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10"
        >
          {c.label}
        </button>
      ))}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="mt-2 rounded-xl border border-brand/20 bg-brand/5 p-3">
        <p className="text-sm font-medium text-slate-700">{question}</p>
        <div className="mt-2">{candidateChips}</div>
        <Button variant="ghost" size="sm" className="mt-2" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <BottomSheet open onClose={onCancel} title={question}>
      {candidateChips}
      <Button variant="ghost" size="sm" className="mt-3" onClick={onCancel}>
        Annuler
      </Button>
    </BottomSheet>
  );
}
