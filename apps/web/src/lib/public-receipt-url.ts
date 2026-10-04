/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description URL publique d'un reçu (page `/r/[code]`) — source unique pour les QR
 *   codes du reçu thermique, de la facture PDF et de l'encaissement POS.
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

const FALLBACK_BASE = 'https://wilinwi.nexus-partners.xyz';

/** Base web publique : variable d'env, sinon l'origine courante, sinon la prod. */
export function webBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_BASE_URL ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : FALLBACK_BASE);
  return base.replace(/\/+$/, '');
}

/** Lien vérifiable du reçu : `<base>/r/<code>`. */
export function publicReceiptUrl(code: string): string {
  return `${webBaseUrl()}/r/${encodeURIComponent(code)}`;
}
