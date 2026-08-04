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
          'inline-flex items-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/70 px-3 py-1.5 text-xs font-extrabold text-blue-950 shadow-2xs',
          className,
        )}
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <Store className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="max-w-[150px] truncate">{currentName}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/60 px-3 py-1.5 text-xs font-extrabold text-blue-950 transition-all duration-200 hover:bg-blue-100/80 hover:border-blue-300 shadow-2xs active:scale-95"
        title="Changer d'établissement"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <Store className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="max-w-[150px] truncate">{currentName}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-blue-500 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-2 w-64 overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Sélection de la Boutique
          </div>
          <ul className="max-h-72 overflow-y-auto space-y-1 p-1 scrollbar-none">
            {canSeeAll && (
              <li>
                <button
                  onClick={() => {
                    setOpen(false);
                    if (user?.etablissementId !== 'ALL') void setEtablissement('ALL');
                    onSelect?.();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm rounded-2xl transition-all duration-150 border-b border-slate-100/60',
                    user?.etablissementId === 'ALL' ? 'bg-blue-50 font-bold text-blue-900 shadow-2xs' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <Store className={cn('h-4 w-4 shrink-0', user?.etablissementId === 'ALL' ? 'text-blue-600' : 'text-slate-400')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">Tous les établissements</span>
                    <span className="block truncate text-[11px] font-medium text-slate-400">
                      Vue Globale Consolidée
                    </span>
                  </span>
                  {user?.etablissementId === 'ALL' && <Check className="h-4 w-4 shrink-0 text-blue-600 stroke-[3]" />}
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
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm rounded-2xl transition-all duration-150',
                      active ? 'bg-blue-50 font-bold text-blue-900 shadow-2xs' : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <Store className={cn('h-4 w-4 shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{e.nom}</span>
                      <span className="block truncate text-[11px] font-medium text-slate-400">
                        {ETABLISSEMENT_TYPE_LABELS[e.type] ?? e.type}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-blue-600 stroke-[3]" />}
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
