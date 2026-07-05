/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tests d'autorisation du garde des capacités d'infrastructure (OT-3).
 * @created 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACTIVE_DUNNING, type AuthContext, type InfraCapability } from '@wilinwi/types';
import { InfraCapabilitiesGuard } from './infra-capabilities.guard';
import { INFRA_ANY_CAPABILITIES_KEY, INFRA_CAPABILITIES_KEY } from './decorators';

function makeCtx(user: AuthContext | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function makeReflector(meta: {
  allOf?: InfraCapability[];
  anyOf?: InfraCapability[];
}): Reflector {
  return {
    getAllAndOverride: (key: string) =>
      key === INFRA_CAPABILITIES_KEY
        ? meta.allOf
        : key === INFRA_ANY_CAPABILITIES_KEY
          ? meta.anyOf
          : undefined,
  } as unknown as Reflector;
}

const baseUser: AuthContext = {
  userId: '00000000-0000-0000-0000-000000000001',
  tenantId: '00000000-0000-0000-0000-0000000000a1',
  role: 'OWNER',
  email: 'owner@wilinwi.test',
  plan: 'PRO',
  modules: ['POS', 'STOCK'],
  etablissementId: '00000000-0000-0000-0000-0000000000c1',
  isGlobalView: false,
  etablissementIds: ['00000000-0000-0000-0000-0000000000c1'],
  infrastructure: 'RETAIL',
  timezone: null,
  infraCapabilities: ['pos.standard', 'stock.simple', 'inventory.basic', 'pricing.floor'],
  subscriptionStatus: 'ACTIVE',
  dunning: ACTIVE_DUNNING,
  isPlatformAdmin: false,
};

describe('InfraCapabilitiesGuard', () => {
  it('laisse passer une route sans métadonnées', () => {
    const guard = new InfraCapabilitiesGuard(makeReflector({}));
    expect(guard.canActivate(makeCtx(baseUser))).toBe(true);
  });

  it('ET : laisse passer quand toutes les capacités requises sont effectives', () => {
    const guard = new InfraCapabilitiesGuard(makeReflector({ allOf: ['pos.standard'] }));
    expect(guard.canActivate(makeCtx(baseUser))).toBe(true);
  });

  it("ET : refuse (403) quand l'établissement n'active pas la capacité", () => {
    const guard = new InfraCapabilitiesGuard(makeReflector({ allOf: ['food.kitchen'] }));
    expect(() => guard.canActivate(makeCtx(baseUser))).toThrow(ForbiddenException);
  });

  it('OU : laisse passer si au moins une capacité est effective (POS partagé)', () => {
    const guard = new InfraCapabilitiesGuard(
      makeReflector({ anyOf: ['pos.standard', 'pos.touch', 'pos.service', 'pos.wholesale'] }),
    );
    expect(guard.canActivate(makeCtx(baseUser))).toBe(true);
  });

  it('OU : refuse (403) si aucune capacité de la liste — ex. dunning J+30 (aucune capacité)', () => {
    const guard = new InfraCapabilitiesGuard(
      makeReflector({ anyOf: ['pos.standard', 'pos.touch', 'pos.service', 'pos.wholesale'] }),
    );
    const blocked: AuthContext = { ...baseUser, infraCapabilities: [] };
    expect(() => guard.canActivate(makeCtx(blocked))).toThrow(ForbiddenException);
  });

  it('ET + OU combinés : les deux conditions doivent tenir', () => {
    const guard = new InfraCapabilitiesGuard(
      makeReflector({ allOf: ['pricing.floor'], anyOf: ['pos.standard', 'pos.touch'] }),
    );
    expect(guard.canActivate(makeCtx(baseUser))).toBe(true);
    const sansPos: AuthContext = { ...baseUser, infraCapabilities: ['pricing.floor'] };
    expect(() => guard.canActivate(makeCtx(sansPos))).toThrow(ForbiddenException);
  });

  it('refuse un utilisateur non authentifié', () => {
    const guard = new InfraCapabilitiesGuard(makeReflector({ allOf: ['pos.standard'] }));
    expect(() => guard.canActivate(makeCtx(undefined))).toThrow(ForbiddenException);
  });
});
