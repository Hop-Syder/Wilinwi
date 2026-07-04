/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tests du garde des routes non vitales (dunning J+3 côté API).
 * @created 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACTIVE_DUNNING, computeDunning, type AuthContext } from '@wilinwi/types';
import { NonVitalGuard } from './non-vital.guard';

const DAY_MS = 86_400_000;

function makeCtx(user: AuthContext | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function makeReflector(nonVital: boolean | undefined): Reflector {
  return { getAllAndOverride: () => nonVital } as unknown as Reflector;
}

const baseUser: AuthContext = {
  userId: '00000000-0000-0000-0000-000000000001',
  tenantId: '00000000-0000-0000-0000-0000000000a1',
  role: 'OWNER',
  email: 'owner@wilinwi.test',
  plan: 'PRO',
  modules: ['POS', 'STOCK', 'ANALYTICS'],
  etablissementId: '00000000-0000-0000-0000-0000000000c1',
  isGlobalView: false,
  etablissementIds: ['00000000-0000-0000-0000-0000000000c1'],
  infrastructure: 'RETAIL',
  infraCapabilities: ['pos.standard', 'stock.simple', 'inventory.basic', 'pricing.floor'],
  subscriptionStatus: 'ACTIVE',
  dunning: ACTIVE_DUNNING,
  isPlatformAdmin: false,
};

describe('NonVitalGuard (dunning J+3 côté API)', () => {
  it('route sans @NonVital → toujours autorisée', () => {
    const guard = new NonVitalGuard(makeReflector(undefined));
    expect(guard.canActivate(makeCtx(baseUser))).toBe(true);
  });

  it('abonnement à jour → route non vitale autorisée', () => {
    const guard = new NonVitalGuard(makeReflector(true));
    expect(guard.canActivate(makeCtx(baseUser))).toBe(true);
  });

  it('impayé J+3 (RESTRICTED) → route non vitale refusée (403)', () => {
    const dunning = computeDunning('PAST_DUE', new Date(Date.now() - 3 * DAY_MS));
    const guard = new NonVitalGuard(makeReflector(true));
    expect(() =>
      guard.canActivate(makeCtx({ ...baseUser, subscriptionStatus: 'PAST_DUE', dunning })),
    ).toThrow(ForbiddenException);
  });

  it('impayé J+0 (WARNING) → route non vitale encore autorisée', () => {
    const dunning = computeDunning('PAST_DUE', new Date());
    const guard = new NonVitalGuard(makeReflector(true));
    expect(
      guard.canActivate(makeCtx({ ...baseUser, subscriptionStatus: 'PAST_DUE', dunning })),
    ).toBe(true);
  });
});
