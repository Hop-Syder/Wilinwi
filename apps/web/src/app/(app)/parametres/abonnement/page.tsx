'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Paramètres → Abonnement & Quotas (/parametres/abonnement)
 *   Visualisation du plan en cours, statut de facturation, période de grâce / dunning,
 *   quotas d'appareils et modules premium add-ons.
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Card } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';
import { apiGet, ApiError } from '@/lib/api';

interface TenantBillingInfo {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  plan: 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
  pastDueSince: string | null;
  createdAt: string;
}

const PLAN_DESCRIPTIONS: Record<string, { label: string; maxUsers: string; maxDevices: string; maxStores: string; color: string }> = {
  STARTER: {
    label: 'Starter (Début d’activité)',
    maxUsers: '2 collaborateurs',
    maxDevices: '1 poste de vente',
    maxStores: '1 boutique',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  PRO: {
    label: 'Professionnel (Croissance)',
    maxUsers: '5 collaborateurs',
    maxDevices: '3 postes de vente',
    maxStores: '2 boutiques',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  BUSINESS: {
    label: 'Business (Multi-boutiques & Entrepôt)',
    maxUsers: '15 collaborateurs',
    maxDevices: '10 postes de vente',
    maxStores: 'Boutiques & Entrepôts illimités',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  ENTERPRISE: {
    label: 'Entreprise (Sur-mesure & Réseau)',
    maxUsers: 'Illimité',
    maxDevices: 'Illimité',
    maxStores: 'Illimité',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

export default function AbonnementPage() {
  const { user } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<TenantBillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<TenantBillingInfo>('/api/admin/tenant');
        setTenantInfo(data);
      } catch (err) {
        setError((err as ApiError).message || 'Impossible de charger les données d’abonnement.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const currentPlan = tenantInfo?.plan ?? user?.plan ?? 'PRO';
  const planDetails = PLAN_DESCRIPTIONS[currentPlan] || PLAN_DESCRIPTIONS.PRO;

  const dunning = user?.dunning;
  const isPastDue = tenantInfo?.subscriptionStatus === 'PAST_DUE' || (dunning && dunning.stage !== 'ACTIVE');

  if (loading) {
    return <div className="max-w-5xl animate-pulse text-sm text-slate-400">Chargement de l'abonnement…</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {/* Bannière d'Alerte Dunning si impayé */}
      {isPastDue && dunning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-amber-900">
                Paiement en attente — Niveau de restriction : {dunning.stage}
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Votre abonnement Wilinwi présente un retard de règlement.
                {dunning.suspendNonVital && ' Les fonctionnalités non-vitales et rapports avancés sont suspendus.'}
                {dunning.downgraded && ' Votre catalogue est temporairement replié sur le quota Starter.'}
                {dunning.posBlocked && ' Les encaissements caisse sont bloqués.'}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <a
                  href="mailto:support@wilinwi.com?subject=Régularisation abonnement Wilinwi"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
                >
                  Contacter le support de facturation
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grille principale : Plan Actuel & Quotas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Colonne 1 : Carte Plan Actuel (7 cols) */}
        <Card className="md:col-span-7 p-6 border-slate-200/80 shadow-xs rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Formule active</span>
                <h2 className="text-lg font-black text-slate-900 font-display">
                  Plan {currentPlan}
                </h2>
              </div>
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider ${planDetails.color}`}>
              {tenantInfo?.subscriptionStatus ?? 'ACTIVE'}
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {planDetails.label}. Votre abonnement vous donne accès aux modules métier essentiels adaptés à la taille de votre structure.
            </p>

            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Capacités incluses dans votre formule :</h4>
              <ul className="text-xs text-slate-700 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Postes & Caisses : <strong>{planDetails.maxDevices}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Équipe & Collaborateurs : <strong>{planDetails.maxUsers}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Établissements : <strong>{planDetails.maxStores}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Mode hors-ligne PWA avec synchronisation automatique</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Traçabilité stricte des mouvements de stock & clôture Z</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Colonne 2 : Évolution de Formule & Modules Add-ons (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          <Card className="p-5 border-slate-200/80 shadow-xs rounded-2xl space-y-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Faire évoluer votre plan</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Besoin de connecter davantage de caisses, d’ouvrir un nouvel entrepôt ou d’activer des modules avancés (KDS Cuisine, Livraisons groupées) ?
            </p>
            <div className="pt-2">
              <a
                href="https://ceo.nexuspartners.xyz"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-black hover:bg-slate-100 transition-colors shadow-sm"
              >
                Demander un surclassement
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </Card>

          <Card className="p-5 border-slate-200/80 shadow-xs rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider">Sécurité & Continuité de Service</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Wilinwi applique le principe de préservation « Grand-Père » : lors d’une modification de formule, aucune donnée passée n’est supprimée.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
