'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Réinitialisation du mot de passe : saisie de l'email → Supabase envoie
 *   un lien de récupération pointant vers /set-password (même page que l'invitation).
 * @created 2026-07-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Input } from '@wilinwi/ui';
import { Mail, ArrowLeft } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/set-password`;
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Image src="/logo.png" alt="Wilinwi Logo" width={36} height={36} className="object-contain" />
          <h1 className="font-display text-2xl font-black text-brand">Wilinwi</h1>
        </div>
        <p className="text-sm text-slate-500">
          Mot de passe oublié ? Entrez votre email : nous vous enverrons un lien pour en
          définir un nouveau.
        </p>

        {!sent ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Adresse email
              </span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                required
                autoComplete="email"
                className="w-full"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="emerald" className="w-full" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
            </Button>
          </form>
        ) : (
          <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            ✓ Si un compte existe pour <span className="font-bold">{email}</span>, un email de
            réinitialisation vient de lui être envoyé. Pensez à vérifier vos spams.
          </p>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-emerald-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
