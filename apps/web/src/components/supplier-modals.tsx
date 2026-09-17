import Link from 'next/link';
import { useState } from 'react';
import { X, Printer, FileDown, CheckCircle2 } from 'lucide-react';
import { Button, Input, Badge } from '@wilinwi/ui';
import { apiPost, apiPatch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { generatePurchaseOrderPdf } from '@/lib/purchase-order-pdf';
import type { SupplierDto, PurchaseOrderDto } from '@wilinwi/types';

interface SupplierFormModalProps {
  supplier?: SupplierDto | null;
  onClose: () => void;
  onSuccess: (supplier?: SupplierDto) => void;
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
        const updated = await apiPatch<SupplierDto>(`/api/suppliers/${supplier.id}`, payload);
        onSuccess(updated);
      } else {
        const created = await apiPost<SupplierDto>('/api/suppliers', payload);
        onSuccess(created);
      }
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
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      await generatePurchaseOrderPdf(order, user?.boutiqueNom ?? 'Wilinwi');
    } finally {
      setDownloading(false);
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Brouillon',
    ORDERED: 'Commandé',
    PARTIAL: 'Reçu Partiel',
    RECEIVED: 'Reçu Total',
    CANCELLED: 'Annulé',
  };

  const STATUS_TONES: Record<string, 'outline' | 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
    DRAFT: 'neutral',
    ORDERED: 'brand',
    PARTIAL: 'warning',
    RECEIVED: 'success',
    CANCELLED: 'danger',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Bon de Commande</h2>
              <Badge tone={STATUS_TONES[order.statut] ?? 'neutral'}>
                {STATUS_LABELS[order.statut] ?? order.statut}
              </Badge>
            </div>
            <p className="text-slate-500 font-mono text-sm mt-1">Réf : #{order.reference}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {(order.statut === 'ORDERED' || order.statut === 'PARTIAL') && (
              <Link
                href={`/entrepot/reception/${order.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Réceptionner</span>
              </Link>
            )}
            <Button size="sm" onClick={() => void downloadPdf()} disabled={downloading} className="rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white">
              <FileDown className="mr-1.5 h-3.5 w-3.5" /> {downloading ? 'Génération…' : 'PDF'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="rounded-xl text-xs font-bold">
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer
            </Button>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 text-sm bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
          <div>
            <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-2">Détails de la commande</h3>
            <div className="space-y-1.5">
              <p><span className="text-slate-500">Date d'émission :</span> <span className="font-semibold text-slate-900">{new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
              <p><span className="text-slate-500">Boutique destinataire :</span> <span className="font-semibold text-slate-900">{order.etablissementNom ?? 'Toutes les boutiques'}</span></p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-2">Fournisseur</h3>
            <div className="space-y-1.5">
              <p className="font-extrabold text-slate-900 text-base">{order.fournisseurNom || 'Fournisseur non spécifié'}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
          <table className="w-full text-sm text-left min-w-[460px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-right">Prix Unitaire</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.productNom}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{item.quantiteCommandee}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{item.prixUnitaire.toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{(item.quantiteCommandee * item.prixUnitaire).toLocaleString('fr-FR')} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-6">
          <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <span>Sous-total</span>
              <span className="font-mono font-semibold">{order.montantTotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between items-center font-extrabold text-base text-slate-900 pt-2 border-t border-slate-200">
              <span>Total TTC</span>
              <span className="font-mono text-teal-700">{order.montantTotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between items-center text-emerald-700 pt-1 text-xs font-bold">
              <span>Déjà réglé</span>
              <span className="font-mono">{order.montantPaye.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="text-sm bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-slate-700">
            <strong className="text-slate-900 block mb-1">Notes / Instructions :</strong>
            {order.notes}
          </div>
        )}
      </div>
    </div>
  );
}
