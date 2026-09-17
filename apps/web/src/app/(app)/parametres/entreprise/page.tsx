'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Paramètres → Entreprise & Reçu (/parametres/entreprise)
 *   Configuration de l'identité légale de l'entreprise et personnalisation
 *   du reçu thermique (en-tête, pied de page, papier 58/80mm) — persistées
 *   réellement côté serveur (Tenant.telephone/ifu/receiptHeader/receiptFooter/
 *   receiptPaperFormat, apps/api/src/admin/admin.controller.ts PATCH /tenant).
 *   Auparavant ces champs n'existaient qu'en localStorage : aucune donnée
 *   n'était partagée entre appareils, et rien n'indiquait un échec réel de
 *   sauvegarde. Les devises restent en localStorage (hors périmètre ici).
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
import type { ReceiptPaperFormat, TenantProfileDto } from '@wilinwi/types';

import { CompanyReceiptSettings, type CompanyReceiptData } from '@/components/parametres/company-receipt-settings';
import { PreferencesSettings, type CurrencyConfig } from '@/components/parametres/preferences-settings';

const STORAGE_CURRENCY_KEY = 'wilinwi_currency_config';

/** MM80/MM58 (base, enum Prisma) ↔ '80mm'/'58mm' (formulaire, déjà utilisé par le composant). */
function toFormFormat(f: ReceiptPaperFormat): CompanyReceiptData['paperFormat'] {
  return f === 'MM58' ? '58mm' : '80mm';
}
function toApiFormat(f: CompanyReceiptData['paperFormat']): ReceiptPaperFormat {
  return f === '58mm' ? 'MM58' : 'MM80';
}

function toCompanyData(tenant: TenantProfileDto): CompanyReceiptData {
  return {
    raisonSociale: tenant.nom,
    nouveauIfu: tenant.ifu ?? '',
    telephone: tenant.telephone ?? '',
    adresse: tenant.ville ? `${tenant.ville}, ${tenant.pays || ''}`.trim() : '',
    receiptHeader: tenant.receiptHeader ?? '',
    receiptFooter: tenant.receiptFooter ?? '',
    paperFormat: toFormFormat(tenant.receiptPaperFormat),
  };
}

export default function ParametresEntreprisePage() {
  const { user, refreshUser } = useAuth();
  const [companyData, setCompanyData] = useState<CompanyReceiptData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({
    primaryCurrency: 'FCFA',
    secondaryCurrencies: ['GNF', 'USD'],
  });

  useEffect(() => {
    // Devises : préférence locale à l'appareil, hors périmètre de ce correctif.
    try {
      const savedCurrency = localStorage.getItem(STORAGE_CURRENCY_KEY);
      if (savedCurrency) setCurrencyConfig(JSON.parse(savedCurrency));
    } catch {
      // Ignorer les erreurs de parsing
    }

    async function loadTenant() {
      try {
        const tenant = await apiGet<TenantProfileDto>('/api/admin/tenant');
        setCompanyData(toCompanyData(tenant));
      } catch (err) {
        setLoadError((err as Error).message || "Impossible de charger le profil de l'entreprise.");
      }
    }
    void loadTenant();
  }, []);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-parametres-company',
      title: 'Identité Entreprise & Reçu',
      content: 'Configurez la raison sociale, les mentions légales et personnalisez l’en-tête et le pied de page du ticket thermique.',
      position: 'bottom',
    },
  ];

  // Sauvegarde Profil & Reçus — persistée réellement (PATCH /api/admin/tenant).
  // Laisse volontairement remonter l'erreur : CompanyReceiptSettings affiche
  // déjà une alerte si `onSave` rejette, ne pas l'avaler ici la rendrait muette.
  const handleSaveCompany = async (data: CompanyReceiptData) => {
    const updated = await apiPatch<TenantProfileDto>('/api/admin/tenant', {
      nom: data.raisonSociale,
      telephone: data.telephone || null,
      ifu: data.nouveauIfu || null,
      receiptHeader: data.receiptHeader || null,
      receiptFooter: data.receiptFooter || null,
      receiptPaperFormat: toApiFormat(data.paperFormat),
    });
    setCompanyData(toCompanyData(updated));

    // Adresse (ville, pays) : validée séparément (la ville doit appartenir au
    // pays) — réservé à l'OWNER, comme lors de l'onboarding.
    if (user?.role === 'OWNER' && data.adresse.includes(',')) {
      const [ville, pays] = data.adresse.split(',').map((s) => s.trim());
      if (ville && pays) {
        await apiPatch('/api/admin/tenant/localisation', { pays, ville }).catch(() => {});
        await refreshUser();
      }
    }
  };

  // Sauvegarde Devises (locale à l'appareil — hors périmètre de ce correctif).
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

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{loadError}</p>
      )}

      {/* Éditeur de Reçu Thermique avec Live Preview — remonté une fois le
          vrai profil chargé pour que le formulaire parte des bonnes valeurs
          (CompanyReceiptSettings ne lit `initialData` qu'à son montage). */}
      {companyData ? (
        <CompanyReceiptSettings key="loaded" initialData={companyData} onSave={handleSaveCompany} />
      ) : (
        !loadError && <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      )}

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
