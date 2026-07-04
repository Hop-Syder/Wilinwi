'use client';
/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page de réception pas-à-pas pour les bons de commande d'achat
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Truck } from 'lucide-react';
import { Button, Card, Input } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { PurchaseOrderDto } from '@wilinwi/types';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

export default function ReceptionPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [po, setPo] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Saisie des quantités reçues (clé: itemId, valeur: quantite reçue maintenant)
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [montantPaye, setMontantPaye] = useState('0');

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-reception-items',
      title: 'Saisissez les quantités reçues',
      content: 'Une réception peut être partielle : le "reste à recevoir" pour chaque produit reste ouvert pour une prochaine livraison.',
      position: 'bottom',
    },
    {
      targetId: 'tour-reception-payment',
      title: 'Paiement au fournisseur',
      content: 'Renseignez un acompte payé immédiatement ; le solde restant est automatiquement ajouté à la dette du fournisseur.',
      position: 'top',
    },
  ];

  useEffect(() => {
    async function loadPo() {
      try {
        const data = await apiGet<PurchaseOrderDto>(`/api/purchase-orders/${id}`);
        setPo(data);
        // Pré-remplir les quantités restantes à recevoir par défaut
        const inputs: Record<string, string> = {};
        for (const item of data.items) {
          const remaining = item.quantiteCommandee - item.quantiteRecue;
          inputs[item.id] = String(remaining > 0 ? remaining : 0);
        }
        setQtyInputs(inputs);
      } catch {
        setError('Impossible de charger le bon de commande.');
      } finally {
        setLoading(false);
      }
    }
    void loadPo();
  }, [id]);

  function handleQtyChange(itemId: string, value: string) {
    setQtyInputs((prev) => ({ ...prev, [itemId]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!po) return;
    
    // Construire la liste des items à réceptionner
    const rxItems = Object.entries(qtyInputs)
      .map(([itemId, val]) => ({
        itemId,
        quantite: Number(val),
      }))
      .filter((item) => item.quantite > 0);

    if (rxItems.length === 0) {
      alert('Veuillez renseigner au moins une quantité positive à réceptionner.');
      return;
    }

    // Validation locale des quantités maximales
    for (const rx of rxItems) {
      const originalItem = po.items.find((i) => i.id === rx.itemId)!;
      const remaining = originalItem.quantiteCommandee - originalItem.quantiteRecue;
      if (rx.quantite > remaining) {
        alert(
          `La quantité saisie pour ${originalItem.productNom} (${rx.quantite}) dépasse le restant commandé (${remaining}).`
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/purchase-orders/${id}/receptions`, {
        items: rxItems,
        montantPaye: Number(montantPaye),
      });
      alert('Réception validée avec succès ! Le stock a été mis à jour.');
      router.push('/entrepot');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <p className="text-sm text-slate-500">Chargement du bon de commande...</p>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Erreur de chargement</h2>
        <p className="text-sm text-slate-500">{error ?? 'Bon de commande introuvable.'}</p>
        <Link href="/entrepot">
          <Button variant="outline">Retour à l&apos;entrepôt</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link href="/entrepot" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Retour à l&apos;entrepôt
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Réception de commande</h1>
          <p className="mt-1 text-sm text-slate-500">Saisissez les quantités reçues pour le bon {po.reference}.</p>
        </div>
        <ContextualHelp
          storageKey="wilinwi_reception_tour_done"
          tourSteps={tourSteps}
          useCases={[
            { title: 'Réception partielle', description: 'Si le fournisseur livre en plusieurs fois, réceptionnez seulement ce qui arrive à chaque passage.' },
            { title: 'Mise à jour du stock', description: 'Valider la réception ajoute immédiatement les quantités reçues au stock du lieu de livraison (Magasin).' },
            { title: 'Dette fournisseur', description: 'Le montant non payé à la réception est automatiquement ajouté à la dette du fournisseur, suivie dans le module Entrepôt.' },
          ]}
        />
      </div>

      <Card className="p-4 bg-slate-50 border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="block text-xs font-semibold text-slate-400 uppercase">Référence</span>
          <span className="font-mono font-bold text-slate-900">{po.reference}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold text-slate-400 uppercase">Fournisseur</span>
          <span className="font-medium text-slate-900">{po.fournisseurNom}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold text-slate-400 uppercase">Lieu de livraison</span>
          <span className="font-medium text-slate-900">{po.etablissementNom}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold text-slate-400 uppercase">Montant Total</span>
          <span className="font-bold text-brand">{po.montantTotal.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </Card>

      <form onSubmit={submit} className="space-y-6">
        {/* Table of items */}
        <Card id="tour-reception-items" className="overflow-hidden p-0 border border-slate-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Commandé</th>
                <th className="px-4 py-3 text-right">Déjà Reçu</th>
                <th className="px-4 py-3 text-right w-36">Reçu maintenant *</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.items.map((item) => {
                const remaining = item.quantiteCommandee - item.quantiteRecue;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.productNom}</div>
                      <div className="text-xs text-slate-400">Prix unitaire: {item.prixUnitaire.toLocaleString('fr-FR')} FCFA</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{item.quantiteCommandee}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{item.quantiteRecue}</td>
                    <td className="px-4 py-3 text-right">
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        value={qtyInputs[item.id] ?? '0'}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        className="text-right py-1 px-3 text-xs w-full disabled:bg-slate-50"
                        disabled={remaining <= 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Payment input */}
        <Card id="tour-reception-payment" className="p-6 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-brand" /> Règlement à la réception
          </h3>
          <p className="text-xs text-slate-500">
            Si vous effectuez un paiement immédiat (acompte) au moment de la réception, indiquez le montant ci-dessous.
            Le reste sera automatiquement ajouté à la dette de ce fournisseur.
          </p>
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Montant Payé (FCFA)</label>
            <Input
              type="number"
              min="0"
              value={montantPaye}
              onChange={(e) => setMontantPaye(e.target.value)}
              placeholder="0"
            />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/entrepot">
            <Button type="button" variant="outline" disabled={saving}>
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Validation...' : 'Valider la réception'}
          </Button>
        </div>
      </form>
    </div>
  );
}
