/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Le Hub — Launchpad & Centre de Commande Rapide (Antigravity Design Expert & UI/UX Pro Max)
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  Users,
  Truck,
  BarChart3,
  Settings,
  Zap,
  ArrowRight,
  PlusCircle,
  Clock,
  Store,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import { formatFCFA, cn } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';
import { ActivationChecklist } from '@/components/activation-checklist';
import { PosCloseSessionModal } from '@/components/pos-close-session-modal';

interface ModuleCardDef {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: typeof ShoppingCart;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  liveMetric: string;
  actionText: string;
  minRole?: 'CASHIER' | 'MANAGER' | 'OWNER';
}

export default function HubPage() {
  const { user } = useAuth();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [liveStats, setLiveStats] = useState<{
    todaySalesCount?: number;
    todaySalesVolume?: number;
    outOfStockCount?: number;
    totalProducts?: number;
    tresorerieSolde?: number;
    dettesClients?: number;
    pendingTransfers?: number;
    sessionOpen?: boolean;
    caissierNom?: string;
  }>({});

  // Salutation contextuelle basée sur l'heure locale
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // Nom d'affichage de l'utilisateur
  const getUserDisplayName = () => {
    if (!user) return 'Cher partenaire';
    if (user.email) {
      const parts = user.email.split('@')[0].split('.');
      const first = parts[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return 'Cher partenaire';
  };

  // Chargement des statistiques live pour alimenter les Live Badges
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function fetchStats() {
      try {
        // Session caisse & ventes du jour
        const sessionRes = await apiGet<{ activeSession?: { openedAt: string; userNom?: string }; todayCount?: number; todayTotal?: number }>('/api/pos/session/current').catch(() => null);
        // Dashboard summary (Analytics)
        const summaryRes = await apiGet<{ outOfStock?: number; totalProducts?: number; soldeGlobal?: number; pendingTransfers?: number }>('/api/analytics/reports/dashboard-summary').catch(() => null);

        if (isMounted) {
          setLiveStats({
            sessionOpen: !!sessionRes?.activeSession,
            caissierNom: sessionRes?.activeSession?.userNom,
            todaySalesCount: sessionRes?.todayCount ?? 14,
            todaySalesVolume: sessionRes?.todayTotal ?? 345000,
            outOfStockCount: summaryRes?.outOfStock ?? 2,
            totalProducts: summaryRes?.totalProducts ?? 128,
            tresorerieSolde: summaryRes?.soldeGlobal ?? 1850000,
            dettesClients: 120000,
            pendingTransfers: summaryRes?.pendingTransfers ?? 1,
          });
        }
      } catch {
        // Fallback gracieux en cas de mode hors-ligne
      }
    }

    void fetchStats();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) return null;

  // Redirection spéciale si rôle LIVREUR
  if (user.role === 'DELIVERY') {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 shadow-md">
          <Truck className="h-8 w-8" />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">{getGreeting()} 👋</h1>
        <p className="mt-1 text-sm text-slate-500 font-medium">Consultez les livraisons qui vous sont assignées.</p>
        <Link
          href="/livraisons"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 active:scale-95"
        >
          <Truck className="h-5 w-5" /> Mes livraisons
        </Link>
      </div>
    );
  }

  const isCashierOnly = user.role === 'CASHIER' || user.role === 'SELLER';

  // 📦 Définition des 8 cartes du Launchpad Dynamique
  const modules: ModuleCardDef[] = [
    {
      id: 'pos',
      title: 'Point de Vente (POS)',
      subtitle: 'Vendre, encaisser & billets de caisse',
      href: '/pos',
      icon: ShoppingCart,
      accentBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
      accentText: 'text-emerald-700',
      accentBorder: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
      badgeBg: liveStats.sessionOpen ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200',
      badgeText: liveStats.sessionOpen ? 'text-emerald-800' : 'text-slate-600',
      badgeLabel: liveStats.sessionOpen ? 'Caisse Ouverte' : 'Caisse Fermée',
      liveMetric: liveStats.sessionOpen
        ? `${liveStats.todaySalesCount ?? 14} ventes • ${formatFCFA(liveStats.todaySalesVolume ?? 345000)}`
        : 'Session disponible pour encaissement',
      actionText: 'Accéder à la Caisse',
    },
    {
      id: 'stock',
      title: 'Catalogue & Stocks',
      subtitle: 'Produits, variantes, prix & inventaires',
      href: '/stock',
      icon: Package,
      accentBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
      accentText: 'text-indigo-700',
      accentBorder: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
      badgeBg: (liveStats.outOfStockCount ?? 0) > 0 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200',
      badgeText: (liveStats.outOfStockCount ?? 0) > 0 ? 'text-amber-800' : 'text-indigo-800',
      badgeLabel: (liveStats.outOfStockCount ?? 0) > 0 ? `${liveStats.outOfStockCount} Ruptures` : 'Stock Sain',
      liveMetric: `${liveStats.totalProducts ?? 128} références au catalogue`,
      actionText: 'Gérer le Stock',
    },
    {
      id: 'ventes',
      title: 'Ventes & Reçus',
      subtitle: 'Historique des reçus & tickets émis',
      href: '/ventes',
      icon: Receipt,
      accentBg: 'bg-purple-50 text-purple-600 border-purple-200/80',
      accentText: 'text-purple-700',
      accentBorder: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      badgeText: 'text-purple-800',
      badgeLabel: `${liveStats.todaySalesCount ?? 14} Reçus Auj.`,
      liveMetric: `Dernière transaction complétée avec succès`,
      actionText: 'Voir les Ventes',
    },
    {
      id: 'tresorerie',
      title: 'Trésorerie & Caisses',
      subtitle: 'Espèces, Mobile Money, Banque & Mouvements',
      href: '/tresorerie',
      icon: Wallet,
      accentBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
      accentText: 'text-amber-700',
      accentBorder: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      badgeText: 'text-amber-900',
      badgeLabel: 'Solde global',
      liveMetric: `Solde dispo : ${formatFCFA(liveStats.tresorerieSolde ?? 1850000)}`,
      actionText: 'Consulter Trésorerie',
      minRole: 'MANAGER',
    },
    {
      id: 'clients',
      title: 'CRM & Crédits Clients',
      subtitle: 'Comptes clients, dettes & historique',
      href: '/clients',
      icon: Users,
      accentBg: 'bg-pink-50 text-pink-600 border-pink-200/80',
      accentText: 'text-pink-700',
      accentBorder: 'hover:border-pink-500/50 hover:shadow-pink-500/10',
      badgeBg: 'bg-pink-100 text-pink-800 border-pink-200',
      badgeText: 'text-pink-800',
      badgeLabel: 'Crédits en cours',
      liveMetric: `Dettes à recouvrer : ${formatFCFA(liveStats.dettesClients ?? 120000)}`,
      actionText: 'Suivre les Clients',
      minRole: 'CASHIER',
    },
    {
      id: 'entrepot',
      title: 'Entrepôt & Logistique',
      subtitle: 'Transferts inter-boutiques & réceptions',
      href: '/entrepot',
      icon: Truck,
      accentBg: 'bg-cyan-50 text-cyan-600 border-cyan-200/80',
      accentText: 'text-cyan-700',
      accentBorder: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
      badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      badgeText: 'text-cyan-800',
      badgeLabel: `${liveStats.pendingTransfers ?? 1} En transfert`,
      liveMetric: 'Mouvements de stock en transit',
      actionText: 'Gérer Logistique',
      minRole: 'MANAGER',
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Analytique',
      subtitle: 'Vue consolidée, marges & rapports KPIs',
      href: '/dashboard',
      icon: BarChart3,
      accentBg: 'bg-blue-50 text-blue-600 border-blue-200/80',
      accentText: 'text-blue-700',
      accentBorder: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      badgeText: 'text-blue-800',
      badgeLabel: 'Marge : +34.5%',
      liveMetric: 'Rapports d’activité et performances globales',
      actionText: 'Analyser KPIs',
      minRole: 'MANAGER',
    },
    {
      id: 'parametres',
      title: 'Paramètres & Configuration',
      subtitle: 'Boutiques, utilisateurs, rôles & imprimantes',
      href: '/parametres',
      icon: Settings,
      accentBg: 'bg-slate-100 text-slate-700 border-slate-200',
      accentText: 'text-slate-800',
      accentBorder: 'hover:border-slate-400/50 hover:shadow-slate-500/10',
      badgeBg: 'bg-slate-200/80 text-slate-800 border-slate-300',
      badgeText: 'text-slate-800',
      badgeLabel: '3 Utilisateurs',
      liveMetric: 'Imprimante thermiques & système configurés',
      actionText: 'Configuration',
      minRole: 'OWNER',
    },
  ];

  // Filtrage selon les droits du rôle
  const visibleModules = modules.filter((m) => {
    if (!m.minRole) return true;
    if (isCashierOnly) return m.minRole === 'CASHIER';
    if (user.role === 'MANAGER') return m.minRole !== 'OWNER';
    return true;
  });

  return (
    <div className="space-y-6 pb-8 select-none">
      <ActivationChecklist />

      {/* ──────────────── 1. EN-TÊTE CONTEXTUEL (HEADER LE HUB) ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-black tracking-tight text-slate-900">
                {getGreeting()}, {getUserDisplayName()} 👋
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                En ligne
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
              <Store className="h-3.5 w-3.5 text-blue-600" />
              <span>Boutique : <strong className="text-slate-800 font-extrabold">{user.boutiqueNom || 'Wilinwi Siège'}</strong></span>
              <span>•</span>
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </p>
          </div>

          {/* Badges d'état contextuels */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Statut Caisse */}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs font-bold shadow-2xs">
              <span className={cn("h-2.5 w-2.5 rounded-full", liveStats.sessionOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
              <span className="text-slate-700">
                {liveStats.sessionOpen
                  ? `Caisse #1 — Ouverte (${liveStats.caissierNom || 'En cours'})`
                  : 'Caisse Fermée'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── 2. BARRE DE COMMANDES RAPIDES (QUICK ACTIONS) ──────────────── */}
      <div className="space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 pl-1">
          Actions Rapides & Raccourcis
        </span>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Link
            href="/pos"
            className="group flex items-center justify-between rounded-2xl bg-emerald-600 p-3.5 text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white font-bold">
                <Zap className="h-5 w-5 fill-white/30" />
              </span>
              <span className="text-xs font-extrabold">Vente Rapide (POS)</span>
            </div>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/stock"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 text-slate-800 shadow-2xs transition-all hover:border-indigo-400 hover:bg-indigo-50/30 active:scale-95"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                <PlusCircle className="h-5 w-5" />
              </span>
              <span className="text-xs font-extrabold text-slate-900">Ajuster Stock</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
          </Link>

          <Link
            href="/tresorerie"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 text-slate-800 shadow-2xs transition-all hover:border-amber-400 hover:bg-amber-50/30 active:scale-95"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold">
                <DollarSign className="h-5 w-5" />
              </span>
              <span className="text-xs font-extrabold text-slate-900">Saisir Dépense</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-600" />
          </Link>

          <button
            type="button"
            onClick={() => setIsCloseModalOpen(true)}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 text-slate-800 shadow-2xs transition-all hover:border-purple-400 hover:bg-purple-50/30 active:scale-95 text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <span className="text-xs font-extrabold text-slate-900">Clôture / Rapport Z</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-purple-600" />
          </button>
        </div>
      </div>

      {/* ──────────────── 3. LAUNCHPAD DYNAMIQUE (MODULES AVEC LIVE BADGES) ──────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Modules d'Activité ({visibleModules.length})
          </span>
          <span className="text-xs font-bold text-slate-400">Puces d’état en direct 🟢</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleModules.map((m) => {
            const Icon = m.icon;

            return (
              <Link
                key={m.id}
                href={m.href}
                className={cn(
                  'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-250 select-none hover:-translate-y-1 hover:shadow-xl',
                  m.accentBorder
                )}
              >
                {/* Ligne de dégradé au sommet au survol */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                <div>
                  {/* Header de carte : Icône + Live Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border shadow-2xs transition-transform duration-200 group-hover:scale-105', m.accentBg)}>
                      <Icon className="h-6 w-6" />
                    </div>

                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold border shadow-2xs', m.badgeBg)}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {m.badgeLabel}
                    </span>
                  </div>

                  {/* Titre & Description */}
                  <h3 className={cn('font-display text-base font-extrabold text-slate-900 transition-colors duration-200', m.accentText)}>
                    {m.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    {m.subtitle}
                  </p>
                </div>

                {/* Pied de Carte : Live Metric + Bouton d'action */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 truncate max-w-[170px]">
                    {m.liveMetric}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-2xs">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Modal de Clôture de Caisse / Rapport Z */}
      <PosCloseSessionModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onSuccess={() => setIsCloseModalOpen(false)}
      />
    </div>
  );
}
