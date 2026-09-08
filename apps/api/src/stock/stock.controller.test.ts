/**
 * Test de cohérence rôle/route (régression BUG-001, audit indépendant) :
 * lit les métadonnées `@RequireCapabilities` réellement posées sur les
 * routes de lecture du catalogue — le mécanisme exact utilisé par
 * `CapabilitiesGuard` — et vérifie que CASHIER possède chaque capacité
 * exigée. Ce test aurait détecté BUG-001 (stock:read manquant pour CASHIER)
 * avant livraison, sans navigateur ni base de données.
 */
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { hasCapability, type Capability } from '@wilinwi/types';
import { CAPABILITIES_KEY } from '../common/decorators';
import { StockController } from './stock.controller';

describe('StockController — cohérence rôle/route pour CASHIER', () => {
  it('CASHIER a la capacité requise par chaque route de lecture dont dépend la caisse manuelle', () => {
    const readRoutes = ['list', 'search', 'alerts', 'getProduct', 'movements'] as const;

    for (const method of readRoutes) {
      const required: Capability[] =
        Reflect.getMetadata(CAPABILITIES_KEY, StockController.prototype[method]) ?? [];
      expect(required.length, `StockController.${method} devrait exiger au moins une capacité`).toBeGreaterThan(0);

      for (const cap of required) {
        expect(
          hasCapability('CASHIER', cap),
          `CASHIER doit avoir '${cap}' pour StockController.${method} (sinon la caisse manuelle est cassée pour ce rôle)`,
        ).toBe(true);
      }
    }
  });
});
