/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modales de validation d'encaissement et de succès pour la caisse (POS)
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState, useEffect } from 'react';
import { Button, Input, Select } from '@wilinwi/ui';
import { PaymentMethod, ClientDto } from '@wilinwi/types';
import { CheckCircle2, Receipt, Share2, X, RotateCcw } from 'lucide-react';

export interface CheckoutResult {
  paymentMethod: PaymentMethod;
  clientId?: string;
  montantVerse?: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  clients: ClientDto[];
  onConfirm: (result: CheckoutResult) => void;
}

export function CheckoutModal({ isOpen, onClose, cartTotal, clients, onConfirm }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [clientId, setClientId] = useState<string>('');
  const [montantVerse, setMontantVerse] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('CASH');
      setClientId('');
      setMontantVerse('');
      setCashReceived('');
    }
  }, [isOpen]);

  const changeToReturn = Number(cashReceived) - cartTotal;
  
  const isCreditOrInstallment = paymentMethod === 'CREDIT' || paymentMethod === 'INSTALLMENT';
  const isValid = () => {
    if (isCreditOrInstallment && !clientId) return false;
    if (paymentMethod === 'INSTALLMENT') {
      const vers = Number(montantVerse);
      if (vers <= 0 || vers >= cartTotal) return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (!isValid()) return;
    onConfirm({
      paymentMethod,
      clientId: clientId || undefined,
      montantVerse: paymentMethod === 'INSTALLMENT' ? Number(montantVerse) : undefined,
    });
  };

  const paymentOptions: { label: string, value: PaymentMethod }[] = [
    { label: 'Espèces', value: 'CASH' },
    { label: 'MoMo', value: 'MTN_MOMO' },
    { label: 'Moov', value: 'MOOV_MONEY' },
    { label: 'Banque', value: 'BANK_TRANSFER' },
    { label: 'Crédit', value: 'CREDIT' },
    { label: 'Acompte', value: 'INSTALLMENT' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="text-xl font-bold mb-4 flex justify-between items-center">
          <span>Encaissement</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 rounded-lg bg-slate-50 p-4 text-center">
          <span className="block text-sm text-slate-500 mb-1">Total à payer</span>
          <span className="text-3xl font-black text-brand">{cartTotal.toLocaleString()} F</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mode de paiement</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`py-2 px-1 text-sm rounded-md border font-medium transition-colors ${
                    paymentMethod === opt.value
                      ? 'bg-brand text-white border-brand font-bold'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'CASH' && (
            <div className="pt-2">
              <label className="block text-sm font-medium mb-1">Espèces reçues (optionnel)</label>
              <Input
                type="number"
                placeholder="Ex: 10000"
                value={cashReceived}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCashReceived(e.target.value)}
              />
              {cashReceived && Number(cashReceived) > 0 && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Monnaie à rendre :</span>
                  <span className={`font-bold ${changeToReturn < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {changeToReturn.toLocaleString()} F
                  </span>
                </div>
              )}
            </div>
          )}

          {isCreditOrInstallment && (
            <div className="pt-2 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-red-600">Client obligatoire *</label>
                <Select value={clientId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientId(e.target.value)}>
                  <option value="">-- Sélectionner un client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom} {c.telephone ? `(${c.telephone})` : ''}</option>
                  ))}
                </Select>
                {!clientId && <p className="text-xs text-red-500 mt-1">Vous devez lier cette dette à un client.</p>}
              </div>

              {paymentMethod === 'INSTALLMENT' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Montant versé aujourd'hui</label>
                  <Input
                    type="number"
                    placeholder="Ex: 5000"
                    value={montantVerse}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMontantVerse(e.target.value)}
                  />
                  {montantVerse && (Number(montantVerse) <= 0 || Number(montantVerse) >= cartTotal) && (
                    <p className="text-xs text-red-500 mt-1">L'acompte doit être supérieur à 0 et inférieur au total.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button 
            className="flex-1" 
            onClick={handleConfirm}
            disabled={!isValid()}
          >
            Confirmer l'encaissement
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SaleSuccessModalProps {
  isOpen: boolean;
  total: number;
  onNewSale: () => void;
  onCancelSale?: () => void;
  /** Ouvre le ticket de caisse (affichage + impression + QR). */
  onShowReceipt?: () => void;
}

export function SaleSuccessModal({ isOpen, total, onNewSale, onCancelSale, onShowReceipt }: SaleSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">
          Vente terminée
        </h3>
        <p className="text-slate-500 mb-6">
          Montant total : <span className="font-bold text-slate-800">{total.toLocaleString()} F</span>
        </p>

        <div className="space-y-3">
          {onShowReceipt && (
            <Button
              className="w-full justify-center gap-2"
              onClick={onShowReceipt}
            >
              <Receipt className="h-4 w-4" />
              Afficher le ticket
            </Button>
          )}
          <Button 
            variant="outline" 
            className="w-full justify-center gap-2"
            onClick={() => {
              window.open(`https://wa.me/?text=Merci%20pour%20votre%20achat%20de%20${total}F%20chez%20nous!`, '_blank');
            }}
          >
            <Share2 className="h-4 w-4 text-green-600" />
            Partager WhatsApp
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-center mt-4"
            onClick={onNewSale}
          >
            Nouvelle vente
          </Button>
          {onCancelSale && (
            <button 
              onClick={onCancelSale}
              className="w-full text-center text-sm text-slate-400 hover:text-red-500 pt-2 transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Annuler cette vente (Erreur)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
