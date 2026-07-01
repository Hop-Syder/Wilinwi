'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Carte « Sécurité » des Paramètres : changement du mot de passe de
 *   connexion. L'ancien mot de passe est vérifié par une ré-authentification
 *   Supabase (signInWithPassword) avant la mise à jour — sinon le champ serait
 *   décoratif, Supabase ne le contrôlant pas.
 * @created 2026-07-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import { KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button, Card } from '@wilinwi/ui';
import { getSupabase } from '@/lib/supabase';

export function ChangePasswordCard() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 8) {
      return setError('Le nouveau mot de passe doit faire au moins 8 caractères.');
    }
    if (newPassword !== confirm) {
      return setError('Les nouveaux mots de passe ne correspondent pas.');
    }
    setLoading(true);
    const sb = getSupabase();
    // Le mot de passe change sur le compte de la session Supabase active (email),
    // pas sur le profil PIN courant du poste partagé.
    const { data } = await sb.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      setLoading(false);
      return setError(
        'Aucune session email active. Reconnectez-vous avec votre email et mot de passe pour le modifier.',
      );
    }
    // Vérification de l'ancien mot de passe par ré-authentification.
    const { error: reauthError } = await sb.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
    if (reauthError) {
      setLoading(false);
      return setError('Ancien mot de passe incorrect.');
    }
    const { error: updError } = await sb.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updError) return setError(updError.message);
    setSuccess(true);
    setOldPassword('');
    setNewPassword('');
    setConfirm('');
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="rounded-xl bg-brand-50 p-2 text-brand">
          <KeyRound className="h-4 w-4" />
        </span>
        <h2 className="font-display font-semibold text-slate-800">Sécurité — Mot de passe</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Mettez à jour le mot de passe de connexion associé à votre email.
      </p>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PasswordField
          label="Ancien mot de passe"
          value={oldPassword}
          onChange={setOldPassword}
          autoComplete="current-password"
        />
        <PasswordField
          label="Nouveau mot de passe (8+)"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirmer le nouveau"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        {error && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-3">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-3">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Mot de passe mis à jour.
          </p>
        )}

        <div className="sm:col-span-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Mise à jour…' : 'Changer le mot de passe'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
