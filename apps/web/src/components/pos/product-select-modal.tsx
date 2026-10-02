'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale de sélection d'unité/conditionnement pour la vente POS (Casier vs Bouteille, Variantes)
 * Permet à la vendeuse de choisir entre le casier (ex: x24) et la bouteille au détail,
 * ou d'ajouter une combinaison casier + bouteilles.
 */

import { useState } from 'react';
import { X, Check, Package } from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { unitDefaultPrice, formatPackBreakdown } from '@wilinwi/types';
import { Button, formatFCFA, formatQty } from '@wilinwi/ui';
import type { CartLine } from './pos-cart-zone';

interface PosProductSelectModalProps {
  product: ProductDto | null;
  onClose: () => void;
  onAddToCart: (line: CartLine) => void;
}

export function PosProductSelectModal({
  product,
  onClose,
  onAddToCart,
}: PosProductSelectModalProps) {
  if (!product) return null;

  const units = product.units ?? [];
  const variants = product.variants ?? [];
  const hasUnits = units.length > 0;
  const hasVariants = variants.length > 0;

  // Par défaut, première unité ou unité de base (bouteille / pièce)
  const [selectedUnitId, setSelectedUnitId] = useState<string>('BASE');
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? '');
  const [quantite, setQuantite] = useState<number>(1);

  // Recherche des objets sélectionnés
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || null;

  // Calcul du prix unitaire selon le conditionnement choisi
  const currentPrice = selectedUnit
    ? unitDefaultPrice(selectedUnit, product.prixCatalogue)
    : product.prixCatalogue;

  const currentLabel = selectedUnit
    ? selectedUnit.label
    : (product.baseUnit ? `Unité (${product.baseUnit})` : 'Bouteille / Détail (1x)');

  const breakdown = hasUnits
    ? formatPackBreakdown(
        product.stock,
        units[0],
        product.baseUnit || 'bouteille',
      )
    : null;

  const handleAdd = () => {
    if (quantite <= 0) return;

    const line: CartLine = {
      product,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant ? Object.values(selectedVariant.attributs).join(', ') : undefined,
      unitId: selectedUnit ? selectedUnit.id : undefined,
      unitLabel: selectedUnit ? selectedUnit.label : undefined,
      unitFactor: selectedUnit ? selectedUnit.factorToBase : 1,
      quantite,
      prixReel: currentPrice,
    };

    onAddToCart(line);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">{product.nom}</h2>
              <p className="text-xs text-slate-500 font-medium">
                {breakdown ? `Stock dispo : ${breakdown.text}` : `Stock dispo : ${formatQty(product.stock)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Sélection Conditionnement : Casier vs Bouteille */}
          {hasUnits && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Mode de vente / Conditionnement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option 1 : Vente au détail (Bouteille) */}
                <button
                  type="button"
                  onClick={() => setSelectedUnitId('BASE')}
                  className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                    selectedUnitId === 'BASE'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {product.baseUnit ? `À l'unité (${product.baseUnit})` : 'Bouteille (détail)'}
                    </span>
                    {selectedUnitId === 'BASE' && <Check className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <span className="text-sm font-black text-slate-800 mt-1">
                    {formatFCFA(product.prixCatalogue)}
                  </span>
                  <span className="text-[10px] text-slate-400">1 unité</span>
                </button>

                {/* Options Conditionnements (ex: Casier 24) */}
                {units.map((u) => {
                  const unitPrice = unitDefaultPrice(u, product.prixCatalogue);
                  const isSelected = selectedUnitId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUnitId(u.id)}
                      className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{u.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <span className="text-sm font-black text-slate-800 mt-1">
                        {formatFCFA(unitPrice)}
                      </span>
                      <span className="text-[10px] text-slate-400">{u.factorToBase} bouteilles</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sélection Variantes si présentes */}
          {hasVariants && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Variante
              </label>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  const label = Object.values(v.attributs).join(', ');
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {label} (Stock: {v.stock})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantité à ajouter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Quantité ({currentLabel})
              </label>
              <div className="flex gap-1.5">
                {[0.5, 1, 2, 5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantite(preset)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors ${
                      quantite === preset
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {preset === 0.5 ? '½' : preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantite((q) => Math.max(0.5, q - (q <= 1 ? 0.5 : 1)))}
                className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center text-lg"
              >
                -
              </button>
              <input
                type="number"
                step="any"
                min="0.1"
                value={quantite}
                onChange={(e) => setQuantite(parseFloat(e.target.value.replace(',', '.')) || 0)}
                className="flex-1 h-11 rounded-2xl border border-slate-200 px-3 text-center font-mono text-base font-black text-slate-900 outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setQuantite((q) => q + (q < 1 ? 0.5 : 1))}
                className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Synthèse Prix & Bouton Ajout */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-400">Total ligne</span>
              <span className="font-mono text-xl font-black text-emerald-600">
                {formatFCFA(currentPrice * quantite)}
              </span>
            </div>

            <Button
              variant="emerald"
              size="lg"
              onClick={handleAdd}
              className="w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-md shadow-emerald-900/20"
            >
              Ajouter au panier
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
