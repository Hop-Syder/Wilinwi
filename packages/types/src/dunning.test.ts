import { describe, expect, it } from 'vitest';
import { computeDunning } from './dunning.js';

const base = new Date('2026-06-27T12:00:00Z');
const daysAgo = (n: number) => new Date(base.getTime() - n * 86_400_000);

describe('computeDunning', () => {
  it('à jour (non PAST_DUE) → aucune restriction', () => {
    const s = computeDunning('ACTIVE', null, base);
    expect(s.stage).toBe('ACTIVE');
    expect(s.suspendNonVital).toBe(false);
    expect(s.downgraded).toBe(false);
    expect(s.posBlocked).toBe(false);
  });

  it('J+0 → WARNING, rien de suspendu', () => {
    const s = computeDunning('PAST_DUE', daysAgo(0), base);
    expect(s.stage).toBe('WARNING');
    expect(s.suspendNonVital).toBe(false);
    expect(s.downgraded).toBe(false);
  });

  it('J+3 → READ_ONLY (non-vital suspendu, mode lecture seule actif)', () => {
    const s = computeDunning('PAST_DUE', daysAgo(3), base);
    expect(s.stage).toBe('READ_ONLY');
    expect(s.suspendNonVital).toBe(true);
    expect(s.isReadOnly).toBe(true);
    expect(s.downgraded).toBe(false);
    expect(s.posBlocked).toBe(false);
  });

  it('J+7 → DOWNGRADED (Starter, non bloquant)', () => {
    const s = computeDunning('PAST_DUE', daysAgo(7), base);
    expect(s.stage).toBe('DOWNGRADED');
    expect(s.downgraded).toBe(true);
    expect(s.posBlocked).toBe(false);
  });

  it('J+30 → BLOCKED (caisse bloquée)', () => {
    const s = computeDunning('PAST_DUE', daysAgo(30), base);
    expect(s.stage).toBe('BLOCKED');
    expect(s.downgraded).toBe(true);
    expect(s.posBlocked).toBe(true);
    expect(s.daysOverdue).toBe(30);
  });

  it('PAST_DUE sans date → traité comme J+0', () => {
    expect(computeDunning('PAST_DUE', null, base).stage).toBe('WARNING');
  });
});
