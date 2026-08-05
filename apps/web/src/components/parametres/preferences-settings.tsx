/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Onglet Devises, Plan & Préférences (PreferencesSettings)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { DollarSign, Crown, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '@wilinwi/ui';
import { ChangePasswordCard } from '@/components/change-password-card';

export interface CurrencyConfig {
  primaryCurrency: 'FCFA' | 'GNF' | 'NGN' | 'USD';
  secondaryCurrencies: ('GNF' | 'NGN' | 'USD')[];
}

interface PreferencesSettingsProps {
  initialConfig: CurrencyConfig;
  currentPlan: 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  onSaveCurrencies: (cfg: CurrencyConfig) => Promise<void>;
}

export function PreferencesSettings({
  initialConfig,
  currentPlan,
  onSaveCurrencies,
}: PreferencesSettingsProps) {
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const toggleSecondary = (curr: 'GNF' | 'NGN' | 'USD') => {
    const list = currencyConfig.secondaryCurrencies;
    if (list.includes(curr)) {
      setCurrencyConfig((prev) => ({
        ...prev,
        secondaryCurrencies: prev.secondaryCurrencies.filter((c) => c !== curr),
      }));
    } else {
      setCurrencyConfig((prev) => ({
        ...prev,
        secondaryCurrencies: [...prev.secondaryCurrencies, curr],
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      await onSaveCurrencies(currencyConfig);
      setSavedMsg('Préférences de devises enregistrées !');
      setTimeout(() => setSavedMsg(null), 3000);
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start select-none">
      {/* Colonne Gauche : Devises & Mot de Passe (6 cols) */}
      <div className="lg:col-span-6 space-y-6">
        {/* Formulaire Devises */}
        <form onSubmit={handleSave}>
          <Card className="p-5 border-slate-200/80 shadow-xs rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Devise Principale & Devises Secondaires</h3>
                <p className="text-[11px] text-slate-500 font-medium">Unité monétaire de comptabilité et conversion automatique</p>
              </div>
            </div>

            {savedMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{savedMsg}</span>
              </div>
            )}

            <div className="space-y-4 text-xs font-medium">
              {/* Devise Principale */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Devise Principale du Tenant</label>
                <select
                  value={currencyConfig.primaryCurrency}
                  onChange={(e) => setCurrencyConfig((prev) => ({ ...prev, primaryCurrency: e.target.value as any }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="FCFA">FCFA (XOF / XAF — Afrique de l'Ouest & Centrale)</option>
                  <option value="GNF">GNF (Franc Guinéen)</option>
                  <option value="NGN">NGN (Naira Nigérian)</option>
                  <option value="USD">USD (Dollar Américain $)</option>
                </select>
              </div>

              {/* Devises Secondaires */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Devises Secondaires de Conversion en Caisse</label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {[
                    { id: 'GNF', label: 'GNF — Franc Guinéen' },
                    { id: 'NGN', label: 'NGN — Naira Nigérian' },
                    { id: 'USD', label: 'USD — Dollar US ($)' },
                  ].map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currencyConfig.secondaryCurrencies.includes(c.id as any)}
                        onChange={() => toggleSecondary(c.id as any)}
                        className="h-4 w-4 text-indigo-600 rounded-md accent-indigo-600"
                      />
                      <span className="font-bold text-slate-800">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs">
                {saving ? 'Enregistrement...' : 'Enregistrer les devises'}
              </Button>
            </div>
          </Card>
        </form>

        {/* Changement de Mot de Passe */}
        <ChangePasswordCard />
      </div>

      {/* Colonne Droite : Plan & Abonnement Current Tenant (6 cols) */}
      <div className="lg:col-span-6 space-y-4">
        <Card className="p-5 border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-white shadow-xs rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Plan d’Abonnement Wilinwi</h3>
                <p className="text-[11px] text-slate-500 font-medium">Niveau d'accès et limites fonctionnelles du commerce</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-extrabold text-xs shadow-2xs">
              Plan Active : {currentPlan}
            </span>
          </div>

          {/* Synthèse des plans */}
          <div className="space-y-3">
            {[
              { id: 'STARTER', label: 'Starter', price: 'Gratuit', desc: '1 boutique · Caisse POS & Stock de base' },
              { id: 'PRO', label: 'Pro', price: '7 500 FCFA/mois', desc: 'Jusqu’à 2 boutiques · Trésorerie & Ardoise Client' },
              { id: 'BUSINESS', label: 'Business', price: '20 000 FCFA/mois', desc: 'Multi-boutiques illimitées · CRM & Marketing Pro' },
            ].map((p) => (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  currentPlan === p.id
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-2xs'
                    : 'border-slate-200/80 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs">{p.label}</span>
                    <span className="font-mono text-xs font-bold text-indigo-700">{p.price}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{p.desc}</p>
                </div>
                {currentPlan === p.id && (
                  <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Actif
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
