'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Hook interne (non exporté) : use-min-width.ts
 *   Bascule mobile/desktop pilotée par JS pour les rares cas où le CSS seul
 *   ne suffit pas (choisir *quel composant* monter, pas seulement quelle
 *   classe appliquer — ex. `ClarificationPanel` : BottomSheet vs carte en
 *   ligne, plutôt que de monter les deux et dupliquer leurs effets de bord).
 *   Sans risque d'hydratation : le seul consommateur (`ClarificationPanel`)
 *   ne rend ce choix qu'après une interaction utilisateur post-hydratation
 *   (jamais au premier rendu serveur).
 * @created 2026-09-08
 * @updated 2026-09-09
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';

export function useMinWidth(px: number): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${px}px)`);
    setMatches(mql.matches);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [px]);

  return matches;
}
