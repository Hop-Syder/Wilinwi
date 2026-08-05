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
import { PaymentMethod, ClientDto, PAYMENT_METHOD_LABELS, MomoOperator, MOMO_OPERATORS, MOMO_OPERATOR_LABELS } from '@wilinwi/types';
import { CheckCircle2, Receipt, X, RotateCcw, CloudOff, RefreshCw, AlertTriangle, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCurrency } from '@/lib/currency-context';

export interface CheckoutResult {
  paymentMethod: PaymentMethod;
  clientId?: string;
  montantVerse?: number;
  /** Paiement mixte : part payée en espèces (le reste via paymentMethod). */
  montantEspeces?: number;
  momoOperator?: MomoOperator;
  momoReference?: string;
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
  initialClientId?: string;
  onConfirm: (result: CheckoutResult) => void;
}

export function CheckoutModal({ isOpen, onClose, cartTotal, clients, livreurs, initialClientId, onConfirm }: CheckoutModalProps) {
  const { currency, formatAmount } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [clientId, setClientId] = useState<string>('');
  const [montantVerse, setMontantVerse] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');
  // Paiement mixte : part en espèces (le reste via le mode sélectionné).
  const [montantEspeces, setMontantEspeces] = useState<string>('');

  // Mobile Money Déclaratif (Module 4)
  const [momoOperator, setMomoOperator] = useState<MomoOperator>('MTN');
  const [momoReference, setMomoReference] = useState<string>('');

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
      setClientId(initialClientId ?? '');
      setMontantVerse('');
      setCashReceived('');
      setMontantEspeces('');
      setMomoOperator('MTN');
      setMomoReference('');
      setAssociateClient(Boolean(initialClientId));
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
  // Modes éligibles au paiement mixte (une part en espèces) : Mobile Money / Banque.
  const isMixteEligible = paymentMethod === 'MOBILE_MONEY' || paymentMethod === 'BANK_TRANSFER';
  const selectedCreditClient = clients.find((client) => client.id === clientId);
  const currentCreditBalance = selectedCreditClient?.soldeCredit ?? 0;
  const outstandingCredit = paymentMethod === 'CREDIT'
    ? cartTotal
    : paymentMethod === 'INSTALLMENT'
      ? Math.max(0, cartTotal - (Number(montantVerse) || 0))
      : 0;
  const creditLimitExceeded = Boolean(
    isCreditOrInstallment &&
      selectedCreditClient &&
      selectedCreditClient.plafondCredit !== null &&
      selectedCreditClient.plafondCredit !== undefined &&
      currentCreditBalance + outstandingCredit > selectedCreditClient.plafondCredit,
  );

  useEffect(() => {
    if (isCreditOrInstallment) {
      setAssociateClient(true);
    }
  }, [paymentMethod, isCreditOrInstallment]);

  // Une livraison a besoin d'un destinataire (nom + WhatsApp) : on force l'association.
  useEffect(() => {
    if (aLivrer) setAssociateClient(true);
  }, [aLivrer]);
  
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

    if (creditLimitExceeded) return false;

    if (isMixteEligible) {
      const esp = Number(montantEspeces) || 0;
      if (esp < 0 || esp > cartTotal) return false;
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
      montantEspeces: isMixteEligible && Number(montantEspeces) > 0 ? Number(montantEspeces) : undefined,
      momoOperator: paymentMethod === 'MOBILE_MONEY' ? momoOperator : undefined,
      momoReference: paymentMethod === 'MOBILE_MONEY' && momoReference.trim() ? momoReference.trim() : undefined,
      clientNom: (associateClient && clientType === 'new') ? clientNom : undefined,
      clientTelephone: (associateClient && clientType === 'new') ? clientTelephone : undefined,
      aLivrer,
      livreurId: (aLivrer && livreurId) ? livreurId : undefined,
      adresseLivraison: (aLivrer && adresseLivraison) ? adresseLivraison : undefined,
    });
  };

  const paymentOptions: { label: string, value: PaymentMethod }[] = [
    { label: 'Espèces', value: 'CASH' },
    { label: 'Mobile Money', value: 'MOBILE_MONEY' },
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
          {currency !== 'XOF' && currency !== 'XAF' && (
            <span className="block text-xs font-semibold text-emerald-600 mt-1">
              Équivalent : {formatAmount(cartTotal)}
            </span>
          )}
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
            <div className="pt-2 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Espèces reçues
              </label>

              {/* Boutons de Coupures Rapides FCFA */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashReceived(String(cartTotal))}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 transition-all active:scale-95"
                >
                  Compte exact
                </button>
                {[1000, 2000, 5000, 10000, 20000].map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => {
                      const current = Number(cashReceived) || 0;
                      setCashReceived(String(current + note));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono font-bold text-slate-800 hover:bg-slate-50 transition-all active:scale-95 shadow-2xs"
                  >
                    +{note >= 1000 ? `${note / 1000}k` : note}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Input
                  type="number"
                  placeholder="Saisir le montant perçu en FCFA..."
                  value={cashReceived}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCashReceived(e.target.value)}
                  className="font-mono text-lg font-bold"
                />
                {cashReceived && (
                  <button
                    type="button"
                    onClick={() => setCashReceived('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* Affichage Grand Format de la Monnaie à Rendre */}
              {cashReceived && Number(cashReceived) > 0 && (
                <div
                  className={`rounded-2xl p-4 text-center border transition-all ${
                    changeToReturn < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm'
                  }`}
                >
                  <span className="block text-xs font-bold uppercase tracking-wider opacity-75">
                    {changeToReturn < 0 ? 'Reste à percevoir' : 'Monnaie à rendre'}
                  </span>
                  <span className="font-mono text-3xl font-black tracking-tight">
                    {changeToReturn < 0
                      ? formatAmount(Math.abs(changeToReturn))
                      : formatAmount(changeToReturn)}
                  </span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'MOBILE_MONEY' && (
            <div className="space-y-3 pt-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opérateur Mobile Money *
                </label>
                <Select
                  value={momoOperator}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setMomoOperator(e.target.value as MomoOperator)
                  }
                >
                  {MOMO_OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {MOMO_OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Référence de Transaction (ID SMS / Déclaré)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: TXN-984210 ou Réf SMS"
                  value={momoReference}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMomoReference(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Vérifiez la réception sur votre téléphone de caisse avant de valider.
                </p>
              </div>
            </div>
          )}

          {/* Paiement mixte : une partie en espèces, le reste via le mode choisi */}
          {isMixteEligible && (
            <div className="pt-2">
              <label className="block text-sm font-medium mb-1">Dont payé en espèces (optionnel)</label>
              <Input
                type="number"
                placeholder="Ex: 5000"
                value={montantEspeces}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMontantEspeces(e.target.value)}
              />
              {Number(montantEspeces) > 0 && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">
                    Reste via {PAYMENT_METHOD_LABELS[paymentMethod]} :
                  </span>
                  <span
                    className={`font-bold ${
                      Number(montantEspeces) > cartTotal ? 'text-red-500' : 'text-emerald-600'
                    }`}
                  >
                    {Math.max(cartTotal - Number(montantEspeces), 0).toLocaleString()} F
                  </span>
                </div>
              )}
              {Number(montantEspeces) > cartTotal && (
                <p className="text-xs text-red-500 mt-1">Le montant en espèces dépasse le total.</p>
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
                  disabled={isCreditOrInstallment || aLivrer}
                  onChange={(e) => setAssociateClient(e.target.checked)}
                  className="rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span>
                  {aLivrer ? 'Destinataire (nom + WhatsApp)' : 'Associer un client'}{' '}
                  {(isCreditOrInstallment || aLivrer) && <span className="text-red-500 font-bold">*</span>}
                </span>
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
                    {creditLimitExceeded && selectedCreditClient && (
                      <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700">
                        Plafond dépassé : dette projetée {formatAmount(currentCreditBalance + outstandingCredit)} pour une limite de {formatAmount(selectedCreditClient.plafondCredit ?? 0)}.
                      </p>
                    )}
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
  /** Code du reçu public pour le téléchargement. */
  receiptCode?: string | null;
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
  receiptCode,
}: SaleSuccessModalProps) {
  const [showQrModal, setShowQrModal] = useState(false);

  if (!isOpen) return null;

  // En-tête + bandeau selon le statut RÉEL : on n'annonce « synchronisée »
  // que lorsque le serveur a confirmé. La vente est toujours enregistrée localement.
  const head = {
    synced: {
      ring: 'bg-emerald-100 dark:bg-emerald-950/30',
      icon: <CheckCircle2 className="h-10 w-10 text-success" />,
      title: 'Vente synchronisée',
    },
    syncing: {
      ring: 'bg-primary/10',
      icon: <RefreshCw className="h-10 w-10 text-primary animate-spin" />,
      title: 'Vente enregistrée',
    },
    pending: {
      ring: 'bg-warning/10',
      icon: <CloudOff className="h-10 w-10 text-warning" />,
      title: 'Vente enregistrée',
    },
    error: {
      ring: 'bg-red-100 dark:bg-red-950/30',
      icon: <AlertTriangle className="h-10 w-10 text-red-650" />,
      title: 'Vente enregistrée localement',
    },
    rejected: {
      ring: 'bg-red-100 dark:bg-red-950/30',
      icon: <AlertTriangle className="h-10 w-10 text-red-650" />,
      title: 'Vente refusée',
    },
  }[syncStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-xl bg-surface p-6 shadow-2xl text-center border border-border animate-in fade-in zoom-in-95 duration-150 text-text-primary">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4 ${head.ring}`}>
          {head.icon}
        </div>
        <h3 className="text-2xl font-bold mb-1">{head.title}</h3>
        <p className="text-text-secondary mb-4">
          Montant total : <span className="font-bold text-text-primary">{total.toLocaleString()} F</span>
        </p>

        {/* Bandeau d'état de synchronisation */}
        {syncStatus === 'syncing' && (
          <div className="mb-5 rounded border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
            Synchronisation en cours…
          </div>
        )}
        {syncStatus === 'pending' && (
          <div className="mb-5 rounded border border-warning/20 bg-warning/5 px-3 py-2 text-sm font-semibold text-warning">
            ⏳ En attente de connexion — sera synchronisée automatiquement.
          </div>
        )}
        {syncStatus === 'synced' && (
          <div className="mb-5 rounded border border-success/20 bg-success/5 px-3 py-2 text-sm font-semibold text-success">
            ✓ Enregistrée sur le serveur.
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="mb-5 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-955/10 px-3 py-2 text-left text-sm text-red-700 dark:text-red-400">
            <p className="font-semibold">⚠️ Échec de la synchronisation</p>
            <p className="mt-0.5 text-xs leading-relaxed opacity-80">
              {syncError || "La vente n'a pas pu être enregistrée sur le serveur."}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full justify-center gap-2 border-red-200 text-red-700 dark:text-red-400"
                onClick={onRetry}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Réessayer
              </Button>
            )}
          </div>
        )}
        {syncStatus === 'rejected' && (
          <div className="mb-5 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-955/10 px-3 py-2 text-left text-sm text-red-700 dark:text-red-400">
            <p className="font-semibold">⚠️ Vente refusée par le serveur</p>
            <p className="mt-0.5 text-xs leading-relaxed opacity-80">
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
                  className="flex-1 justify-center gap-1.5 border-red-200 text-red-700 dark:text-red-400"
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
              setShowQrModal(true);
              if (receiptCode) {
                window.open(`/r/${receiptCode}?download=true`, '_blank');
              }
            }}
          >
            <QrCode className="h-4 w-4 text-primary" />
            Télécharger le reçu (QR)
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
              className="w-full text-center text-sm text-text-secondary/70 hover:text-danger pt-2 transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Annuler cette vente (Erreur)
            </button>
          )}
        </div>
        )}

        {/* Modal QR Code de téléchargement de la facture PDF */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-100" onClick={() => setShowQrModal(false)}>
            <div className="w-[320px] rounded-xl bg-surface border border-border p-6 shadow-xl text-center animate-in zoom-in-95 duration-150 text-text-primary" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-text-secondary">Télécharger la facture</span>
                <button onClick={() => setShowQrModal(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-white p-3 rounded-xl inline-block border border-border shadow-2xs mb-4">
                {(() => {
                  const webBase = process.env.NEXT_PUBLIC_WEB_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://wilinwi.nexus-partners.xyz');
                  return (
                    <QRCodeSVG
                      value={receiptCode ? `${webBase}/r/${receiptCode}?download=true` : `https://wa.me/?text=Merci%20pour%20votre%20achat%20de%20${total}F%20chez%20nous!`}
                      size={180}
                      level="M"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#FFFFFF"
                    />
                  );
                })()}
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Scannez ce QR Code avec un smartphone pour télécharger le reçu directement en format PDF.
              </p>
              {receiptCode && (
                <Button
                  className="w-full mt-4 justify-center gap-2"
                  onClick={() => {
                    window.open(`/r/${receiptCode}?download=true`, '_blank');
                  }}
                >
                  <Download className="h-4 w-4" />
                  Télécharger en direct
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
