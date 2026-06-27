'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Relance d'impayé côté UI.
 *   - <DunningBanner/> : bannière persistante NON bloquante (OWNER/MANAGER only),
 *     affichée à J+0/J+3/J+7 — jamais sur l'écran du caissier.
 *   - <DunningBlock/> : écran de régularisation BLOQUANT (J+30, dernier recours).
 *   Cf. buinessplan.md §4.
 */

import Link from 'next/link';
import { AlertTriangle, Lock, ArrowRight } from 'lucide-react';
import { dunningMessage } from '@wilinwi/types';
import { useAuth } from '@/lib/auth-context';

const TONE: Record<string, string> = {
  WARNING: 'bg-gold/10 border-gold/30 text-amber-800',
  RESTRICTED: 'bg-warning/10 border-warning/40 text-amber-900',
  DOWNGRADED: 'bg-danger/10 border-danger/30 text-danger',
};

/** Bannière persistante non bloquante, réservée OWNER/MANAGER. */
export function DunningBanner() {
  const { user } = useAuth();
  if (!user) return null;
  const { stage } = user.dunning;
  const isAdmin = user.role === 'OWNER' || user.role === 'MANAGER';
  // Jamais sur l'écran caissier ; jamais à l'étape bloquante (gérée par DunningBlock).
  if (!isAdmin) return null;
  if (stage === 'ACTIVE' || stage === 'BLOCKED') return null;

  return (
    <div className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${TONE[stage] ?? TONE.WARNING}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Abonnement impayé</p>
        <p className="mt-0.5 opacity-90">{dunningMessage(user.dunning)}</p>
      </div>
      {user.role === 'OWNER' && (
        <Link
          href="/parametres"
          className="shrink-0 self-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
        >
          Régulariser
        </Link>
      )}
    </div>
  );
}

/** Écran de régularisation bloquant (J+30). Plein écran, dernier recours. */
export function DunningBlock() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const isOwner = user.role === 'OWNER';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-bold text-text-primary">Accès suspendu</h1>
        <p className="mt-2 text-sm text-text-secondary">{dunningMessage(user.dunning)}</p>

        {isOwner ? (
          <Link
            href="/parametres"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald py-3 text-sm font-bold text-white shadow-md shadow-emerald/25 hover:opacity-95"
          >
            Régulariser mon abonnement <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <p className="mt-6 rounded-xl bg-surface-hover px-4 py-3 text-sm text-text-secondary">
            Contactez le propriétaire du compte pour régulariser l'abonnement.
          </p>
        )}

        <button
          onClick={() => void signOut()}
          className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-hover"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
