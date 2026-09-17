'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestion des établissements de l'entreprise (boutiques, points de
 *   vente, entrepôts…). CRUD réservé OWNER/MANAGER. Désactivation conseillée
 *   plutôt que suppression dès qu'il existe des données rattachées.
 */

import { useEffect, useState } from 'react';
import { Store, ArrowLeft, Plus, Pencil, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  ETABLISSEMENT_TYPES,
  ETABLISSEMENT_TYPE_LABELS,
  INFRASTRUCTURES,
  INFRASTRUCTURE_LABELS,
  type EtablissementDto,
  type EtablissementInfrastructure,
  type EtablissementType,
} from '@wilinwi/types';
import { Button, Card, Badge, Input, Select } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch, api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

type Draft = {
  id?: string;
  nom: string;
  type: EtablissementType;
  infrastructure: EtablissementInfrastructure;
  ville: string;
  adresse: string;
  telephone: string;
};

const emptyDraft: Draft = {
  nom: '',
  type: 'BOUTIQUE',
  infrastructure: 'RETAIL',
  ville: '',
  adresse: '',
  telephone: '',
};

export default function EtablissementsPage() {
  const { refreshUser } = useAuth();
  const [items, setItems] = useState<EtablissementDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setItems(await apiGet<EtablissementDto[]>('/api/etablissements/manage'));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setError(null);
    setDraft({ ...emptyDraft });
  }
  function openEdit(e: EtablissementDto) {
    setError(null);
    setDraft({
      id: e.id,
      nom: e.nom,
      type: e.type,
      infrastructure: e.infrastructure ?? 'RETAIL',
      ville: e.ville ?? '',
      adresse: e.adresse ?? '',
      telephone: e.telephone ?? '',
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        nom: draft.nom,
        type: draft.type,
        infrastructure: draft.infrastructure,
        ville: draft.ville || null,
        adresse: draft.adresse || null,
        telephone: draft.telephone || null,
      };
      if (draft.id) await apiPatch(`/api/etablissements/${draft.id}`, payload);
      else await apiPost('/api/etablissements', payload);
      setDraft(null);
      await load();
      // Rafraîchit le sélecteur du header (un nouvel établissement y apparaît).
      await refreshUser();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActif(e: EtablissementDto) {
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/etablissements/${e.id}`, { actif: !e.actif });
      await load();
      await refreshUser();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: EtablissementDto) {
    if (!window.confirm(`Supprimer définitivement « ${e.nom} » ? (Impossible si des données y sont rattachées.)`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/etablissements/${e.id}`, { method: 'DELETE' });
      await load();
      await refreshUser();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-etablissements-new',
      title: 'Créez vos établissements',
      content: 'Chaque boutique, point de vente ou entrepôt de l\'entreprise est un établissement distinct : les ventes et le stock y sont rattachés.',
      position: 'bottom',
    },
    {
      targetId: 'tour-etablissements-list',
      title: 'Gérez le cycle de vie',
      content: 'Préférez désactiver un établissement plutôt que de le supprimer dès qu\'il a des données rattachées (ventes, stock…).',
      position: 'top',
    },
  ];

  return (
    <div>
      <Link href="/parametres" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Paramètres
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Établissements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vos boutiques, points de vente, entrepôts… Chaque vente et chaque mouvement appartient à un établissement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContextualHelp
            storageKey="wilinwi_etablissements_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Magasin (entrepôt central)', description: 'Les commandes fournisseurs sont réceptionnées uniquement dans un établissement de type Magasin, puis redistribuées par Dispatch.' },
              { title: 'Suppression impossible', description: 'La suppression échoue si des ventes, du stock ou d\'autres données sont déjà rattachées à l\'établissement — désactivez-le à la place.' },
            ]}
          />
          <div id="tour-etablissements-new">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nouvel établissement
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div id="tour-etablissements-list" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((e) => (
          <Card key={e.id} className="flex items-start justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="rounded-xl bg-emerald/10 p-2.5 text-emerald shrink-0">
                <Store className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display font-semibold text-slate-800">{e.nom}</span>
                  <Badge tone={e.actif ? 'success' : 'danger'}>{e.actif ? 'Actif' : 'Inactif'}</Badge>
                </div>
                <div className="text-xs text-slate-500">
                  {ETABLISSEMENT_TYPE_LABELS[e.type]}
                  {' · '}
                  {INFRASTRUCTURE_LABELS[e.infrastructure ?? 'RETAIL']}
                </div>
                {(e.ville || e.telephone) && (
                  <div className="mt-1 truncate text-xs text-slate-400">
                    {[e.ville, e.telephone].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Modifier">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => toggleActif(e)} disabled={busy} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={e.actif ? 'Désactiver' : 'Activer'}>
                <Power className={`h-4 w-4 ${e.actif ? 'text-emerald-600' : 'text-red-500'}`} />
              </button>
              <button onClick={() => remove(e)} disabled={busy} className="rounded-lg p-1.5 text-slate-500 hover:bg-danger/10 hover:text-danger" title="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <Card className="p-10 text-center text-slate-400 sm:col-span-2">Aucun établissement.</Card>
        )}
      </div>

      {draft && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setDraft(null)}>
          <Card className="w-full max-w-lg max-h-[95vh] overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold text-brand">
              {draft.id ? "Modifier l'établissement" : 'Nouvel établissement'}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nom de l'établissement">
                <Input value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} placeholder="ex. LOLO & CO - Cotonou" />
              </Field>
              <Field label="Type">
                <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as EtablissementType })}>
                  {ETABLISSEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{ETABLISSEMENT_TYPE_LABELS[t]}</option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Infrastructure métier">
                  <Select
                    value={draft.infrastructure}
                    onChange={(e) =>
                      setDraft({ ...draft, infrastructure: e.target.value as EtablissementInfrastructure })
                    }
                  >
                    {INFRASTRUCTURES.map((i) => (
                      <option key={i} value={i}>{INFRASTRUCTURE_LABELS[i]}</option>
                    ))}
                  </Select>
                </Field>
                <p className="mt-1 text-[11px] text-slate-400">
                  Détermine les modules et règles de vente activés pour cet établissement
                  (le type ci-dessus reste la nature physique du lieu).
                </p>
              </div>
              <Field label="Ville (optionnel)">
                <Input value={draft.ville} onChange={(e) => setDraft({ ...draft, ville: e.target.value })} placeholder="ex. Cotonou" />
              </Field>
              <Field label="Téléphone (optionnel)">
                <Input value={draft.telephone} onChange={(e) => setDraft({ ...draft, telephone: e.target.value })} placeholder="ex. +229 ..." />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Adresse (optionnel)">
                  <Input value={draft.adresse} onChange={(e) => setDraft({ ...draft, adresse: e.target.value })} placeholder="ex. Carré 123, Quartier ..." />
                </Field>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>Annuler</Button>
              <Button variant="emerald" disabled={busy || !draft.nom} onClick={save}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
