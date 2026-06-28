import { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Button, Input } from '@wilinwi/ui';
import { apiPost, apiPatch, ApiError } from '@/lib/api';
import type { SupplierDto, PurchaseOrderDto } from '@wilinwi/types';

interface SupplierFormModalProps {
  supplier?: SupplierDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierFormModal({ supplier, onClose, onSuccess }: SupplierFormModalProps) {
  const [nom, setNom] = useState(supplier?.nom ?? '');
  const [telephone, setTelephone] = useState(supplier?.telephone ?? '');
  const [contact, setContact] = useState(supplier?.contact ?? '');
  const [adresse, setAdresse] = useState(supplier?.adresse ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom,
        telephone: telephone || null,
        contact: contact || null,
        adresse: adresse || null,
        notes: notes || null,
      };

      if (supplier) {
        await apiPatch(`/api/suppliers/${supplier.id}`, payload);
      } else {
        await apiPost('/api/suppliers', payload);
      }
      onSuccess();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {supplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nom *</label>
            <Input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du fournisseur" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Téléphone</label>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+229 XX XX XX XX" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact (Nom de la personne)</label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ex: Jean Dupont" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Adresse</label>
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse physique" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations complémentaires" />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useAuth } from '@/lib/auth-context';

interface RecordPaymentModalProps {
  supplier: SupplierDto;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordSupplierPaymentModal({ supplier, onClose, onSuccess }: RecordPaymentModalProps) {
  const { user } = useAuth();
  const isGlobalView = user?.etablissementId === null && (user?.etablissements?.length ?? 0) > 1;
  const [etablissementId, setEtablissementId] = useState('');

  const [montant, setMontant] = useState('');
  const [methode, setMethode] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD' | 'TRANSFER'>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isGlobalView && !etablissementId) {
        throw new Error('Veuillez sélectionner un établissement.');
      }
      await apiPost(`/api/suppliers/${supplier.id}/payments`, {
        montant: Number(montant),
        methode,
        note: note || null,
        ...(etablissementId ? { etablissementId } : {}),
      });
      onSuccess();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Enregistrer un règlement</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <p>Fournisseur : <span className="font-semibold text-slate-900">{supplier.nom}</span></p>
          <p>Dette courante : <span className="font-semibold text-brand">{supplier.soldeDette.toLocaleString('fr-FR')} FCFA</span></p>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          {isGlobalView && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Boutique / Établissement *</label>
              <select
                required
                value={etablissementId}
                onChange={(e) => setEtablissementId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand"
              >
                <option value="">Sélectionner une boutique...</option>
                {user?.etablissements?.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Montant (FCFA) *</label>
            <Input
              required
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Montant versé"
              max={supplier.soldeDette}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mode de règlement *</label>
            <select
              value={methode}
              onChange={(e) => setMethode(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand"
            >
              <option value="CASH">Espèces (Caisse)</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CARD">Carte Bancaire</option>
              <option value="TRANSFER">Virement Bancaire</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Note / Référence</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex: N° chèque ou reçu" />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Valider le paiement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PurchaseOrderInvoiceModalProps {
  order: PurchaseOrderDto;
  onClose: () => void;
}

export function PurchaseOrderInvoiceModal({ order, onClose }: PurchaseOrderInvoiceModalProps) {
  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Brouillon',
    ORDERED: 'Commandé',
    PARTIAL: 'Reçu Partiel',
    RECEIVED: 'Reçu Total',
    CANCELLED: 'Annulé',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bon de Commande</h2>
            <p className="text-slate-500 font-mono mt-1">{order.reference}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 print:hidden">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <h3 className="font-semibold text-slate-400 uppercase tracking-wider mb-2">Informations</h3>
            <div className="space-y-1">
              <p><span className="text-slate-500">Date :</span> <span className="font-medium text-slate-900">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span></p>
              <p><span className="text-slate-500">Statut :</span> <span className="font-medium text-slate-900">{STATUS_LABELS[order.statut]}</span></p>
              <p><span className="text-slate-500">Boutique :</span> <span className="font-medium text-slate-900">{order.etablissementNom ?? 'Toutes'}</span></p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-400 uppercase tracking-wider mb-2">Fournisseur</h3>
            <div className="space-y-1">
              <p className="font-bold text-slate-900">{order.fournisseurNom}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-right">Prix Unitaire</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.productNom}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.quantiteCommandee}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.prixUnitaire.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{(item.quantiteCommandee * item.prixUnitaire).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-3 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <span>Sous-total</span>
              <span>{order.montantTotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg text-brand pt-3 border-t border-slate-200">
              <span>Total TTC</span>
              <span>{order.montantTotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between items-center text-emerald-600 pt-2">
              <span>Déjà payé</span>
              <span>{order.montantPaye.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="text-sm bg-slate-50 p-4 rounded-lg text-slate-600">
            <strong className="text-slate-900 block mb-1">Notes :</strong>
            {order.notes}
          </div>
        )}
      </div>
    </div>
  );
}
