import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from '@wilinwi/ui';
import { apiPost, apiPatch, ApiError } from '@/lib/api';
import type { SupplierDto } from '@wilinwi/types';

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

interface RecordPaymentModalProps {
  supplier: SupplierDto;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordSupplierPaymentModal({ supplier, onClose, onSuccess }: RecordPaymentModalProps) {
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
      await apiPost(`/api/suppliers/${supplier.id}/payments`, {
        montant: Number(montant),
        methode,
        note: note || null,
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
