/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Console super-admin Wilinwi — layout racine.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans' 
});
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Wilinwi — Console Plateforme',
  description: 'Console super-admin Wilinwi (Nexus Partners).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${plusJakartaSans.variable} ${dmMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
