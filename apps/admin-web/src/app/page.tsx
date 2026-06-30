'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Console admin — redirige vers /platform (ou /login si non connecté).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/platform' : '/login');
  }, [user, loading, router]);

  return (
    <main className="flex h-screen items-center justify-center bg-background text-text-secondary">
      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
    </main>
  );
}
