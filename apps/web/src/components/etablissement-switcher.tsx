'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Sélecteur d'établissement courant. Bascule instantanée (sans
 *   reconnexion) : écrit l'en-tête X-Etablissement-Id et rafraîchit les données.
 *   Un seul établissement → simple libellé ; plusieurs → menu déroulant.
 */

import { useEffect, useRef, useState } from 'react';
import { Store, Check, ChevronDown } from 'lucide-react';
import { ETABLISSEMENT_TYPE_LABELS } from '@wilinwi/types';
import { cn } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';

export function EtablissementSwitcher({
  className,
  onSelect,
}: {
  className?: string;
  /** Appelé UNIQUEMENT quand une boutique est choisie (ex. fermer le drawer mobile). */
  onSelect?: () => void;
}) {
  const { user, setEtablissement } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const etabs = user?.etablissements ?? [];
  if (etabs.length === 0) return null;

  const isOwner = user?.role === 'OWNER';
  const canSeeAll = isOwner && etabs.length >= 2;

  const current = etabs.find((e) => e.id === user?.etablissementId) ?? null;
  const currentName = user?.etablissementId === 'ALL' && canSeeAll ? 'Tous les établissements' : (current?.nom ?? etabs[0]?.nom);

  // Un seul établissement : pas de menu, simple badge.
  if (etabs.length === 1) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-primary',
          className,
        )}
      >
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="max-w-[140px] truncate">{currentName}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface-hover"
        title="Changer d'établissement"
      >
        <Store className="h-3.5 w-3.5 text-primary" />
        <span className="max-w-[140px] truncate">{currentName}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-text-secondary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary/70">
            Établissements
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {canSeeAll && (
              <li>
                <button
                  onClick={() => {
                    setOpen(false);
                    if (user?.etablissementId !== 'ALL') void setEtablissement('ALL');
                    onSelect?.();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors border-b border-border/50',
                    user?.etablissementId === 'ALL' ? 'bg-primary/5 font-semibold text-primary' : 'text-text-primary hover:bg-surface-hover',
                  )}
                >
                  <Store className={cn('h-4 w-4 shrink-0', user?.etablissementId === 'ALL' ? 'text-primary' : 'text-text-secondary/60')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">Tous les établissements</span>
                    <span className="block truncate text-[11px] font-normal text-text-secondary">
                      Vue Globale Consolidée
                    </span>
                  </span>
                  {user?.etablissementId === 'ALL' && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              </li>
            )}
            {etabs.map((e) => {
              const active = e.id === user?.etablissementId;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      if (!active) void setEtablissement(e.id);
                      onSelect?.();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
                      active ? 'bg-primary/5 font-semibold text-primary' : 'text-text-primary hover:bg-surface-hover',
                    )}
                  >
                    <Store className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-text-secondary/60')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{e.nom}</span>
                      <span className="block truncate text-[11px] font-normal text-text-secondary">
                        {ETABLISSEMENT_TYPE_LABELS[e.type] ?? e.type}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
