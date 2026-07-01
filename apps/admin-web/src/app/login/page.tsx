'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Console admin — connexion e-mail/mot de passe (comptes super-admin).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@wilinwi/ui';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    // Charge le profil AVANT de naviguer → le layout /platform trouve `user` prêt
    // (plus de redirection intempestive vers /login). Le préloader du bouton reste
    // affiché jusqu'à la navigation.
    await refreshUser();
    router.push('/platform');
  }

  return (
    <main className="flex h-screen items-center justify-center bg-[#0B1224] text-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="font-display text-xl font-extrabold">Console Plateforme</h1>
          <p className="text-xs text-slate-400">Accès réservé aux super-administrateurs Wilinwi.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
        >
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Mail className="h-3.5 w-3.5" /> Adresse e-mail
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nexus-partners.xyz"
              required
              autoComplete="email"
              className="h-10 w-full text-sm text-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Lock className="h-3.5 w-3.5" /> Mot de passe
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="h-10 w-full text-sm text-slate-900"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-2.5">
              <p className="text-xs font-semibold text-danger">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full justify-center">
            {loading ? (
              'Connexion…'
            ) : (
              <span className="flex items-center gap-1.5">
                Accéder à la console <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-[10px] text-slate-500">
          © {new Date().getFullYear()} Wilinwi by Nexus Partners.
        </p>
      </div>
    </main>
  );
}
