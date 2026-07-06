'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Pop-up bloquant d'onboarding : s'affiche au propriétaire tant que
 *   la localisation du siège (Tenant.pays) est vide. Deux réglages en une étape :
 *   Pays & Ville + « Votre activité » (infrastructure métier du 1ᵉʳ établissement,
 *   §5.5 — active les bons modules : POS food, lots pharmacie, casiers…).
 * @created 2026-07-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import { Globe2, MapPin, Store, UtensilsCrossed, Cross, Scissors, Package } from 'lucide-react';
import {
  COUNTRY_NAMES,
  citiesOf,
  INFRASTRUCTURES,
  INFRASTRUCTURE_LABELS,
  type EtablissementInfrastructure,
} from '@wilinwi/types';
import { apiPatch, type ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Props {
  /** Rechargement du profil après enregistrement (le modal disparaît). */
  onDone: () => Promise<void> | void;
}

const INFRA_ICONS: Record<EtablissementInfrastructure, typeof Store> = {
  RETAIL: Store,
  FOOD: UtensilsCrossed,
  HEALTH: Cross,
  SERVICE: Scissors,
  WHOLESALE: Package,
};

export function OnboardingLocalisationModal({ onDone }: Props) {
  const { user } = useAuth();
  const etabCourant = user?.etablissements.find((e) => e.id === user.etablissementId);
  const [pays, setPays] = useState('');
  const [ville, setVille] = useState('');
  // Présélectionne l'infrastructure actuelle (no-op si déjà configurée).
  const [infrastructure, setInfrastructure] = useState<EtablissementInfrastructure>(
    etabCourant?.infrastructure ?? 'RETAIL',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const villes = citiesOf(pays);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pays || !ville) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch('/api/admin/tenant/localisation', { pays, ville });
      // §5.5 : l'activité choisie configure l'infrastructure du 1ᵉʳ établissement.
      if (etabCourant && infrastructure !== etabCourant.infrastructure) {
        await apiPatch(`/api/etablissements/${etabCourant.id}`, { infrastructure });
      }
      await onDone();
    } catch (err) {
      setError((err as ApiError).message ?? "Échec de l'enregistrement. Réessayez.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary">
            <Globe2 className="h-5 w-5" />
          </span>
          <h2 className="font-display text-lg font-black tracking-tight text-text-primary">
            Configurons votre commerce
          </h2>
        </div>
        <p className="mb-5 text-sm text-text-secondary">
          Où est basée votre entreprise, et quelle est votre activité ? Cette étape
          active les bons outils pour votre métier — modifiable ensuite dans les Paramètres.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="onb-pays" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
              Pays
            </label>
            <select
              id="onb-pays"
              value={pays}
              onChange={(e) => {
                setPays(e.target.value);
                setVille('');
              }}
              required
              className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm font-medium text-text-primary outline-none transition-colors focus:border-primary"
            >
              <option value="" disabled>
                Sélectionnez votre pays…
              </option>
              {COUNTRY_NAMES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="onb-ville" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
              Ville
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/60" />
              <select
                id="onb-ville"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                required
                disabled={!pays}
                className="w-full rounded border border-border bg-background px-3 py-2.5 pl-9 text-sm font-medium text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-50"
              >
                <option value="" disabled>
                  {pays ? 'Sélectionnez votre ville…' : 'Choisissez d’abord un pays'}
                </option>
                {villes.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
              Votre activité
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INFRASTRUCTURES.map((infra) => {
                const Icon = INFRA_ICONS[infra];
                const actif = infrastructure === infra;
                return (
                  <button
                    key={infra}
                    type="button"
                    onClick={() => setInfrastructure(infra)}
                    className={`flex flex-col items-center gap-1 rounded border px-2 py-2.5 text-center text-[11px] font-semibold transition-colors ${
                      actif
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-text-secondary hover:border-primary/40'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {INFRASTRUCTURE_LABELS[infra]}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!pays || !ville || saving}
            className="w-full rounded bg-primary py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-primary/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Démarrer avec Wilinwi'}
          </button>
        </form>
      </div>
    </div>
  );
}
