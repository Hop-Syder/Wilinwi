/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Frontières de journée par fuseau horaire (TDR v2 — préférence
 *   `Etablissement.timezone`). Les « ventes du jour », clôtures de caisse et
 *   rapports doivent basculer au minuit DE LA BOUTIQUE, pas à celui du serveur
 *   (Railway = UTC). Fonctions pures (Intl natif, zéro dépendance), mêmes
 *   résultats côté web et API.
 * @created 2026-07-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

/** Fuseau par défaut du marché de lancement (Bénin, UTC+1 sans heure d'été). */
export const DEFAULT_TIMEZONE = 'Africa/Porto-Novo';

/** Décalage (ms) entre l'heure locale du fuseau et l'UTC, à un instant donné. */
function tzOffsetMs(timezone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === '24' ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Instant UTC du minuit LOCAL du fuseau pour la journée courante (ou de `now`).
 * Ex. now = 2026-07-05T00:30Z avec Africa/Porto-Novo (UTC+1) : il est 01:30
 * en boutique → le début de SA journée est 2026-07-04T23:00Z.
 * Fuseau invalide → repli silencieux sur DEFAULT_TIMEZONE.
 */
export function startOfDayInTz(timezone?: string | null, now: Date = new Date()): Date {
  const tz = timezone || DEFAULT_TIMEZONE;
  let offset: number;
  try {
    offset = tzOffsetMs(tz, now);
  } catch {
    offset = tzOffsetMs(DEFAULT_TIMEZONE, now);
  }
  const local = new Date(now.getTime() + offset);
  const midnightLocalAsUTC = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  // Re-résout le décalage AU minuit visé (exact même avec heure d'été).
  let instant = midnightLocalAsUTC - offset;
  try {
    instant = midnightLocalAsUTC - tzOffsetMs(tz, new Date(instant));
  } catch {
    /* repli : premier calcul */
  }
  return new Date(instant);
}

/**
 * Instant UTC du minuit local d'une date calendaire `YYYY-MM-DD` (filtres de
 * rapports : « du 2026-07-01 » = 00:00 de la boutique, pas 00:00 UTC).
 */
export function startOfCalendarDayInTz(dateStr: string, timezone?: string | null): Date {
  // Midi UTC de la date = instant à coup sûr DANS la bonne journée locale
  // quel que soit le fuseau (±14 h max) → on plancher ensuite au minuit local.
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  return startOfDayInTz(timezone, anchor);
}

/** Fin (incluse) de la journée calendaire locale : minuit suivant − 1 ms. */
export function endOfCalendarDayInTz(dateStr: string, timezone?: string | null): Date {
  const start = startOfCalendarDayInTz(dateStr, timezone);
  return new Date(start.getTime() + 86_400_000 - 1);
}

/** Décale une date de `n` jours (pas exacts de 24 h — les fuseaux FCFA n'ont pas d'heure d'été). */
export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86_400_000);
}
