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
import { apiPost } from '@/lib/api';

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
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
    if (!/^\d{4}$/.test(pin)) return setError('Le code PIN doit comporter exactement 4 chiffres.');
    if (pin !== confirmPin) return setError('Les codes PIN ne correspondent pas.');

    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await getSupabase().auth.updateUser({ password });
      if (authError) {
        setLoading(false);
        return setError(authError.message);
      }

      // Enregistrement du code PIN personnel auprès du backend
      await apiPost('/api/users/me/pin', { pin });

      setLoading(false);
      setDone(true);
      setTimeout(() => router.push('/'), 1200);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Erreur lors de la configuration du compte.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Image src="/logo.png" alt="Wilinwi Logo" width={36} height={36} className="object-contain" />
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
            <div>
              <Field label="Nouveau mot de passe (8+ caractères)" value={password} onChange={setPassword} />
              <div className="mt-3">
                <Field label="Confirmez le mot de passe" value={confirm} onChange={setConfirm} />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="mb-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-indigo-600">Sécurité Caisse & Terrain</span>
                <p className="text-[11px] text-slate-500">
                  Votre code PIN secret à 4 chiffres sert à déverrouiller la caisse et basculer de session rapidement sans ressaisir votre mot de passe.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Code PIN (4 chiffres)"
                  value={pin}
                  onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  placeholder="Ex: 1234"
                />
                <Field
                  label="Confirmer le PIN"
                  value={confirmPin}
                  onChange={(v) => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  placeholder="Ex: 1234"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}
            <Button type="submit" variant="emerald" className="w-full mt-2" disabled={loading}>
              {loading ? 'Configuration en cours…' : 'Activer mon compte & mon PIN'}
            </Button>
          </form>
        )}

        {done && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-sm font-bold text-emerald-800">
              ✓ Compte activé avec succès !
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              Votre mot de passe et votre code PIN sont enregistrés. Redirection vers votre espace...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'password',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 placeholder:text-slate-400"
      />
    </label>
  );
}
