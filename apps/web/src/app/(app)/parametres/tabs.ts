/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Source unique des sections Paramètres — partagée entre la
 *   barre d'onglets desktop (layout.tsx) et le menu liste mobile façon
 *   WhatsApp (page.tsx, écran racine /parametres).
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { ComponentType } from 'react';
import {
  Building2,
  Users,
  Store,
  MonitorSmartphone,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

export interface ParametresTab {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
}

export const PARAMETRES_TABS: ParametresTab[] = [
  {
    href: '/parametres/entreprise',
    label: 'Entreprise & Reçu',
    description: 'Identité légale, ticket thermique, devises',
    icon: Building2,
  },
  {
    href: '/parametres/utilisateurs',
    label: 'Équipe & PIN',
    description: 'Collaborateurs, rôles, codes PIN de caisse',
    icon: Users,
  },
  {
    href: '/parametres/etablissements',
    label: 'Établissements',
    description: 'Boutiques, points de vente, entrepôts',
    icon: Store,
  },
  {
    href: '/parametres/appareils',
    label: 'Appareils',
    description: 'Postes et navigateurs connectés',
    icon: MonitorSmartphone,
  },
  {
    href: '/parametres/abonnement',
    label: 'Abonnement & Plan',
    description: 'Formule active, facturation, quotas',
    icon: CreditCard,
  },
  {
    href: '/parametres/journal',
    label: 'Journal d’Audit',
    description: 'Historique des actions de l’équipe',
    icon: ShieldCheck,
    ownerOnly: true,
  },
];
