/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Types et Interfaces pour les Analytics du Tableau de Bord (Dashboard)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export interface DashboardReportResponse {
  from: string;
  to: string;
  prevFrom?: string;
  prevTo?: string;
  chiffreAffaires: number;
  chiffreAffairesPrev?: number;
  variationCaPercent?: number;
  sparklineCa?: number[];

  nombreVentes: number;
  articlesVendus: number;
  panierMoyen: number;
  panierMoyenPrev?: number;
  variationPanierMoyenPercent?: number;
  sparklinePanierMoyen?: number[];

  creditsEncours?: number;
  variationCreditsPercent?: number;
  totalDepenses: number;

  benefice?: number;
  beneficePrev?: number;
  variationBeneficePercent?: number;
  sparklineBenefice?: number[];

  serie: {
    date: string;
    ca: number;
    caPrev?: number;
    benefice?: number;
    ventes: number;
    depenses: number;
  }[];

  topProduits: {
    id: string;
    nom: string;
    categorie?: string;
    quantite: number;
    ca: number;
    contributionCaPercent?: number;
  }[];

  parPaiement: {
    methode: string;
    label: string;
    color?: string;
    montant: number;
    pourcentage: number;
    ventes: number;
    isCredit?: boolean;
  }[];

  soldesTresorerie?: {
    fondDeCaisse: number;
    mobileMoney: number;
    banque: number;
    total: number;
  };

  alertes?: {
    ruptures?: { id: string; nom: string; stock: number }[];
    dettesEchuesCount?: number;
    clientsEnDetteCount?: number;
  };
}
