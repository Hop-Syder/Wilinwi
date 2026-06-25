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
import { CheckCircle2, Receipt, Share2, X, RotateCcw, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';

export interface CheckoutResult {
  paymentMethod: PaymentMethod;
  clientId?: string;
  montantVerse?: number;
  clientNom?: string;
  clientTelephone?: string;
  aLivrer?: boolean;
  livreurId?: string;
  adresseLivraison?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  clients: ClientDto[];
  livreurs: { id: string; nom: string }[];
  onConfirm: (result: CheckoutResult) => void;
}

export function CheckoutModal({ isOpen, onClose, cartTotal, clients, livreurs, onConfirm }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [clientId, setClientId] = useState<string>('');
  const [montantVerse, setMontantVerse] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');

  // État Client
  const [associateClient, setAssociateClient] = useState(false);
  const [clientType, setClientType] = useState<'existing' | 'new'>('existing');
  const [clientNom, setClientNom] = useState('');
  const [clientTelephone, setClientTelephone] = useState('');

  // État Livraison
  const [aLivrer, setALivrer] = useState(false);
  const [livreurId, setLivreurId] = useState('');
  const [adresseLivraison, setAdresseLivraison] = useState('');

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('CASH');
      setClientId('');
      setMontantVerse('');
      setCashReceived('');
      setAssociateClient(false);
      setClientType('existing');
      setClientNom('');
      setClientTelephone('');
      setALivrer(false);
      setLivreurId('');
      setAdresseLivraison('');
    }
  }, [isOpen]);

  const changeToReturn = Number(cashReceived) - cartTotal;
  
  const isCreditOrInstallment = paymentMethod === 'CREDIT' || paymentMethod === 'INSTALLMENT';

  useEffect(() => {
    if (isCreditOrInstallment) {
      setAssociateClient(true);
    }
  }, [paymentMethod, isCreditOrInstallment]);
  
  const isValid = () => {
    if (isCreditOrInstallment && !associateClient) return false;
    
    if (associateClient) {
      if (clientType === 'existing' && !clientId) return false;
      if (clientType === 'new' && (!clientNom.trim() || !clientTelephone.trim())) return false;
    }

    if (paymentMethod === 'INSTALLMENT') {
      const vers = Number(montantVerse);
      if (vers <= 0 || vers >= cartTotal) return false;
    }

    if (aLivrer && !livreurId) return false;

    return true;
  };

  const handleConfirm = () => {
    if (!isValid()) return;
    onConfirm({
      paymentMethod,
      clientId: (associateClient && clientType === 'existing') ? (clientId || undefined) : undefined,
      montantVerse: paymentMethod === 'INSTALLMENT' ? Number(montantVerse) : undefined,
      clientNom: (associateClient && clientType === 'new') ? clientNom : undefined,
      clientTelephone: (associateClient && clientType === 'new') ? clientTelephone : undefined,
      aLivrer,
      livreurId: (aLivrer && livreurId) ? livreurId : undefined,
      adresseLivraison: (aLivrer && adresseLivraison) ? adresseLivraison : undefined,
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
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
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

          {/* Section Client */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={associateClient}
                  disabled={isCreditOrInstallment}
                  onChange={(e) => setAssociateClient(e.target.checked)}
                  className="rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span>Associer un client {isCreditOrInstallment && <span className="text-red-500 font-bold">*</span>}</span>
              </label>
            </div>

            {associateClient && (
              <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setClientType('existing')}
                    className={`flex-1 py-1 text-xs rounded border font-medium transition-all ${
                      clientType === 'existing'
                        ? 'bg-white border-slate-300 text-brand shadow-sm font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Existant
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('new')}
                    className={`flex-1 py-1 text-xs rounded border font-medium transition-all ${
                      clientType === 'new'
                        ? 'bg-white border-slate-300 text-brand shadow-sm font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Nouveau
                  </button>
                </div>

                {clientType === 'existing' ? (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600">Sélectionner le client</label>
                    <Select value={clientId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientId(e.target.value)}>
                      <option value="">-- Sélectionner un client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.nom} {c.telephone ? `(${c.telephone})` : ''}</option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-100">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-600">Nom & Prénom *</label>
                      <Input
                        type="text"
                        placeholder="Ex: Jean Koffi"
                        value={clientNom}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientNom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-600">Téléphone WhatsApp *</label>
                      <Input
                        type="text"
                        placeholder="Ex: +225 07070707"
                        value={clientTelephone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientTelephone(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section Acompte */}
          {paymentMethod === 'INSTALLMENT' && (
            <div className="pt-2">
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

          {/* Section Livraison */}
          <div className="border-t border-slate-100 pt-3">
            <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aLivrer}
                onChange={(e) => setALivrer(e.target.checked)}
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span>Demander une livraison</span>
            </label>

            {aLivrer && (
              <div className="mt-2 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-100">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Livreur *</label>
                  <Select value={livreurId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLivreurId(e.target.value)}>
                    <option value="">-- Sélectionner un livreur --</option>
                    {livreurs.map(l => (
                      <option key={l.id} value={l.id}>{l.nom}</option>
                    ))}
                  </Select>
                  {livreurs.length === 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">Aucun livreur disponible. Créez-en un dans les Paramètres.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Adresse & Ville (facultatif)</label>
                  <Input
                    type="text"
                    placeholder="Ex: Cocody, Rue des Jardins"
                    value={adresseLivraison}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdresseLivraison(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
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

/** Statut de synchronisation d'une vente (retour visuel honnête au caissier). */
export type SaleSyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'rejected';

interface SaleSuccessModalProps {
  isOpen: boolean;
  total: number;
  onNewSale: () => void;
  onCancelSale?: () => void;
  /** Ouvre le ticket de caisse (affichage + impression + QR). */
  onShowReceipt?: () => void;
  /** Statut réel de la synchronisation de cette vente. */
  syncStatus?: SaleSyncStatus;
  /** Message d'erreur de synchronisation, le cas échéant. */
  syncError?: string;
  /** Relance la synchronisation de la vente (échec transitoire). */
  onRetry?: () => void;
  /** Écarte la vente locale (échec permanent / refus serveur). */
  onDiscard?: () => void;
  /** Recharge la vente refusée dans le panier pour la corriger. */
  onFix?: () => void;
}

export function SaleSuccessModal({
  isOpen,
  total,
  onNewSale,
  onCancelSale,
  onShowReceipt,
  syncStatus = 'synced',
  syncError,
  onRetry,
  onDiscard,
  onFix,
}: SaleSuccessModalProps) {
  if (!isOpen) return null;

  // En-tête + bandeau selon le statut RÉEL : on n'annonce « synchronisée »
  // que lorsque le serveur a confirmé. La vente est toujours enregistrée localement.
  const head = {
    synced: {
      ring: 'bg-emerald-100',
      icon: <CheckCircle2 className="h-10 w-10 text-emerald-600" />,
      title: 'Vente synchronisée',
    },
    syncing: {
      ring: 'bg-brand-50',
      icon: <RefreshCw className="h-10 w-10 text-brand animate-spin" />,
      title: 'Vente enregistrée',
    },
    pending: {
      ring: 'bg-gold-50',
      icon: <CloudOff className="h-10 w-10 text-gold-700" />,
      title: 'Vente enregistrée',
    },
    error: {
      ring: 'bg-red-100',
      icon: <AlertTriangle className="h-10 w-10 text-red-600" />,
      title: 'Vente enregistrée localement',
    },
    rejected: {
      ring: 'bg-red-100',
      icon: <AlertTriangle className="h-10 w-10 text-red-600" />,
      title: 'Vente refusée',
    },
  }[syncStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl text-center border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4 ${head.ring}`}>
          {head.icon}
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">{head.title}</h3>
        <p className="text-slate-500 mb-4">
          Montant total : <span className="font-bold text-slate-800">{total.toLocaleString()} F</span>
        </p>

        {/* Bandeau d'état de synchronisation — honnête, jamais de faux succès */}
        {syncStatus === 'syncing' && (
          <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-medium text-brand">
            Synchronisation en cours…
          </div>
        )}
        {syncStatus === 'pending' && (
          <div className="mb-5 rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-sm font-medium text-gold-700">
            ⏳ En attente de connexion — sera synchronisée automatiquement.
          </div>
        )}
        {syncStatus === 'synced' && (
          <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            ✓ Enregistrée sur le serveur.
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            <p className="font-semibold">⚠️ Échec de la synchronisation</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              {syncError || "La vente n'a pas pu être enregistrée sur le serveur."}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full justify-center gap-2 border-red-200 text-red-700 hover:bg-red-100"
                onClick={onRetry}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Réessayer
              </Button>
            )}
          </div>
        )}
        {syncStatus === 'rejected' && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            <p className="font-semibold">⚠️ Vente refusée par le serveur</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              {syncError || 'Cette vente ne peut pas être enregistrée (ex. stock insuffisant).'}
            </p>
            <div className="mt-2 flex gap-2">
              {onFix && (
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 justify-center gap-1.5"
                  onClick={onFix}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Corriger
                </Button>
              )}
              {onDiscard && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-center gap-1.5 border-red-200 text-red-700 hover:bg-red-100"
                  onClick={onDiscard}
                >
                  <X className="h-3.5 w-3.5" />
                  Écarter
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Une vente refusée n'a pas de ticket valide : on ne montre que Écarter/Corriger. */}
        {syncStatus !== 'rejected' && (
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
        )}
      </div>
    </div>
  );
}
