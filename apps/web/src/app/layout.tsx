/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Layout de l'application (Route: app)
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { Metadata } from 'next';
import { Urbanist, Outfit, DM_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { CurrencyProvider } from '@/lib/currency-context';
import { ServiceWorkerRegister } from '@/lib/sw-register';
import { Analytics } from '@vercel/analytics/next';

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-display',
});
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Wilinwi — Gérez. Vendez. Grandissez.',
  description: 'La plateforme qui simplifie la gestion du commerce africain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${urbanist.variable} ${outfit.variable} ${dmMono.variable}`}>
      <body>
        <ServiceWorkerRegister />
        <AuthProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
