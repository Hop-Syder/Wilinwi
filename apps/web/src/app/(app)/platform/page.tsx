/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Console Platform Super-admin pour superviser toutes les entreprises de Wilinwi.
 * @created 2026-06-29
 * @updated 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  Users, 
  Store, 
  Calendar, 
  ShieldCheck,
  ChevronRight, 
  X, 
  RefreshCw,
  Sparkles,
  MapPin
} from 'lucide-react';
import { Button, Card, Badge, Input, StatCard } from '@wilinwi/ui';
import { apiGet, ApiError } from '@/lib/api';
import type { PlatformTenantDto, PlatformEtablissementDto } from '@wilinwi/types';

export default function PlatformPage() {
  const [tenants, setTenants] = useState<PlatformTenantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Détails du tenant sélectionné
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantDto | null>(null);
  const [etablissements, setEtablissements] = useState<PlatformEtablissementDto[]>([]);
  const [loadingEtabs, setLoadingEtabs] = useState(false);
  const [etabsError, setEtabsError] = useState<string | null>(null);

  async function loadTenants() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PlatformTenantDto[]>('/api/platform/tenants');
      setTenants(data);
    } catch (err) {
      setError((err as ApiError).message || 'Impossible de récupérer la liste des entreprises.');
    } finally {
      setLoading(false);
    }
  }

  async function loadEtablissements(tenant: PlatformTenantDto) {
    setSelectedTenant(tenant);
    setLoadingEtabs(true);
    setEtabsError(null);
    setEtablissements([]);
    try {
      const data = await apiGet<PlatformEtablissementDto[]>(`/api/platform/tenants/${tenant.id}/etablissements`);
      setEtablissements(data);
    } catch (err) {
      setEtabsError((err as ApiError).message || 'Impossible de charger les établissements.');
    } finally {
      setLoadingEtabs(false);
    }
  }

  useEffect(() => {
    void loadTenants();
  }, []);

  const filteredTenants = tenants.filter(t => 
    t.nom.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  // Statistiques calculées
  const totalTenants = tenants.length;
  const totalUsers = tenants.reduce((acc, t) => acc + Number(t.activeUsersCount), 0);
  const totalEtabs = tenants.reduce((acc, t) => acc + Number(t.etablissementsCount), 0);
  const premiumTenants = tenants.filter(t => t.plan !== 'STARTER').length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight">Console Plateforme</h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Supervisez les boutiques, abonnements et points de vente enregistrés sur Wilinwi.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadTenants} 
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Cartes KPI (Premium Black Luxury Design) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Boutiques"
          value={loading ? '...' : totalTenants.toString()}
          hint="Inscrites sur la plateforme"
          icon={<Building2 className="h-4.5 w-4.5" />}
          accent="brand"
        />
        <StatCard
          label="Collaborateurs"
          value={loading ? '...' : totalUsers.toString()}
          hint="Utilisateurs actifs"
          icon={<Users className="h-4.5 w-4.5" />}
          accent="brand"
        />
        <StatCard
          label="Points de Vente"
          value={loading ? '...' : totalEtabs.toString()}
          hint="Établissements physiques"
          icon={<Store className="h-4.5 w-4.5" />}
          accent="emerald"
        />
        <StatCard
          label="Abonnements Payants"
          value={loading ? '...' : premiumTenants.toString()}
          hint="Plans Pro / Business / Enterprise"
          icon={<Sparkles className="h-4.5 w-4.5" />}
          accent="gold"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Liste des entreprises (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="p-4 border-b border-border flex items-center justify-between gap-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                🏢 Entreprises enregistrées
                {!loading && <Badge variant="neutral">{filteredTenants.length}</Badge>}
              </h2>
              {/* Barre de recherche */}
              <div className="relative w-full max-w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  placeholder="Rechercher boutique..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-1 h-9 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm mt-3">Chargement des données de la plateforme...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-danger">
                <p className="font-semibold">{error}</p>
                <Button variant="outline" size="sm" onClick={loadTenants} className="mt-4">
                  Réessayer
                </Button>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="py-16 text-center text-text-secondary text-sm">
                Aucune boutique ne correspond à vos critères.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-hover/50 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      <th className="p-4">Boutique</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Utilisateurs / Etabs</th>
                      <th className="p-4">Créée le</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map(t => {
                      const isSelected = selectedTenant?.id === t.id;
                      return (
                        <tr 
                          key={t.id} 
                          onClick={() => loadEtablissements(t)}
                          className={`border-b border-border hover:bg-surface-hover cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="font-extrabold text-text-primary">{t.nom}</div>
                            <div className="text-[10px] text-text-secondary font-mono mt-0.5 truncate max-w-[150px]">{t.id}</div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                t.plan === 'STARTER' ? 'neutral' :
                                t.plan === 'PRO' ? 'brand' :
                                t.plan === 'BUSINESS' ? 'warning' : 'success'
                              }
                            >
                              {t.plan}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={t.subscriptionStatus === 'ACTIVE' ? 'success' : 'danger'}
                            >
                              {t.subscriptionStatus === 'ACTIVE' ? 'Actif' : 'Impayé'}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-start gap-3">
                              <span className="flex items-center gap-1 font-semibold text-text-primary" title="Utilisateurs actifs">
                                <Users className="h-3.5 w-3.5 text-text-secondary" /> {t.activeUsersCount}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-text-primary" title="Établissements">
                                <Store className="h-3.5 w-3.5 text-text-secondary" /> {t.etablissementsCount}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-text-secondary text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-text-secondary/60" />
                              {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <ChevronRight className={`h-4 w-4 transition-transform text-text-secondary ${isSelected ? 'translate-x-1 text-primary' : ''}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Détails du tenant sélectionné (Col 3) */}
        <div>
          {selectedTenant ? (
            <Card className="sticky top-20 border-primary/20 bg-gradient-to-b from-surface to-surface/90 shadow-md">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-text-primary">Détails de l&apos;entreprise</h3>
                  <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[180px]">{selectedTenant.nom}</p>
                </div>
                <button 
                  onClick={() => setSelectedTenant(null)}
                  className="rounded p-1 hover:bg-surface-hover text-text-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Métadonnées de l'entreprise */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-hover/30 p-3 rounded-lg border border-border">
                  <div>
                    <div className="text-text-secondary font-medium">Plan en cours</div>
                    <div className="font-bold text-text-primary mt-1">{selectedTenant.plan}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary font-medium">Statut abt.</div>
                    <div className="font-bold text-text-primary mt-1">{selectedTenant.subscriptionStatus}</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50 mt-1">
                    <div className="text-text-secondary font-medium">Identifiant unique (ID)</div>
                    <div className="font-mono text-[10px] text-text-primary mt-1 select-all break-all">{selectedTenant.id}</div>
                  </div>
                </div>

                {/* Liste des points de vente (établissements) */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-primary" />
                    Points de vente ({etablissements.length})
                  </h4>

                  {loadingEtabs ? (
                    <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs mt-2">Chargement des établissements...</span>
                    </div>
                  ) : etabsError ? (
                    <div className="text-center py-4 text-xs text-danger">
                      {etabsError}
                    </div>
                  ) : etablissements.length === 0 ? (
                    <div className="text-center py-6 text-xs text-text-secondary italic">
                      Aucun établissement trouvé pour cette boutique.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {etablissements.map(e => (
                        <div 
                          key={e.id} 
                          className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl shadow-sm hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/5 text-primary shrink-0 mt-0.5">
                              <MapPin className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs text-text-primary truncate">{e.nom}</div>
                              <div className="text-[10px] text-text-secondary font-semibold uppercase mt-0.5">{e.type}</div>
                            </div>
                          </div>
                          <Badge variant={e.actif ? 'success' : 'neutral'}>
                            {e.actif ? 'Actif' : 'Désactivé'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center text-text-secondary h-[350px]">
              <Building2 className="h-10 w-10 text-text-secondary/40 stroke-1" />
              <h3 className="font-bold text-sm text-text-primary mt-3">Aucune sélection</h3>
              <p className="text-xs mt-1 max-w-[200px]">
                Cliquez sur une entreprise dans la liste pour voir ses établissements et ses détails opérationnels.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
