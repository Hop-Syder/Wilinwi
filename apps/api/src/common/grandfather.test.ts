import { describe, it, expect } from 'vitest';
import { isGrandfathered } from './grandfather';

describe('isGrandfathered — logique grand-père (fonction pure exportée)', () => {
  const now = new Date('2026-09-08T12:00:00Z');
  const past = (days: number) => new Date(now.getTime() - days * 86_400_000);
  const future = (days: number) => new Date(now.getTime() + days * 86_400_000);

  it('grand-père si gatingActivatedAt est null (gating jamais activé)', () => {
    expect(
      isGrandfathered({
        createdAt: past(30),
        grandfatheredUntil: null,
        gatingActivatedAt: null,
        now,
      }),
    ).toBe(true);
  });

  it('grand-père si tenant créé avant gatingActivatedAt', () => {
    const activatedAt = past(7);
    expect(
      isGrandfathered({
        createdAt: past(30),
        grandfatheredUntil: null,
        gatingActivatedAt: activatedAt,
        now,
      }),
    ).toBe(true);
  });

  it('NON grand-père si tenant créé APRÈS gatingActivatedAt', () => {
    const activatedAt = past(7);
    expect(
      isGrandfathered({
        createdAt: past(3),
        grandfatheredUntil: null,
        gatingActivatedAt: activatedAt,
        now,
      }),
    ).toBe(false);
  });

  it('NON grand-père si tenant créé EXACTEMENT à gatingActivatedAt (< strict)', () => {
    const activatedAt = past(7);
    expect(
      isGrandfathered({
        createdAt: activatedAt,
        grandfatheredUntil: null,
        gatingActivatedAt: activatedAt,
        now,
      }),
    ).toBe(false);
  });

  it('grand-père si grandfatheredUntil est dans le futur (override individuel)', () => {
    const activatedAt = past(30);
    const created = past(3);
    expect(
      isGrandfathered({
        createdAt: created,
        grandfatheredUntil: future(7),
        gatingActivatedAt: activatedAt,
        now,
      }),
    ).toBe(true);
  });

  it('NON grand-père si grandfatheredUntil est dans le passé (expiré)', () => {
    const activatedAt = past(30);
    const created = past(3);
    expect(
      isGrandfathered({
        createdAt: created,
        grandfatheredUntil: past(2),
        gatingActivatedAt: activatedAt,
        now,
      }),
    ).toBe(false);
  });

  it("NON grand-père si grandfatheredUntil est null (pas d'override)", () => {
    const activatedAt = past(7);
    expect(
      isGrandfathered({
        createdAt: past(3),
        grandfatheredUntil: null,
        gatingActivatedAt: activatedAt,
        now,
      }),
    ).toBe(false);
  });

  it('grand-père si gating null prime sur tout (même sans override)', () => {
    expect(
      isGrandfathered({
        createdAt: past(3),
        grandfatheredUntil: null,
        gatingActivatedAt: null,
        now,
      }),
    ).toBe(true);
  });
});
