/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Manifeste PWA (servi par Next.js sur /manifest.webmanifest) : rend
 *   Wilinwi installable sur smartphone (Android « Installer l'application », iOS
 *   « Sur l'écran d'accueil ») et sur ordinateur, en plein écran, avec raccourcis
 *   directs vers la caisse, le stock et les ventes.
 * @created 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Wilinwi — Gestion de commerce',
    short_name: 'Wilinwi',
    description: "Caisse, stock et ventes de votre commerce, même hors ligne. Le système d'exploitation du commerce africain.",
    lang: 'fr',
    dir: 'ltr',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#001d5a',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Caisse', short_name: 'Caisse', url: '/pos?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Stock', short_name: 'Stock', url: '/stock?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Ventes', short_name: 'Ventes', url: '/ventes?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
