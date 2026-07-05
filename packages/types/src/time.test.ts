/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tests des frontières de journée par fuseau (time.ts).
 * @created 2026-07-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  addDays,
  endOfCalendarDayInTz,
  startOfCalendarDayInTz,
  startOfDayInTz,
} from './time.js';

describe('startOfDayInTz', () => {
  it('Porto-Novo (UTC+1) : à 00:30Z il est 01:30 en boutique → journée ouverte à 23:00Z la veille', () => {
    const now = new Date('2026-07-05T00:30:00Z');
    expect(startOfDayInTz('Africa/Porto-Novo', now).toISOString()).toBe(
      '2026-07-04T23:00:00.000Z',
    );
  });

  it('Porto-Novo : à 22:30Z on est encore le même jour local → minuit local du jour', () => {
    const now = new Date('2026-07-04T22:30:00Z');
    expect(startOfDayInTz('Africa/Porto-Novo', now).toISOString()).toBe(
      '2026-07-03T23:00:00.000Z',
    );
  });

  it('UTC : minuit UTC', () => {
    const now = new Date('2026-07-05T10:00:00Z');
    expect(startOfDayInTz('UTC', now).toISOString()).toBe('2026-07-05T00:00:00.000Z');
  });

  it('Abidjan (UTC+0) ≠ Porto-Novo (UTC+1) pour le même instant', () => {
    const now = new Date('2026-07-05T00:30:00Z');
    expect(startOfDayInTz('Africa/Abidjan', now).toISOString()).toBe(
      '2026-07-05T00:00:00.000Z',
    );
    expect(startOfDayInTz('Africa/Porto-Novo', now).toISOString()).toBe(
      '2026-07-04T23:00:00.000Z',
    );
  });

  it('fuseau invalide ou absent → repli Africa/Porto-Novo', () => {
    const now = new Date('2026-07-05T00:30:00Z');
    expect(startOfDayInTz('Pays/Inconnu', now).toISOString()).toBe('2026-07-04T23:00:00.000Z');
    expect(startOfDayInTz(null, now).toISOString()).toBe('2026-07-04T23:00:00.000Z');
  });
});

describe('startOfCalendarDayInTz / endOfCalendarDayInTz', () => {
  it('« du 2026-07-01 » = minuit local de la boutique, pas minuit UTC', () => {
    expect(startOfCalendarDayInTz('2026-07-01', 'Africa/Porto-Novo').toISOString()).toBe(
      '2026-06-30T23:00:00.000Z',
    );
    expect(endOfCalendarDayInTz('2026-07-01', 'Africa/Porto-Novo').toISOString()).toBe(
      '2026-07-01T22:59:59.999Z',
    );
  });
});

describe('addDays', () => {
  it('pas exacts de 24 h', () => {
    const d = new Date('2026-07-05T23:00:00Z');
    expect(addDays(d, -6).toISOString()).toBe('2026-06-29T23:00:00.000Z');
  });
});
