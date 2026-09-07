/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Politique anti-bruteforce du PIN (poste partagé), pure et testable
 * @created 2026-09-07
 * @updated 2026-09-07
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export const MAX_PIN_FAILS = 5;
export const PIN_LOCK_MS = 60_000;

/** État persistant de l'anti-bruteforce, porté par la ligne `User`. */
export interface PinState {
  failCount: number;
  lockedUntil: Date | null;
}

/** Verdict d'une tentative de PIN. */
export type PinAttemptResult =
  | { kind: 'locked' }
  | { kind: 'success' }
  | { kind: 'failure'; nextFailCount: number; lockUntil: Date | null };

/**
 * Décide du verdict d'une tentative de PIN à partir de l'état persistant.
 *
 *  - `locked`  : verrou actif (rejeter sans comparer le PIN) ;
 *  - `success` : PIN valide → reset complet côté base ;
 *  - `failure` : PIN invalide → incrément (atomique côté base) + verrou si le
 *    seuil de `MAX_PIN_FAILS` est atteint.
 *
 * L'horloge est injectée (`now`) : aucune dépendance à `Date.now()` global.
 */
export function resolvePinAttempt(
  state: PinState,
  now: number,
  pinValid: boolean,
): PinAttemptResult {
  if (state.lockedUntil && state.lockedUntil.getTime() > now) {
    return { kind: 'locked' };
  }
  if (pinValid) {
    return { kind: 'success' };
  }
  const nextFailCount = state.failCount + 1;
  return {
    kind: 'failure',
    nextFailCount,
    lockUntil: nextFailCount >= MAX_PIN_FAILS ? new Date(now + PIN_LOCK_MS) : null,
  };
}
