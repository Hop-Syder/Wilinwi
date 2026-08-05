'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend Paramètres & Configuration (Route: /parametres)
 *   Centre de contrôle, sécurité et audit à 5 Onglets (Tabs UI) :
 *   1. Profil Entreprise & Personnalisation Reçus + Live Thermal Preview
 *   2. Équipe, Rôles & Codes PIN Caissier
 *   3. Établissements & Dépôts
 *   4. Journal d'Audit & Sécurité (Audit Trail)
 *   5. Devises, Plan & Préférences
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { apiPatch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

import { CompanyReceiptSettings, type CompanyReceiptData } from '@/components/parametres/company-receipt-settings';
import { TeamPinSettings, type TeamMember } from '@/components/parametres/team-pin-settings';
import { StoresSettings, type StoreEtablissement } from '@/components/parametres/stores-settings';
import { AuditTrailSettings, type AuditLogItem } from '@/components/parametres/audit-trail-settings';
import { PreferencesSettings, type CurrencyConfig } from '@/components/parametres/preferences-settings';

export default function ParametresPage() {
  const { user } = useAuth();

  // Onglet Actif (Tabs UI)
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'TEAM' | 'STORES' | 'AUDIT' | 'PREFERENCES'>('COMPANY');

  // Données
  const [companyData, setCompanyData] = useState<CompanyReceiptData>({
    raisonSociale: user?.etablissements?.[0]?.nom || 'Wilinwi Boutique Prestige',
    nouveauIfu: '3202612345678',
    telephone: '+229 97 00 00 00',
    adresse: 'Agblangandan, Cotonou',
    receiptHeader: 'Vente de Prêt-à-Porter & Accessoires de Mode',
    receiptFooter: 'Merci de votre confiance ! Les marchandises vendues ne sont ni reprises ni échangées.',
    paperFormat: '80mm',
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: 'usr-1',
      nom: user?.nom || 'Admin Principal',
      email: user?.email || 'admin@wilinwi.com',
      role: 'OWNER',
      pinCode: '0000',
      actif: true,
      permissions: { allowDiscountOver10: true, allowSaleCancel: true, allowStockAdjustment: true, allowViewGlobalRevenue: true },
    },
    {
      id: 'usr-2',
      nom: 'Koffi Christian',
      email: 'koffi@wilinwi.com',
      role: 'MANAGER',
      pinCode: '1234',
      actif: true,
      permissions: { allowDiscountOver10: true, allowSaleCancel: true, allowStockAdjustment: true, allowViewGlobalRevenue: false },
    },
    {
      id: 'usr-3',
      nom: 'Yvette Caissière',
      email: 'yvette@wilinwi.com',
      role: 'CASHIER',
      pinCode: '5678',
      actif: true,
      permissions: { allowDiscountOver10: false, allowSaleCancel: false, allowStockAdjustment: false, allowViewGlobalRevenue: false },
    },
  ]);

  const [stores, setStores] = useState<StoreEtablissement[]>([
    { id: 'etab-1', nom: 'Boutique Cotonou Ganhi', type: 'BOUTIQUE', adresse: 'Rue du Commerce', ville: 'Cotonou', telephone: '+229 97 00 00 00', isDefault: true, actif: true },
    { id: 'etab-2', nom: 'Dépôt Agblangandan', type: 'ENTREPOT', adresse: 'Carrefour Agblangandan', ville: 'Sèmè-Kpodji', telephone: '+229 96 11 22 33', isDefault: false, actif: true },
    { id: 'etab-3', nom: 'Boutique Calavi', type: 'BOUTIQUE', adresse: 'Kpota Calavi', ville: 'Abomey-Calavi', telephone: '+229 95 44 55 66', isDefault: false, actif: true },
  ]);

  const [auditLogs] = useState<AuditLogItem[]>([
    { id: 'log-1', action: 'Annulation du ticket #1042', category: 'SALE_CANCEL', userNom: 'Koffi Christian', userRole: 'GÉRANT', details: 'Erreur de saisie d’article', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'log-2', action: 'Remise exceptionnelle de 15%', category: 'DISCOUNT_OVER', userNom: 'Koffi Christian', userRole: 'GÉRANT', details: 'Remise accordée au client VIP Mme Akpovi', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'log-3', action: 'Ajustement de stock de -5 unités', category: 'STOCK_ADJUST', userNom: 'Yvette Caissière', userRole: 'CAISSIÈRE', details: 'Produit défectueux / Casse', createdAt: new Date(Date.now() - 14400000).toISOString() },
    { id: 'log-4', action: 'Clôture de caisse avec écart de -1 500 FCFA', category: 'CASH_DISCREPANCY', userNom: 'Yvette Caissière', userRole: 'CAISSIÈRE', details: 'Erreur de rendu de monnaie', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ]);

  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({
    primaryCurrency: 'FCFA',
    secondaryCurrencies: ['GNF', 'USD'],
  });

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-parametres-tabs',
      title: 'Centre de Contrôle & Configuration',
      content: 'Naviguez entre le profil entreprise, la gestion de l’équipe, les boutiques et le journal d’audit.',
      position: 'bottom',
    },
  ];

  // Sauvegarde Profil & Reçus
  const handleSaveCompany = async (data: CompanyReceiptData) => {
    setCompanyData(data);
    await apiPatch('/api/admin/tenant', {
      nom: data.raisonSociale,
    }).catch(() => {});
  };

  // Sauvegarde Membre d'Équipe
  const handleSaveMember = async (member: Partial<TeamMember>) => {
    if (member.id) {
      setTeamMembers((prev) => prev.map((m) => (m.id === member.id ? ({ ...m, ...member } as TeamMember) : m)));
    } else {
      const newMember: TeamMember = {
        id: `usr-${Date.now()}`,
        nom: member.nom || 'Collaborateur',
        email: member.email || '',
        role: member.role || 'CASHIER',
        pinCode: member.pinCode || '1234',
        actif: true,
        permissions: member.permissions,
      };
      setTeamMembers((prev) => [...prev, newMember]);
    }
  };

  // Sauvegarde Établissement
  const handleSaveStore = async (store: Partial<StoreEtablissement>) => {
    if (store.id) {
      setStores((prev) => prev.map((s) => (s.id === store.id ? ({ ...s, ...store } as StoreEtablissement) : s)));
    } else {
      const newStore: StoreEtablissement = {
        id: `etab-${Date.now()}`,
        nom: store.nom || 'Nouvel Établissement',
        type: store.type || 'BOUTIQUE',
        adresse: store.adresse,
        ville: store.ville,
        telephone: store.telephone,
        isDefault: false,
        actif: true,
      };
      setStores((prev) => [...prev, newStore]);
    }
  };

  // Définition Établissement Principal
  const handleSetDefaultStore = async (id: string) => {
    setStores((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.id === id,
      }))
    );
  };

  // Sauvegarde Devises
  const handleSaveCurrencies = async (cfg: CurrencyConfig) => {
    setCurrencyConfig(cfg);
  };

  // Export CSV du Journal d'Audit
  const handleExportAuditCsv = () => {
    const header = ['Horodatage', 'Catégorie', 'Opérateur', 'Rôle', 'Action', 'Détails / Motif'];
    const rows = auditLogs.map((l) => [
      new Date(l.createdAt).toLocaleString('fr-FR'),
      l.category,
      l.userNom,
      l.userRole,
      (l.action ?? '').replace(/"/g, '""'),
      (l.details ?? '').replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_audit_wilinwi_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 select-none relative">
      {/* En-tête de page avec Thème Indigo/Violet Contextuel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
              <Settings className="h-6 w-6 text-indigo-600" /> Paramètres & Configuration
            </h1>

            {/* Menu d'Onglets Fluides (Tabs UI) */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80" id="tour-parametres-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('COMPANY')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'COMPANY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🏢 Entreprise & Reçus
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TEAM')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'TEAM' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                👥 Équipe & PIN
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STORES')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'STORES' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🏬 Établissements
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AUDIT')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'AUDIT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🛡️ Journal d'Audit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREFERENCES')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'PREFERENCES' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🔤 Devises & Plan
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {activeTab === 'COMPANY' && 'Configuration légale de l’entreprise et éditeur de ticket thermique imprimable'}
            {activeTab === 'TEAM' && 'Gestion de l’équipe, des rôles, des codes PIN caissier et de la matrice d’autorisations'}
            {activeTab === 'STORES' && 'Gestion multi-boutiques et points de stockage'}
            {activeTab === 'AUDIT' && 'Historique d’audit trail horodaté de toutes les actions sensibles'}
            {activeTab === 'PREFERENCES' && 'Devises de conversion, plan d’abonnement et sécurité'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ContextualHelp
            storageKey="wilinwi_parametres_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Branding Reçu Thermique', description: 'Personnalisez l’en-tête, le pied de page et prévisualisez le ticket modèle en direct.' },
              { title: 'Changement Rapide de Caissier', description: 'Définissez des codes PIN 4 chiffres pour passer d’un caissier à l’autre en 1 seconde.' },
              { title: 'Audit Trail', description: 'Consultez l’historique horodaté des annulations de ticket et remises exceptionnelles.' },
            ]}
          />
        </div>
      </div>

      {/* Rendu de l'Onglet Actif */}
      {activeTab === 'COMPANY' && (
        <CompanyReceiptSettings initialData={companyData} onSave={handleSaveCompany} />
      )}

      {activeTab === 'TEAM' && (
        <TeamPinSettings members={teamMembers} onSaveMember={handleSaveMember} />
      )}

      {activeTab === 'STORES' && (
        <StoresSettings stores={stores} onSaveStore={handleSaveStore} onSetDefaultStore={handleSetDefaultStore} />
      )}

      {activeTab === 'AUDIT' && (
        <AuditTrailSettings logs={auditLogs} onExportCsv={handleExportAuditCsv} />
      )}

      {activeTab === 'PREFERENCES' && (
        <PreferencesSettings
          initialConfig={currencyConfig}
          currentPlan={user?.plan ?? 'PRO'}
          onSaveCurrencies={handleSaveCurrencies}
        />
      )}
    </div>
  );
}
