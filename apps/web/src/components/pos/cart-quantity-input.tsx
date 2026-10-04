'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Sélecteur de quantité tactile et saisie manuelle fluide (support décimales : 1,5, 1.25, 0.75, etc.)
 */

import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatQty } from '@wilinwi/ui';

interface CartQuantityInputProps {
  value: number;
  onChange: (newValue: number) => void;
  onDelta: (delta: number) => void;
  size?: 'sm' | 'md';
}

export function CartQuantityInput({
  value,
  onChange,
  onDelta,
  size = 'md',
}: CartQuantityInputProps) {
  const [text, setText] = useState<string>(() => formatQty(value));

  // Synchronisation si la valeur change de l'extérieur (bouton + / - ou réinitialisation)
  useEffect(() => {
    setText(formatQty(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const cleaned = raw.trim().replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(Number(parsed.toFixed(3)));
    }
  };

  const handleBlur = () => {
    const cleaned = text.trim().replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || parsed <= 0) {
      // Valeur invalide ou vide -> rétablir la valeur actuelle
      setText(formatQty(value));
    } else {
      const fixed = Number(parsed.toFixed(3));
      onChange(fixed);
      setText(formatQty(fixed));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Calcul du delta adapté selon la valeur courante
  const handleDecrement = () => {
    if (value <= 1 && value > 0.5) {
      onDelta(-0.25);
    } else if (value <= 0.5 && value > 0.25) {
      onDelta(-0.25);
    } else {
      onDelta(-1);
    }
  };

  const handleIncrement = () => {
    if (value < 1) {
      onDelta(0.5);
    } else {
      onDelta(1);
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={`flex items-center rounded-xl border border-slate-200 bg-slate-50 ${isSm ? 'p-0.5' : 'p-1'}`}>
      <button
        type="button"
        onClick={handleDecrement}
        className={`${
          isSm ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-lg'
        } flex items-center justify-center bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95 transition-all`}
        title="Diminuer"
        aria-label="Diminuer quantité"
      >
        <Minus className={isSm ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>

      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.target.select()}
        className={`${
          isSm ? 'w-12 text-xs' : 'w-14 text-sm'
        } text-center font-mono font-black text-slate-900 bg-transparent outline-none border-b border-transparent focus:border-emerald-500 focus:bg-emerald-50/60 rounded px-1 transition-all`}
        title="Cliquer pour saisir manuellement"
        aria-label="Quantité"
      />

      <button
        type="button"
        onClick={handleIncrement}
        className={`${
          isSm ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-lg'
        } flex items-center justify-center bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95 transition-all`}
        title="Augmenter"
        aria-label="Augmenter quantité"
      >
        <Plus className={isSm ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  );
}
