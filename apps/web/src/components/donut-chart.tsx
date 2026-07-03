'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Graphique en anneau (donut) SVG sans dépendance : segments animés,
 *   espacés de 2px, lecture au survol au centre, légende chiffrée fournie par
 *   l'appelant. Palette catégorielle validée (CVD/contraste) — ordre fixe.
 * @created 2026-07-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';

/** Ordre FIXE — ne jamais recycler ni réordonner (identité stable des séries). */
export const DONUT_PALETTE = [
  '#2E5BFF', // bleu
  '#00A86B', // vert
  '#F59E0B', // or
  '#8B5CF6', // violet
  '#0891B2', // cyan
  '#EC4899', // rose
] as const;

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Formatage de la valeur affichée au centre (ex. formatFCFA). */
  format: (v: number) => string;
  /** Libellé sous le total au centre (état repos). */
  centerTitle: string;
  /** Index survolé contrôlé de l'extérieur (synchronisation avec la légende). */
  activeIndex?: number | null;
  onActiveChange?: (i: number | null) => void;
  size?: number;
}

export function DonutChart({
  slices,
  format,
  centerTitle,
  activeIndex = null,
  onActiveChange,
  size = 176,
}: DonutChartProps) {
  // Monté → les arcs passent de 0 à leur longueur réelle (transition CSS).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const stroke = 24;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  // Écart de 2px entre segments (spacer) — seulement s'il y a plusieurs segments.
  const gap = slices.length > 1 ? 2 : 0;

  const active = activeIndex !== null ? slices[activeIndex] : null;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Piste de fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        {slices.map((s, i) => {
          const frac = total > 0 ? s.value / total : 0;
          const len = Math.max(0, frac * C - gap);
          const start = offset;
          offset += frac * C;
          const dimmed = activeIndex !== null && activeIndex !== i;
          return (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={activeIndex === i ? stroke + 4 : stroke}
              strokeLinecap="butt"
              strokeDasharray={`${mounted ? len : 0} ${C - (mounted ? len : 0)}`}
              strokeDashoffset={-start - gap / 2}
              style={{
                transition: `stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1) ${i * 90}ms, stroke-width 0.15s ease, opacity 0.15s ease`,
                opacity: dimmed ? 0.3 : 1,
                cursor: 'pointer',
              }}
              onMouseEnter={() => onActiveChange?.(i)}
              onMouseLeave={() => onActiveChange?.(null)}
            />
          );
        })}
      </svg>

      {/* Centre : total au repos, détail du segment au survol */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {active ? (
          <>
            <span className="max-w-full truncate text-[11px] font-semibold" style={{ color: active.color }}>
              {active.label}
            </span>
            <span className="tabular text-sm font-bold text-slate-900">{format(active.value)}</span>
            <span className="text-[10px] font-medium text-slate-400">
              {total > 0 ? Math.round((active.value / total) * 100) : 0}%
            </span>
          </>
        ) : (
          <>
            <span className="tabular text-sm font-bold text-slate-900">{format(total)}</span>
            <span className="text-[10px] font-medium text-slate-400">{centerTitle}</span>
          </>
        )}
      </div>
    </div>
  );
}
