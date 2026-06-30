/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Console super-admin Wilinwi — layout racine.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import type { Metadata } from 'next';
import { Inter, Poppins, DM_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Wilinwi — Console Plateforme',
  description: 'Console super-admin Wilinwi (Nexus Partners).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable} ${dmMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
