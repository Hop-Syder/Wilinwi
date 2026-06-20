'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend CRM (Route: clients) — fiches clients, dettes, remboursements
 */

import { useEffect, useState } from 'react';
import { Plus, Users, Phone, Wallet } from 'lucide-react';
import { canSeeClientCredit, type ClientDto } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

interface ClientDetail {
  client: ClientDto;
  ventesACredit: { id: string; total: number; montantVerse: number; createdAt: string }[];
  remboursements: { id: string; montant: number; createdAt: string; note: string | null }[];
}

export default function ClientsPage() {
  const { user } = useAuth();
  const seeCredit = user ? canSeeClientCredit(user.role) : false;
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-clients-new',
      title: 'Gérer vos clients',
      content: 'Créez une fiche client avec ses coordonnées et définissez un plafond de crédit si nécessaire.',
      position: 'bottom',
    },
    {
      targetId: 'tour-clients-list',
      title: 'Liste et suivi des dettes',
      content: 'Retrouvez tous vos clients ici. Cliquez sur une fiche pour voir le détail des ventes à crédit et enregistrer un remboursement.',
      position: 'bottom',
    }
  ];

  async function load() {
    try {
      setClients(await apiGet<ClientDto[]>('/api/crm/clients'));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">Fiches clients, crédits et remboursements.</p>
        </div>
        <div className="flex items-center gap-2" id="tour-clients-new">
          <ContextualHelp 
            storageKey="wilinwi_clients_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Vente à crédit', description: 'Le crédit s\'enregistre automatiquement lors d\'une vente en Caisse avec le mode "Acompte/Crédit".' },
              { title: 'Remboursement de dette', description: 'Cliquez sur la fiche d\'un client, puis saisissez le montant remboursé pour mettre à jour son solde.' }
            ]}
          />
          {canWrite && (
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4" /> Nouveau client
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {showForm && canWrite && (
        <NewClientForm
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" id="tour-clients-list">
        {clients.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{c.nom}</span>
              {seeCredit && c.soldeCredit !== undefined && (
                <Badge tone={c.soldeCredit > 0 ? 'danger' : 'success'}>
                  {formatFCFA(c.soldeCredit)}
                </Badge>
              )}
            </div>
            {c.telephone && (
              <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                <Phone className="h-3.5 w-3.5" /> {c.telephone}
              </div>
            )}
            {seeCredit && (
              <div className="mt-2 text-xs text-slate-400">
                Plafond : {c.plafondCredit == null ? 'illimité' : formatFCFA(c.plafondCredit)}
              </div>
            )}
          </button>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
            <Users className="mx-auto mb-2 h-8 w-8" />
            Aucun client. Créez-en un pour suivre les crédits.
          </div>
        )}
      </div>

      {selected && (
        <ClientDetailDrawer
          clientId={selected}
          seeCredit={seeCredit}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ nom: '', telephone: '', plafondCredit: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/crm/clients', {
        nom: form.nom,
        telephone: form.telephone || undefined,
        plafondCredit: form.plafondCredit ? Number(form.plafondCredit) : null,
      });
      onCreated();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Nom" value={form.nom} onChange={set('nom')} required />
        <Field label="Téléphone" value={form.telephone} onChange={set('telephone')} />
        <Field
          label="Plafond crédit (vide = illimité)"
          type="number"
          value={form.plafondCredit}
          onChange={set('plafondCredit')}
        />
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <div className="col-span-full">
          <Button type="submit" variant="emerald" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le client'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ClientDetailDrawer({
  clientId,
  seeCredit,
  onClose,
  onChanged,
}: {
  clientId: string;
  seeCredit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const canCollect =
    user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'CASHIER';
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [montant, setMontant] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setDetail(await apiGet<ClientDetail>(`/api/crm/clients/${clientId}`));
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function repay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/crm/clients/${clientId}/payments`, { montant: Number(montant) });
      setMontant('');
      await load();
      onChanged();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!detail ? (
          <p className="text-slate-400">Chargement…</p>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-brand">{detail.client.nom}</h2>
                {detail.client.telephone && (
                  <p className="text-sm text-slate-400">{detail.client.telephone}</p>
                )}
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {seeCredit && detail.client.soldeCredit !== undefined && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Wallet className="h-4 w-4" /> Dette en cours
                </div>
                <div className="tabular mt-1 text-2xl font-bold text-brand">
                  {formatFCFA(detail.client.soldeCredit)}
                </div>
                <div className="text-xs text-slate-400">
                  Plafond :{' '}
                  {detail.client.plafondCredit == null
                    ? 'illimité'
                    : formatFCFA(detail.client.plafondCredit)}
                </div>
              </div>
            )}

            {seeCredit && canCollect && (detail.client.soldeCredit ?? 0) > 0 && (
              <form onSubmit={repay} className="mt-4 flex gap-2">
                <input
                  type="number"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Montant remboursé"
                  className="tabular flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <Button type="submit" variant="emerald" disabled={busy}>
                  Encaisser
                </Button>
              </form>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <h3 className="mt-6 font-display font-semibold text-slate-700">Ventes à crédit</h3>
            {detail.ventesACredit.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">Aucune.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {detail.ventesACredit.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span className="text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="tabular">
                      {formatFCFA(s.montantVerse)} / {formatFCFA(s.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-6 font-display font-semibold text-slate-700">Remboursements</h3>
            {detail.remboursements.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">Aucun.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {detail.remboursements.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="tabular text-emerald-700">{formatFCFA(p.montant)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
