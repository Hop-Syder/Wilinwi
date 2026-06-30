'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Coque de la console : en-tête + déconnexion + garde super-admin.
 *   Garde côté client (l'API reste la source de vérité via PlatformAdminGuard).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="flex h-screen items-center justify-center bg-background text-text-secondary">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!user.isPlatformAdmin) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <ShieldAlert className="h-10 w-10 text-danger" />
        <h1 className="text-lg font-bold text-text-primary">Accès refusé</h1>
        <p className="max-w-xs text-sm text-text-secondary">
          Ce compte ({user.email}) n&apos;est pas autorisé sur la console plateforme.
        </p>
        <Button variant="outline" size="sm" onClick={() => signOut()} className="mt-2">
          Se déconnecter
        </Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-black leading-tight">Wilinwi · Console Plateforme</div>
              <div className="text-[10px] text-text-secondary">{user.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut()}
            className="flex items-center gap-1.5"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
