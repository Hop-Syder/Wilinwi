/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant des filtres de recherche pour la page Ventes
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Search, Store } from 'lucide-react';
import { Button, Card } from '@wilinwi/ui';
import type { ClientDto } from '@wilinwi/types';

interface VentesFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterPeriod: 'TODAY' | '7DAYS' | 'MONTH' | 'CUSTOM';
  setFilterPeriod: (val: 'TODAY' | '7DAYS' | 'MONTH' | 'CUSTOM') => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterClientId: string;
  setFilterClientId: (val: string) => void;
  filterEtablissementId: string;
  setFilterEtablissementId: (val: string) => void;
  customFrom: string;
  setCustomFrom: (val: string) => void;
  customTo: string;
  setCustomTo: (val: string) => void;
  isGlobalView: boolean;
  etablissements: Array<{ id: string; nom: string }>;
  clients: ClientDto[];
  busy: boolean;
  onSearch: () => void;
}

export function VentesFilters({
  searchQuery,
  setSearchQuery,
  filterPeriod,
  setFilterPeriod,
  filterStatus,
  setFilterStatus,
  filterClientId,
  setFilterClientId,
  filterEtablissementId,
  setFilterEtablissementId,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  isGlobalView,
  etablissements,
  clients,
  busy,
  onSearch,
}: VentesFiltersProps) {
  return (
    <Card id="tour-ventes-filters" className="p-4 border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
        {/* Recherche */}
        <div className="flex-1 space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Recherche</label>
          <div className="relative">
            <input
              type="text"
              placeholder="N° vente, client, produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Période */}
        <div className="w-full lg:w-48 space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Période</label>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
          >
            <option value="TODAY">Aujourd'hui</option>
            <option value="7DAYS">7 derniers jours</option>
            <option value="MONTH">Ce mois</option>
            <option value="CUSTOM">Personnalisé</option>
          </select>
        </div>

        {/* Statut */}
        <div className="w-full lg:w-48 space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="COMPLETED">Payée</option>
            <option value="PENDING_PAYMENT">Crédit / Acompte</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>

        {/* Filtre Boutique (vue globale) ou Client (vue boutique) */}
        {isGlobalView ? (
          <div className="w-full lg:w-56 space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" /> Boutique
            </label>
            <select
              value={filterEtablissementId}
              onChange={(e) => setFilterEtablissementId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
            >
              <option value="">Toutes les boutiques</option>
              {etablissements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="w-full lg:w-56 space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</label>
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
            >
              <option value="">Tous les clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} {c.telephone ? `(${c.telephone})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bouton de recherche manuelle */}
        <Button onClick={onSearch} disabled={busy} className="lg:w-32 shrink-0">
          {busy ? 'Chargement...' : 'Rechercher'}
        </Button>
      </div>

      {/* Inputs dates personnalisées */}
      {filterPeriod === 'CUSTOM' && (
        <div className="flex gap-4 items-center border-t border-slate-100 pt-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 font-medium">Du</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 font-medium">Au</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
