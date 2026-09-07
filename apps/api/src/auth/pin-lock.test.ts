/**
 * Tests unitaires de la politique anti-bruteforce PIN (pure, horloge injectée).
 */
import { describe, expect, it } from 'vitest';
import { MAX_PIN_FAILS, PIN_LOCK_MS, resolvePinAttempt, type PinState } from './pin-lock';

const T0 = Date.UTC(2026, 8, 7, 12, 0, 0); // 2026-09-07T12:00:00Z

describe('resolvePinAttempt — anti-bruteforce PIN', () => {
  it('verrouille après 5 échecs', () => {
    const state: PinState = { failCount: MAX_PIN_FAILS - 1, lockedUntil: null };
    const result = resolvePinAttempt(state, T0, false);
    expect(result).toEqual({
      kind: 'failure',
      nextFailCount: MAX_PIN_FAILS,
      lockUntil: new Date(T0 + PIN_LOCK_MS),
    });
  });

  it('rejette pendant le verrou (message "Trop de tentatives")', () => {
    const lockedUntil = new Date(T0 + PIN_LOCK_MS);
    const state: PinState = { failCount: MAX_PIN_FAILS, lockedUntil };
    const result = resolvePinAttempt(state, T0 + 10_000, false);
    expect(result).toEqual({ kind: 'locked' });
  });

  it('rejette même un PIN correct pendant le verrou (le verrou prime)', () => {
    const lockedUntil = new Date(T0 + PIN_LOCK_MS);
    const state: PinState = { failCount: MAX_PIN_FAILS, lockedUntil };
    const result = resolvePinAttempt(state, T0 + 10_000, true);
    expect(result).toEqual({ kind: 'locked' });
  });

  it('reset complet après succès (même à compteur plein, hors verrou)', () => {
    const state: PinState = { failCount: MAX_PIN_FAILS, lockedUntil: null };
    const result = resolvePinAttempt(state, T0, true);
    expect(result).toEqual({ kind: 'success' });
  });

  it('expire le verrou après 60 s (l’utilisateur peut retenter)', () => {
    const lockedUntil = new Date(T0 + PIN_LOCK_MS);
    const state: PinState = { failCount: MAX_PIN_FAILS, lockedUntil };
    // Juste après l'échéance : plus verrouillé → la tentative est traitée.
    const result = resolvePinAttempt(state, T0 + PIN_LOCK_MS + 1_000, false);
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.nextFailCount).toBe(MAX_PIN_FAILS + 1);
      expect(result.lockUntil).toEqual(new Date(T0 + PIN_LOCK_MS + 1_000 + PIN_LOCK_MS));
    }
  });

  it("n'incrémente le verrou qu'à partir du seuil", () => {
    const state: PinState = { failCount: 0, lockedUntil: null };
    const result = resolvePinAttempt(state, T0, false);
    expect(result).toEqual({ kind: 'failure', nextFailCount: 1, lockUntil: null });
  });
});
