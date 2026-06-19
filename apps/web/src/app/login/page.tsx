'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@wilinwi/ui';
import { getSupabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="font-display text-2xl font-bold text-brand">◈ Wilinwi</h1>
        <p className="mt-1 text-sm text-slate-500">Gérez. Vendez. Grandissez.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Mot de passe" type="password" value={password} onChange={setPassword} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Pas encore de boutique ?{' '}
          <Link href="/signup" className="font-medium text-emerald-600 hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
