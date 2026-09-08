/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Logique pure du contrôleur de synchronisation : classification
 *   d'un échec de création de vente en résultat de protocole (permanence + motif
 *   structuré `kind`). Extraite pour être testable sans NestJS/Prisma.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { HttpException } from '@nestjs/common';
import type { SaleRejectionKind } from '@wilinwi/types';
import { SaleValidationError } from '../pos/sale-validation';

/** Classification d'un échec de synchronisation, pour le résultat par vente. */
export interface ClassifiedSyncError {
  /** Échec permanent (validation métier 4xx) → le client ne doit pas re-tenter. */
  permanent: boolean;
  /** Motif structuré — présent uniquement pour les rejets classés. */
  kind?: SaleRejectionKind;
  /** Message d'erreur lisible. */
  error: string;
}

/**
 * Classe une erreur de création de vente :
 *  - rejet classé (`SaleValidationError`) → motif structuré + permanent ;
 *  - autre 4xx (schéma invalide, scope, garde…) → permanent, sans motif ;
 *  - 5xx / réseau / erreur inconnue → transitoire : l'auto-retry finira par passer.
 */
export function classifySyncError(err: unknown): ClassifiedSyncError {
  const error = err instanceof Error ? err.message : 'Erreur inconnue';
  if (err instanceof SaleValidationError) {
    return { permanent: true, kind: err.kind, error };
  }
  const permanent = err instanceof HttpException && err.getStatus() < 500;
  return { permanent, error };
}
