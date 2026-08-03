/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Carte Produit Tactile pour le Catalogue POS (Axe 2 : Stock, Formattage FCFA & Feedback visuel)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package, Check } from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { formatFCFA, formatQty } from '@wilinwi/ui';

interface ProductGridCardProps {
  product: ProductDto;
  onSelect: (product: ProductDto) => void;
  disabled?: boolean;
}

export function ProductGridCard({ product, onSelect, disabled }: ProductGridCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  const stock = product.stock ?? 0;
  const seuil = product.seuilAlerte ?? 5;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= seuil;

  const handleTap = () => {
    if (disabled || isOutOfStock) return;
    onSelect(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 350);
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={disabled || isOutOfStock}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 select-none ${
        justAdded
          ? 'scale-95 border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-400'
          : isOutOfStock
            ? 'border-slate-200 bg-slate-100/70 opacity-60 cursor-not-allowed'
            : 'border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md active:scale-95'
      }`}
    >
      {/* Visual Indicator of Stock (Top Right Badge) */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-2xs ${
            isOutOfStock
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : isLowStock
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          {isOutOfStock ? 'Rupture' : `${formatQty(stock)} en stock`}
        </span>
      </div>

      {/* Product Image / Icon */}
      <div className="relative mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
        {product.photos && product.photos.length > 0 ? (
          <Image
            src={product.photos[0]}
            alt={product.nom}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <Package className="h-9 w-9 text-slate-300 transition-transform duration-300 group-hover:scale-110" />
        )}

        {/* Instant Added Overlay */}
        {justAdded && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/30 backdrop-blur-2xs transition-all">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg animate-bounce">
              <Check className="h-6 w-6 stroke-[3]" />
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-1">
        <h3 className="line-clamp-2 text-xs font-bold text-slate-900 group-hover:text-emerald-700 leading-snug">
          {product.nom}
        </h3>
        {product.sku && (
          <p className="text-[10px] font-mono text-slate-400 truncate">
            SKU: {product.sku}
          </p>
        )}
      </div>

      {/* Price Section */}
      <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-slate-100">
        <span className="font-mono text-sm font-black text-slate-900 group-hover:text-emerald-600">
          {formatFCFA(product.prixCatalogue)}
        </span>
        {product.variants && product.variants.length > 0 && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
            {product.variants.length} var.
          </span>
        )}
      </div>
    </button>
  );
}
