/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Logo Wilinwi pour les documents imprimés (reçu 80 mm, ticket Z, reçu de
 *   remboursement…) : version recadrée « print », ratio réel conservé (760×198) et
 *   chargement immédiat (`priority`) pour qu'il soit présent quand la boîte
 *   d'impression s'ouvre — un logo lazy-loadé sort souvent blanc à l'impression.
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Image from 'next/image';

/** Ratio largeur/hauteur de `/brand/wilinwi-logo-print.png`. */
const LOGO_RATIO = 760 / 198;

export function PrintBrandLogo({ width = 150, className = '' }: { width?: number; className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Image
        src="/brand/wilinwi-logo-print.png"
        alt="Wilinwi"
        width={width}
        height={Math.round(width / LOGO_RATIO)}
        priority
        unoptimized
        className="h-auto max-w-full"
      />
    </div>
  );
}
