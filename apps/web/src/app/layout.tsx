/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Layout de l'application (Route: app) - Typographie Proposition 1 (Plus Jakarta Sans + Space Grotesk + JetBrains Mono)
 * @created 2026-06-20
 * @updated 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { CurrencyProvider } from '@/lib/currency-context';
import { ServiceWorkerRegister } from '@/lib/sw-register';
import { Analytics } from '@vercel/analytics/next';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Wilinwi — Gérez. Vendez. Grandissez.',
  description: 'La plateforme qui simplifie la gestion du commerce africain.',
  applicationName: 'Wilinwi',
  // PWA : manifeste (src/app/manifest.ts) + icônes d'installation.
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  // iPhone / iPad : « Sur l'écran d'accueil » ouvre Wilinwi en plein écran.
  appleWebApp: {
    capable: true,
    title: 'Wilinwi',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#001d5a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
    >
      <body className="font-sans antialiased text-slate-900 bg-background">
        <ServiceWorkerRegister />
        <AuthProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
