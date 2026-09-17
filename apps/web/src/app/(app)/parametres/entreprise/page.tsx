'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Paramètres → Entreprise & Reçu (/parametres/entreprise)
 *   Configuration de l'identité légale de l'entreprise, personnalisation
 *   du reçu thermique (en-tête, pied de page, papier 58/80mm) et devises.
 *   Single Source of Truth connectée aux APIs réelles.
 *
 *   Déplacée depuis /parametres (racine) : la racine est désormais le menu
 *   liste mobile façon WhatsApp (voir ../page.tsx) — chaque section, y
 *   compris celle-ci, vit sur sa propre route à égalité avec les autres.
 * @created 2026-06-20
 * @updated 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

import { CompanyReceiptSettings, type CompanyReceiptData } from '@/components/parametres/company-receipt-settings';
import { PreferencesSettings, type CurrencyConfig } from '@/components/parametres/preferences-settings';

const STORAGE_RECEIPT_KEY = 'wilinwi_receipt_settings';
const STORAGE_CURRENCY_KEY = 'wilinwi_currency_config';

export default function ParametresEntreprisePage() {
  const { user, refreshUser } = useAuth();
  const [, setLoading] = useState(true);

  // Données de reçu thermique (chargées depuis localStorage puis fusionnées avec le profil)
  const [companyData, setCompanyData] = useState<CompanyReceiptData>({
    raisonSociale: user?.etablissements?.[0]?.nom || 'Mon Entreprise Wilinwi',
    nouveauIfu: '',
    telephone: '+229 97 00 00 00',
    adresse: user?.ville || 'Cotonou, Bénin',
    receiptHeader: 'Commerce Général & Détail',
    receiptFooter: 'Merci de votre fidélité ! Les marchandises vendues ne sont ni reprises ni échangées.',
    paperFormat: '80mm',
  });

  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({
    primaryCurrency: 'FCFA',
    secondaryCurrencies: ['GNF', 'USD'],
  });

  useEffect(() => {
    // 1. Chargement des préférences locales de reçu
    try {
      const savedReceipt = localStorage.getItem(STORAGE_RECEIPT_KEY);
      if (savedReceipt) {
        setCompanyData((prev) => ({ ...prev, ...JSON.parse(savedReceipt) }));
      }
      const savedCurrency = localStorage.getItem(STORAGE_CURRENCY_KEY);
      if (savedCurrency) {
        setCurrencyConfig(JSON.parse(savedCurrency));
      }
    } catch {
      // Ignorer les erreurs de parsing
    }

    // 2. Chargement des infos réelles du tenant
    async function loadTenant() {
      try {
        const tenant = await apiGet<{ nom: string; pays?: string | null; ville?: string | null }>('/api/admin/tenant');
        if (tenant) {
          setCompanyData((prev) => ({
            ...prev,
            raisonSociale: tenant.nom || prev.raisonSociale,
            adresse: tenant.ville ? `${tenant.ville}, ${tenant.pays || ''}`.trim() : prev.adresse,
          }));
        }
      } catch {
        // En cas d'absence de droit, conservation des valeurs actuelles
      } finally {
        setLoading(false);
      }
    }

    void loadTenant();
  }, [user]);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-parametres-company',
      title: 'Identité Entreprise & Reçu',
      content: 'Configurez la raison sociale, les mentions légales et personnalisez l’en-tête et le pied de page du ticket thermique.',
      position: 'bottom',
    },
  ];

  // Sauvegarde Profil & Reçus
  const handleSaveCompany = async (data: CompanyReceiptData) => {
    setCompanyData(data);
    try {
      localStorage.setItem(STORAGE_RECEIPT_KEY, JSON.stringify(data));
      // Si OWNER, mise à jour de la localisation si précisée
      if (user?.role === 'OWNER' && data.adresse.includes(',')) {
        const [ville, pays] = data.adresse.split(',').map((s) => s.trim());
        if (ville && pays) {
          await apiPatch('/api/admin/tenant/localisation', { pays, ville }).catch(() => {});
          await refreshUser();
        }
      }
    } catch {
      // Erreur de persistance silencieuse
    }
  };

  // Sauvegarde Devises
  const handleSaveCurrencies = async (cfg: CurrencyConfig) => {
    setCurrencyConfig(cfg);
    try {
      localStorage.setItem(STORAGE_CURRENCY_KEY, JSON.stringify(cfg));
    } catch {
      // Erreur de stockage silencieuse
    }
  };

  return (
    <div className="space-y-8 select-none relative" id="tour-parametres-company">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Profil Entreprise & Ticket Thermique</h2>
          <p className="text-xs text-slate-500 font-medium">
            Personnalisez le visuel des tickets imprimés en caisse et les informations légales affichées à vos clients.
          </p>
        </div>

        <ContextualHelp
          storageKey="wilinwi_parametres_tour_done"
          tourSteps={tourSteps}
          useCases={[
            { title: 'Branding Reçu Thermique', description: 'Personnalisez l’en-tête, le pied de page et prévisualisez le ticket modèle en direct.' },
            { title: 'Format Papier', description: 'Basculez entre le format standard 80mm pour imprimante de bureau et 58mm pour terminal mobile.' },
            { title: 'Devises', description: 'Définissez la monnaie principale de votre zone (FCFA, GNF...) et vos devises secondaires.' },
          ]}
        />
      </div>

      {/* Éditeur de Reçu Thermique avec Live Preview */}
      <CompanyReceiptSettings initialData={companyData} onSave={handleSaveCompany} />

      {/* Préférences Monétaires & Sécurité du Mot de Passe */}
      <div className="pt-4 border-t border-slate-200/80">
        <PreferencesSettings
          initialConfig={currencyConfig}
          currentPlan={user?.plan ?? 'PRO'}
          onSaveCurrencies={handleSaveCurrencies}
        />
      </div>
    </div>
  );
}
