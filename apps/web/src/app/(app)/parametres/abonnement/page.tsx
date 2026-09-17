'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Paramètres → Abonnement & Quotas (/parametres/abonnement)
 *   Gestion du forfait en cours, nouvelle grille tarifaire dès 10 000 FCFA/mois,
 *   sélecteur de cycle mensuel/annuel (-17%), quotas et souscription directe.
 * @created 2026-09-17
 * @updated 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Store,
  Users,
  Smartphone,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { Card, Button, formatFCFA } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';
import { apiGet, ApiError } from '@/lib/api';
import type { Plan } from '@wilinwi/types';

interface TenantBillingInfo {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  plan: Plan;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
  pastDueSince: string | null;
  createdAt: string;
}

interface PlanCardDefinition {
  id: Plan;
  name: string;
  badge?: string;
  subtitle: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  stores: string;
  users: string;
  devices: string;
  photos: string;
  features: string[];
  isPopular?: boolean;
}

const PLAN_CATALOG: PlanCardDefinition[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    badge: 'Boutique Solo',
    subtitle: 'Pour entrepreneurs indépendants et commerces de proximité.',
    monthlyPrice: 10_000,
    yearlyPrice: 100_000,
    stores: '1 Boutique',
    users: '2 Collaborateurs',
    devices: '1 Caisse POS',
    photos: '1 photo par article',
    features: [
      'Ventes & encaissements POS illimités',
      'Mode 100% hors-ligne garanti (PWA)',
      'Reçus thermiques & reçus WhatsApp',
      'Carnet de créances (ardoise clients)',
      'Suivi des dépenses courantes de caisse',
      'Gestion de stock boutique & alertes',
    ],
  },
  {
    id: 'PRO',
    name: 'Professionnel',
    badge: 'Recommandé',
    subtitle: 'Pour commerces dynamiques et équipes de vente jusqu’à 5 personnes.',
    monthlyPrice: 25_000,
    yearlyPrice: 250_000,
    stores: 'Jusqu’à 2 Boutiques',
    users: 'Jusqu’à 5 Collaborateurs',
    devices: 'Jusqu’à 3 Caisses POS',
    photos: 'Galerie complète (5 photos)',
    isPopular: true,
    features: [
      'Tout ce qui est inclus dans Starter',
      'Système anti-fraude à 4 prix sécurisé',
      'Trésorerie multi-comptes (Espèces, MoMo, Banque)',
      'Rapports de marge nette & stats vendeurs',
      'Gestion des acomptes & crédits clients',
      'Assistance prioritaire sur WhatsApp',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    badge: 'Réseau & Entrepôt',
    subtitle: 'Pour grossistes, distributeurs et réseaux multi-boutiques avec stock central.',
    monthlyPrice: 50_000,
    yearlyPrice: 500_000,
    stores: 'Boutiques & Entrepôts illimités',
    users: '15 Collaborateurs inclus',
    devices: '10 Caisses POS actives',
    photos: 'Galerie photos illimitée',
    features: [
      'Tout ce qui est inclus dans Pro',
      'Module Entrepôt & Logistique (/entrepot)',
      'Commandes fournisseurs & bons de réception PDF',
      'Dispatching & transferts inter-boutiques tracés',
      'CRM complet & relances de dettes 1-clic WhatsApp',
      'Exports comptables complets (Excel, CSV, PDF)',
      'Journal d’audit d’intégrité & anti-fraude',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Entreprise',
    badge: 'Sur-mesure',
    subtitle: 'Pour grandes enseignes, franchises régionales et chaînes multi-pays.',
    monthlyPrice: null,
    yearlyPrice: null,
    stores: 'Illimité (Multi-pays)',
    users: 'Collaborateurs illimités',
    devices: 'Caisses illimitées',
    photos: 'Photos & médias illimités',
    features: [
      'Tout ce qui est inclus dans Business',
      'Site e-commerce personnalisé synchronisé',
      'Accès API ouverte & connecteurs ERP',
      'Formation des équipes sur site',
      'SLA garanti 99.9% avec gestionnaire dédié',
      'Accompagnement stratégique sur-mesure',
    ],
  },
];

export default function AbonnementPage() {
  const { user } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<TenantBillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

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

  const currentPlan: Plan = tenantInfo?.plan ?? user?.plan ?? 'STARTER';
  const currentPlanMeta = PLAN_CATALOG.find((p) => p.id === currentPlan) ?? PLAN_CATALOG[0];

  const dunning = user?.dunning;
  const isPastDue = tenantInfo?.subscriptionStatus === 'PAST_DUE' || (dunning && dunning.stage !== 'ACTIVE');

  const getWhatsAppUpgradeUrl = (planName: string) => {
    const boutique = user?.boutiqueNom || 'mon commerce';
    const text = encodeURIComponent(
      `Bonjour Wilinwi ! Je souhaite souscrire / passer à la formule ${planName} (${billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'}) pour ma boutique « ${boutique} ». Pouvez-vous m'accompagner ?`,
    );
    return `https://wa.me/22990000000?text=${text}`;
  };

  if (loading) {
    return (
      <div className="max-w-6xl space-y-4 py-8 animate-pulse text-sm text-slate-400">
        <div className="h-28 bg-slate-100 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-slate-100 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* ⚠️ Bannière d'Alerte Dunning si impayé */}
      {isPastDue && dunning && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-black text-amber-900">
                Paiement en attente — Niveau de restriction : {dunning.stage}
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Votre abonnement présente un retard de règlement.
                {dunning.suspendNonVital && ' Les fonctionnalités secondaires et exports avancés sont suspendus.'}
                {dunning.downgraded && ' Votre catalogue est temporairement restreint au quota de base.'}
                {dunning.posBlocked && ' Les encaissements de caisse physique sont momentanément bloqués.'}
              </p>
              <div className="pt-1 flex items-center gap-3">
                <a
                  href={getWhatsAppUpgradeUrl(currentPlanMeta.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Régulariser via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── 1. BANDEAU DE FORFAIT EN COURS ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Abonnement Actuel
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {tenantInfo?.subscriptionStatus ?? 'Actif'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-display flex items-center gap-3">
              Plan {currentPlanMeta.name}
              <span className="text-sm font-semibold text-slate-500 font-sans">
                ({currentPlanMeta.badge})
              </span>
            </h2>
            <p className="text-xs text-slate-600 max-w-xl font-medium">
              {currentPlanMeta.subtitle} Aucune commission sur vos ventes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400 font-medium">Tarif officiel</div>
              <div className="text-lg font-black text-slate-900 font-mono">
                {currentPlanMeta.monthlyPrice ? `${formatFCFA(currentPlanMeta.monthlyPrice)} / mois` : 'Sur devis'}
              </div>
            </div>
            <a
              href="#pricing-grid"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              Changer de formule
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ──────────────── 2. SÉLECTEUR DE CYCLE & EN-TÊTE GRILLE ──────────────── */}
      <div id="pricing-grid" className="text-center space-y-4 pt-4">
        <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
          Tarification Transparente • 0% Commission
        </span>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
          Choisissez la formule adaptée à votre croissance
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto font-medium">
          Dès 10 000 FCFA par mois, sécurisez vos caisses, suivez vos stocks en temps réel et pilotez votre commerce comme un professionnel.
        </p>

        {/* Bouton bascule Mensuel / Annuel */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs mt-2">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Facturation Mensuelle
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Facturation Annuelle
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              2 mois offerts (-17%)
            </span>
          </button>
        </div>
      </div>

      {/* ──────────────── 3. GRILLE DES 4 OFFRES ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {PLAN_CATALOG.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPrice = price ? formatFCFA(price) : 'Sur devis';
          const periodLabel = billingCycle === 'yearly' ? '/ an' : '/ mois';

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col justify-between p-5 rounded-3xl transition-all duration-200 ${
                plan.isPopular
                  ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 bg-gradient-to-b from-emerald-50/20 via-white to-white'
                  : 'border border-slate-200/90 shadow-xs hover:border-slate-300 bg-white'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  Recommandé
                </div>
              )}

              <div className="space-y-4">
                {/* En-tête de carte */}
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-slate-900 font-display">
                      {plan.name}
                    </h4>
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {plan.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 min-h-[32px] leading-snug">
                    {plan.subtitle}
                  </p>
                </div>

                {/* Tarif */}
                <div className="py-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {displayPrice}
                    </span>
                    {price && <span className="text-xs font-semibold text-slate-400">{periodLabel}</span>}
                  </div>
                  {billingCycle === 'yearly' && plan.monthlyPrice && (
                    <span className="text-[10px] font-bold text-emerald-700">
                      Soit {formatFCFA(Math.round(plan.yearlyPrice! / 12))} / mois
                    </span>
                  )}
                </div>

                {/* Quotas clés */}
                <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-xs font-semibold text-slate-700 border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>{plan.stores}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>{plan.users}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{plan.devices}</span>
                  </div>
                </div>

                {/* Liste des fonctionnalités */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Inclus dans ce forfait :
                  </span>
                  <ul className="space-y-2 text-[11.5px] text-slate-600 font-medium">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                {isCurrent ? (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full text-xs font-bold bg-slate-100 border-slate-200 text-slate-600 cursor-default"
                  >
                    Votre formule actuelle
                  </Button>
                ) : (
                  <a
                    href={getWhatsAppUpgradeUrl(plan.name)}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center justify-center w-full gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 shadow-xs ${
                      plan.isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    Choisir ce plan
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ──────────────── 4. ENGAGEMENTS & SÉCURITÉ ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <Card className="p-4.5 rounded-2xl border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            0% de commission sur vos ventes
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Vos encaissements restent 100% à vous. Wilinwi ne prend aucun pourcentage sur votre chiffre d’affaires.
          </p>
        </Card>

        <Card className="p-4.5 rounded-2xl border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Paiements locaux acceptés
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Réglez facilement votre abonnement via Wave, MTN Mobile Money, Moov Money ou Carte Bancaire.
          </p>
        </Card>

        <Card className="p-4.5 rounded-2xl border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            Données préservées à vie
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            En cas de retard ou de suspension, vos historiques de vente et produits ne sont jamais détruits.
          </p>
        </Card>
      </div>
    </div>
  );
}

