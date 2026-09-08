/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : search-input.tsx
 *   Extrait le motif dupliqué (icône recherche + input `pl-9`) trouvé
 *   indépendamment dans 5 écrans (caisse, stock, entrepôt, clients, journal).
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../cn.js';
import { Input, type InputProps } from './input.js';

export interface SearchInputProps extends InputProps {
  /** Affiche un bouton d'effacement quand une valeur est présente. */
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, ...props }, ref) => {
    const hasValue = typeof value === 'string' ? value.length > 0 : Boolean(value);
    return (
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          ref={ref}
          value={value}
          className={cn('pl-9', onClear && hasValue && 'pr-9', className)}
          {...props}
        />
        {onClear && hasValue && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-surface-hover hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';
