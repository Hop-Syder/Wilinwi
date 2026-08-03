/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Zone Catalogue & Recherche POS (Axe 2 : Omnibox, Pills Catégories & Grille Produit 2/3)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useMemo, useState, forwardRef } from 'react';
import { Search, Tag, Camera, AlertTriangle, PackageX } from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { ProductGridCard } from './product-grid-card';

interface PosCatalogZoneProps {
  products: ProductDto[];
  query: string;
  onQueryChange: (val: string) => void;
  onSelectProduct: (product: ProductDto) => void;
  onOpenScanner: () => void;
  disabled?: boolean;
}

export const PosCatalogZone = forwardRef<HTMLInputElement, PosCatalogZoneProps>(
  function PosCatalogZone(
    { products, query, onQueryChange, onSelectProduct, onOpenScanner, disabled },
    ref
  ) {
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    // Liste unique des catégories
    const categories = useMemo(() => {
      const set = new Set<string>();
      products.forEach((p) => {
        if (p.categorie && p.categorie.trim()) {
          set.add(p.categorie.trim());
        }
      });
      return Array.from(set).sort();
    }, [products]);

    // Filtrage dynamique
    const filteredProducts = useMemo(() => {
      return products.filter((p) => {
        // Filtrage catégorie
        if (selectedCategory !== 'ALL' && p.categorie !== selectedCategory) {
          return false;
        }

        // Recherche Omnibox (Nom, SKU ou code-barres)
        if (query.trim()) {
          const q = query.toLowerCase().trim();
          const matchNom = p.nom.toLowerCase().includes(q);
          const matchSku = p.sku?.toLowerCase().includes(q);
          const matchCat = p.categorie?.toLowerCase().includes(q);
          if (!matchNom && !matchSku && !matchCat) return false;
        }

        return true;
      });
    }, [products, selectedCategory, query]);

    return (
      <div className="flex flex-col h-full space-y-4">
        {/* Omnibox de Recherche Universelle (F2) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={ref}
              type="text"
              placeholder="Rechercher ou scanner code-barres (F2)..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-12 py-3 text-sm font-semibold text-slate-900 shadow-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Scanner Caméra Mobile / Tablette */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex h-11.5 w-11.5 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
            title="Scanner Caméra"
          >
            <Camera className="h-5 w-5 text-emerald-600" />
          </button>
        </div>

        {/* Bandeau de Filtres par Catégories (Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Toutes ({products.length})</span>
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.categorie === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grille de Produits Responsives */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                  disabled={disabled}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <PackageX className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">Aucun produit trouvé</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {query
                  ? `Aucun résultat pour « ${query} ». Essayez un autre terme de recherche.`
                  : 'Aucun produit disponible dans cette catégorie.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);
