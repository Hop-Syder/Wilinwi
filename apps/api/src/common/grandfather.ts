/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Logique grand-père (grandfathering) — fonction pure exportée.
 * @created 2026-09-08
 */

/**
 * Détermine si un tenant est « grand-père » (limites numériques non enforced).
 *
 * Un tenant est grand-père si :
 *  1) gatingActivatedAt est null (gating pas encore activé globalement), OU
 *  2) le tenant a été créé avant gatingActivatedAt, OU
 *  3) grandfatheredUntil (override par tenant) est dans le futur.
 */
export function isGrandfathered(args: {
  createdAt: Date;
  grandfatheredUntil: Date | null;
  gatingActivatedAt: Date | null;
  now: Date;
}): boolean {
  const { createdAt, grandfatheredUntil, gatingActivatedAt, now } = args;
  return (
    gatingActivatedAt === null ||
    createdAt < gatingActivatedAt ||
    (grandfatheredUntil !== null && grandfatheredUntil > now)
  );
}
