'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@wilinwi/ui';
import { apiPost } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nomBoutique: '', nomComplet: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/auth/signup', form);
      // Connexion immédiate après création.
      const { error } = await getSupabase().auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="font-display text-2xl font-bold text-brand">◈ Wilinwi</h1>
        <p className="mt-1 text-sm text-slate-500">Créez votre boutique en 30 secondes.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Nom de la boutique" value={form.nomBoutique} onChange={set('nomBoutique')} />
          <Field label="Votre nom" value={form.nomComplet} onChange={set('nomComplet')} />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} />
          <Field
            label="Mot de passe (8+ caractères)"
            type="password"
            value={form.password}
            onChange={set('password')}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" variant="emerald" className="w-full" disabled={loading}>
            {loading ? 'Création…' : 'Créer ma boutique'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
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
