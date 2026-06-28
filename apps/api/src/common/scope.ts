/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Garde-fou de périmètre établissement pour les écritures.
 *   En vue globale « Tous les établissements » (lecture/agrégation seulement),
 *   ou sans établissement courant, une opération scopée ne peut être rattachée
 *   à aucune boutique → on la refuse et on invite à choisir un établissement.
 */
// ──────────────────────────────────

import { BadRequestException } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';

/** Refuse une écriture scopée si l'on n'est pas sur un établissement précis. */
export function assertConcreteEtablissement(ctx: AuthContext): void {
  if (ctx.isGlobalView) {
    throw new BadRequestException(
      'Sélectionnez un établissement précis (vous êtes en vue « Tous les établissements ») pour enregistrer cette opération.',
    );
  }
  if (!ctx.etablissementId) {
    throw new BadRequestException(
      "Aucun établissement courant. Sélectionnez un établissement pour enregistrer cette opération.",
    );
  }
}
