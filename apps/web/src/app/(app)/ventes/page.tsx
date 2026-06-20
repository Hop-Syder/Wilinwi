'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend (Route: ventes) — historique du jour, détail, annulation, reçu
 */

import { useEffect, useMemo, useState } from 'react';
import { Receipt as ReceiptIcon, Ban, Eye } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ReceiptModal, type ReceiptSale } from '@/components/receipt';

interface Sale extends ReceiptSale {
  status: 'COMPLETED' | 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CANCELLED';
}

const STATUS: Record<Sale['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  COMPLETED: { label: 'Payée', tone: 'success' },
  PENDING_PAYMENT: { label: 'Crédit/Acompte', tone: 'warning' },
  PENDING_APPROVAL: { label: 'À valider', tone: 'warning' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

export default function VentesPage() {
  const { user } = useAuth();
  const canCancel = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setSales(await apiGet<Sale[]>('/api/pos/sales/today'));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const ok = sales.filter((s) => s.status !== 'CANCELLED');
    return {
      count: ok.length,
      ca: ok.reduce((s, v) => s + v.total, 0),
      encaisse: ok.reduce((s, v) => s + v.montantVerse, 0),
    };
  }, [sales]);

  async function cancel(id: string) {
    if (!window.confirm('Annuler cette vente ? Le stock sera ré-entré et les encaissements inversés.'))
      return;
    setBusy(true);
    try {
      await apiPost(`/api/pos/sales/${id}/cancel`, {});
      setDetail(null);
      await load();
    } catch (e) {
      alert((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand">Ventes du jour</h1>
      <p className="mt-1 text-sm text-slate-500">Historique, reçus et annulations.</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Badge tone="brand">{totals.count} vente(s)</Badge>
        <Badge tone="success">CA : {formatFCFA(totals.ca)}</Badge>
        <Badge tone="neutral">Encaissé : {formatFCFA(totals.encaisse)}</Badge>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Heure</th>
              <th className="px-4 py-3 font-medium">Articles</th>
              <th className="px-4 py-3 font-medium">Paiement</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 tabular text-slate-500">
                  {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {s.items.reduce((n, it) => n + it.quantite, 0)} article(s)
                </td>
                <td className="px-4 py-2 text-slate-600">{PAYMENT_METHOD_LABELS[s.paymentMethod]}</td>
                <td className="px-4 py-2">
                  <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                </td>
                <td className="tabular px-4 py-2 text-right font-medium">{formatFCFA(s.total)}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setDetail(s)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      title="Détail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setReceipt(s)}
                      className="rounded-lg p-1.5 text-brand hover:bg-brand-50"
                      title="Reçu"
                    >
                      <ReceiptIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Aucune vente aujourd'hui.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}

      {detail && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={() => setDetail(null)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-display text-xl font-bold text-brand">
                Vente {detail.id.slice(0, 8).toUpperCase()}
              </h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <Badge tone={STATUS[detail.status].tone}>{STATUS[detail.status].label}</Badge>
              {new Date(detail.createdAt).toLocaleString('fr-FR')}
            </div>

            <ul className="mt-4 divide-y divide-slate-100">
              {detail.items.map((it) => (
                <li key={it.id} className="flex justify-between py-2 text-sm">
                  <span>
                    {it.quantite}× {it.product?.nom ?? 'Article'}
                  </span>
                  <span className="tabular">{formatFCFA(it.prixReel * it.quantite)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-bold">
              <span>Total</span>
              <span className="tabular text-brand">{formatFCFA(detail.total)}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setReceipt(detail)}>
                <ReceiptIcon className="h-4 w-4" /> Reçu
              </Button>
              {canCancel && detail.status !== 'CANCELLED' && (
                <Button variant="danger" className="flex-1" disabled={busy} onClick={() => cancel(detail.id)}>
                  <Ban className="h-4 w-4" /> Annuler
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
