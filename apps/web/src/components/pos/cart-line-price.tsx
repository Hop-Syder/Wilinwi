'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Prix SAISISSABLE d'une ligne de panier POS, borné par la fourchette du
 *   produit (prix minimum ≤ prix ≤ prix de vente — `salePriceBounds`, même règle que
 *   le serveur). Champ de saisie directe dans la ligne (refus hors fourchette, motif
 *   affiché) + « min. 5 900 » et remise ; le crayon ouvre un sélecteur de raccourcis
 *   (6 000 · 5 950 · 5 900, −/+).
 * @created 2026-10-06
 * @updated 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import { Minus, Pencil, Plus, X } from 'lucide-react';
import { checkSalePrice, salePriceBounds, type ProductDto, type SalePriceBounds } from '@wilinwi/types';
import { formatFCFA } from '@wilinwi/ui';

/** Fourchette de prix d'une ligne de panier (conditionnement compris). */
export function cartLineBounds(line: { product: ProductDto; unitId?: string }): SalePriceBounds {
  const unit = line.unitId ? line.product.units?.find((u) => u.id === line.unitId) : null;
  return salePriceBounds(line.product, unit);
}

/** Pas d'ajustement adapté à l'écart (bouteille : 5 F ; casier : 25 F…). */
function priceStep(b: SalePriceBounds): number {
  const range = b.max - b.min;
  if (range <= 20) return 5;
  if (range <= 200) return 25;
  if (range <= 1000) return 50;
  return 100;
}

const clamp = (v: number, b: SalePriceBounds) => Math.min(b.max, Math.max(b.min, Math.round(v)));

interface CartLinePriceProps {
  line: { product: ProductDto; unitId?: string; unitLabel?: string; prixReel: number };
  onChange: (price: number) => void;
  disabled?: boolean;
  /** Suffixe d'unité (« / kg ») pour les produits au poids/volume. */
  suffix?: string | null;
}

export function CartLinePrice({ line, onChange, disabled, suffix }: CartLinePriceProps) {
  const [open, setOpen] = useState(false);
  const bounds = cartLineBounds(line);
  const status = checkSalePrice(line.prixReel, bounds);
  const remise = bounds.max - line.prixReel;
  const negotiable = bounds.max > bounds.min;

  // Saisie directe du prix dans la ligne : brouillon libre pendant la frappe,
  // validé à la sortie du champ / Entrée. Hors fourchette → refusé, on revient
  // au prix précédent avec le motif affiché (jamais d'arrondi silencieux).
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(line.prixReel));
  const [refused, setRefused] = useState<string | null>(null);
  useEffect(() => {
    if (!focused) setDraft(String(line.prixReel));
  }, [line.prixReel, focused]);

  const parsed = Math.round(Number(draft.replace(/\s/g, '').replace(',', '.')));
  const draftStatus = Number.isFinite(parsed) && draft.trim() !== '' ? checkSalePrice(parsed, bounds) : 'low';

  function commit() {
    setFocused(false);
    if (draftStatus === 'ok') {
      setRefused(null);
      if (parsed !== line.prixReel) onChange(parsed);
      return;
    }
    setRefused(
      !negotiable
        ? 'Prix fixe : aucun prix minimum défini pour ce produit (à fixer dans Stock › fiche produit)'
        : draftStatus === 'high'
          ? `Refusé : maximum ${formatFCFA(bounds.max)}`
          : `Refusé : minimum ${formatFCFA(bounds.min)}`,
    );
    setDraft(String(line.prixReel));
  }

  if (disabled) {
    return (
      <p className={`mt-0.5 font-mono text-xs font-black ${status === 'ok' ? 'text-slate-700' : 'text-rose-600'}`}>
        {formatFCFA(line.prixReel)}
        {suffix && <span className="font-sans text-[10px] font-semibold text-slate-400"> / {suffix}</span>}
      </p>
    );
  }

  return (
    <>
      <div className="mt-1 flex items-center gap-1">
        <div
          className={`flex h-7 items-center rounded-lg border bg-white pr-1.5 transition-colors ${
            focused
              ? draftStatus === 'ok'
                ? 'border-blue-600 ring-2 ring-blue-600/15'
                : 'border-rose-400 ring-2 ring-rose-400/15'
              : status === 'ok'
                ? 'border-slate-200 hover:border-slate-300'
                : 'border-rose-400'
          }`}
        >
          <input
            type="text"
            inputMode="numeric"
            aria-label={
              negotiable
                ? `Prix négocié (entre ${bounds.min} et ${bounds.max} FCFA)`
                : `Prix de vente (${bounds.max} FCFA, pas de fourchette)`
            }
            value={draft}
            onFocus={(e) => {
              setFocused(true);
              setRefused(null);
              e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setDraft(String(line.prixReel));
                e.currentTarget.blur();
              }
            }}
            className={`h-full w-[68px] rounded-lg bg-transparent px-1.5 text-right font-mono text-xs font-black outline-none ${
              (focused ? draftStatus : status) === 'ok' ? 'text-slate-800' : 'text-rose-600'
            }`}
          />
          <span className="text-[10px] font-semibold text-slate-400">F{suffix ? ` / ${suffix}` : ''}</span>
        </div>
        {negotiable && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-700"
          title="Choisir un prix (raccourcis)"
          aria-label="Choisir un prix dans la fourchette"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        )}
      </div>
      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
        {refused ? (
          <span className="font-bold text-rose-600">{refused}</span>
        ) : !negotiable ? (
          <span>prix fixe — pas de prix minimum défini</span>
        ) : focused ? (
          <>
            entre {formatFCFA(bounds.min)} et {formatFCFA(bounds.max)}
          </>
        ) : (
          <>
            min. {formatFCFA(bounds.min)}
            {status === 'ok' && remise > 0 && (
              <span className="ml-1 rounded bg-amber-50 px-1 font-bold text-amber-700">−{formatFCFA(remise)}</span>
            )}
            {status !== 'ok' && <span className="ml-1 font-bold text-rose-600">hors fourchette</span>}
          </>
        )}
      </p>

      {open && (
        <PriceSheet
          title={line.unitLabel ? `${line.product.nom} — ${line.unitLabel}` : line.product.nom}
          value={line.prixReel}
          bounds={bounds}
          onClose={() => setOpen(false)}
          onConfirm={(p) => {
            setRefused(null);
            onChange(p);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function PriceSheet({
  title,
  value,
  bounds,
  onClose,
  onConfirm,
}: {
  title: string;
  value: number;
  bounds: SalePriceBounds;
  onClose: () => void;
  onConfirm: (price: number) => void;
}) {
  const step = priceStep(bounds);
  const [draft, setDraft] = useState(String(clamp(value, bounds)));
  const parsed = Math.round(Number(draft.replace(/\s/g, '').replace(',', '.')));
  const valid = Number.isFinite(parsed) && checkSalePrice(parsed, bounds) === 'ok';
  const current = Number.isFinite(parsed) ? parsed : bounds.max;

  // Raccourcis : prix de vente, milieu (arrondi au pas), minimum — sans doublon.
  const mid = Math.round((bounds.min + bounds.max) / 2 / step) * step;
  const presets = [...new Set([bounds.max, clamp(mid, bounds), bounds.min])];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-xs sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Prix accordé</p>
            <p className="truncate text-sm font-extrabold text-slate-900">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">
            Minimum <b className="font-mono text-slate-900">{formatFCFA(bounds.min)}</b>
          </span>
          <span className="text-slate-500">
            Prix de vente <b className="font-mono text-slate-900">{formatFCFA(bounds.max)}</b>
          </span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDraft(String(p))}
              className={`rounded-xl border px-2 py-2.5 font-mono text-sm font-black transition-colors ${
                current === p
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {formatFCFA(p).replace(/\s?FCFA$/, '')}
            </button>
          ))}
        </div>

        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDraft(String(clamp(current - step, bounds)))}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            aria-label={`Baisser de ${step} F`}
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) onConfirm(parsed);
            }}
            className={`h-11 flex-1 rounded-2xl border px-3 text-center font-mono text-lg font-black outline-none ${
              valid ? 'border-slate-200 text-slate-900 focus:border-blue-600' : 'border-rose-300 text-rose-600'
            }`}
          />
          <button
            type="button"
            onClick={() => setDraft(String(clamp(current + step, bounds)))}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            aria-label={`Monter de ${step} F`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className={`mb-4 min-h-4 text-xs font-semibold ${valid ? 'text-amber-700' : 'text-rose-600'}`}>
          {!valid
            ? `Le prix doit être compris entre ${formatFCFA(bounds.min)} et ${formatFCFA(bounds.max)}.`
            : parsed < bounds.max
              ? `Remise de ${formatFCFA(bounds.max - parsed)} — le nom du client sera demandé à l'encaissement.`
              : ''}
        </p>

        <button
          type="button"
          disabled={!valid}
          onClick={() => onConfirm(parsed)}
          className="w-full rounded-2xl bg-blue-700 py-3 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Appliquer ce prix
        </button>
      </div>
    </div>
  );
}
