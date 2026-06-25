'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page de définition du mot de passe à la 1ʳᵉ connexion (lien d'invitation
 *   Supabase). Le client détecte le token dans l'URL (detectSessionInUrl) → session
 *   temporaire → l'utilisateur choisit son mot de passe puis accède au Hub. (OT-1)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@wilinwi/ui';
import { getSupabase } from '@/lib/supabase';

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    let cancelled = false;
    // `detectSessionInUrl` traite le token de l'invitation présent dans l'URL.
    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasSession(!!data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      setReady(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => router.push('/'), 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Image src="/logo-wilinwi.png" alt="Wilinwi Logo" width={36} height={36} className="object-contain" />
          <h1 className="font-display text-2xl font-black text-brand">Wilinwi</h1>
        </div>
        <p className="text-sm text-slate-500">Bienvenue ! Définissez votre mot de passe.</p>

        {!ready && <p className="mt-6 text-sm text-slate-400">Vérification du lien…</p>}

        {ready && !hasSession && !done && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-red-600">
              Lien invalide ou expiré. Demandez à votre responsable de renvoyer l&apos;invitation.
            </p>
            <Link href="/login" className="block text-center text-sm font-medium text-emerald-600 hover:underline">
              Aller à la connexion
            </Link>
          </div>
        )}

        {ready && hasSession && !done && (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Nouveau mot de passe (8+ caractères)" value={password} onChange={setPassword} />
            <Field label="Confirmez le mot de passe" value={confirm} onChange={setConfirm} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="emerald" className="w-full" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Définir mon mot de passe'}
            </Button>
          </form>
        )}

        {done && (
          <p className="mt-6 text-sm font-medium text-emerald-600">
            ✓ Mot de passe défini. Redirection…
          </p>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
