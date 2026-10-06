'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Prix négociable d'une ligne de panier POS, borné par la fourchette du
 *   produit (prix minimum ≤ prix ≤ prix de vente — `salePriceBounds`, même règle que
 *   le serveur). Affiche « min. 5 900 » et la remise accordée ; un appui ouvre un
 *   sélecteur : raccourcis (6 000 · 5 950 · 5 900), −/+ et saisie libre, toujours
 *   ramenés dans la fourchette.
 * @created 2026-10-06
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

  return (
    <>
      <button
        type="button"
        disabled={disabled || !negotiable}
        onClick={() => setOpen(true)}
        className={`group mt-0.5 flex flex-col items-start text-left ${negotiable && !disabled ? 'cursor-pointer' : 'cursor-default'}`}
        title={negotiable ? 'Ajuster le prix (entre le minimum et le prix de vente)' : undefined}
      >
        <span
          className={`flex items-center gap-1 font-mono text-xs font-black ${
            status === 'ok' ? 'text-slate-700' : 'text-rose-600'
          }`}
        >
          {formatFCFA(line.prixReel)}
          {suffix && <span className="font-sans text-[10px] font-semibold text-slate-400">/ {suffix}</span>}
          {negotiable && !disabled && (
            <Pencil className="h-3 w-3 text-slate-300 transition-colors group-hover:text-blue-600" />
          )}
        </span>
        {negotiable && (
          <span className="text-[10px] font-semibold text-slate-400">
            min. {formatFCFA(bounds.min)}
            {status === 'ok' && remise > 0 && (
              <span className="ml-1 rounded bg-amber-50 px-1 font-bold text-amber-700">−{formatFCFA(remise)}</span>
            )}
            {status !== 'ok' && <span className="ml-1 font-bold text-rose-600">hors fourchette</span>}
          </span>
        )}
      </button>

      {open && (
        <PriceSheet
          title={line.unitLabel ? `${line.product.nom} — ${line.unitLabel}` : line.product.nom}
          value={line.prixReel}
          bounds={bounds}
          onClose={() => setOpen(false)}
          onConfirm={(p) => {
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
