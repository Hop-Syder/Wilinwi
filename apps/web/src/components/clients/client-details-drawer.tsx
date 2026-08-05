/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Panneau latéral Fiche Client Détaillée (ClientDetailsDrawer) — 3 Onglets : Profil, Achats, Relevé
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, Phone, ShieldCheck, ShieldAlert, Printer, Edit3, DollarSign } from 'lucide-react';
import type { ClientDto } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';
import type { ReceiptSale } from '@/components/receipt';

interface Sale extends ReceiptSale {
  status: 'COMPLETED' | 'PENDING_PAYMENT' | 'CANCELLED';
  vendeur?: { id: string; nom: string; email: string } | null;
}

export interface ClientDetailData {
  client: ClientDto;
  ventes: Sale[];
  remboursements: { id: string; montant: number; createdAt: string; methode: string; note: string | null }[];
}

interface ClientDetailsDrawerProps {
  detail: ClientDetailData;
  onClose: () => void;
  onOpenPaymentModal: () => void;
  onOpenEditModal: () => void;
  onViewReceipt: (sale: Sale) => void;
}

export function ClientDetailsDrawer({
  detail,
  onClose,
  onOpenPaymentModal,
  onOpenEditModal,
  onViewReceipt,
}: ClientDetailsDrawerProps) {
  const { formatAmount } = useCurrency();
  const { client, ventes, remboursements } = detail;
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PURCHASES' | 'STATEMENT'>('PROFILE');

  const currentDebt = client.soldeCredit ?? 0;
  const plafond = client.plafondCredit ?? 0;
  const isOverLimit = plafond > 0 && currentDebt > plafond;

  // Calcul du montant total d'achats cumulés
  const totalAchats = ventes.reduce((sum, v) => (v.status !== 'CANCELLED' ? sum + v.total : sum), 0);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-2xs" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête du Drawer */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-violet-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
              {client.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight">{client.nom}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{client.telephone || 'Aucun numéro enregistre'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bandeau Dette & Actions Rapides */}
        <div className="bg-violet-950 text-white px-6 py-4 flex items-center justify-between shadow-inner">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300">Solde Débiteur Actuel</p>
            <p className="text-2xl font-extrabold font-mono text-amber-300">{formatAmount(currentDebt)}</p>
            {plafond > 0 && (
              <p className="text-[11px] text-violet-200">
                Plafond : {formatAmount(plafond)} {isOverLimit ? '⚠️ (Dépassé)' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onOpenPaymentModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm"
            >
              <DollarSign className="h-4 w-4 mr-1" /> Encaisser
            </Button>
            <Button
              onClick={onOpenEditModal}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-bold"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation par Onglets Internes */}
        <div className="border-b border-slate-200 bg-white px-6 flex items-center gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'PROFILE'
                ? 'border-violet-600 text-violet-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            👤 Profil & Crédit
          </button>
          <button
            onClick={() => setActiveTab('PURCHASES')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'PURCHASES'
                ? 'border-violet-600 text-violet-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            🛍️ Historique Achats ({ventes.length})
          </button>
          <button
            onClick={() => setActiveTab('STATEMENT')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'STATEMENT'
                ? 'border-violet-600 text-violet-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            📜 Relevé & Versments ({remboursements.length})
          </button>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1 : PROFIL & PARAMS CRÉDIT */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Coordonnées</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Nom complet :</span>
                    <p className="font-bold text-slate-900 text-sm">{client.nom}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Téléphone :</span>
                    <p className="font-bold text-slate-900 text-sm">{client.telephone || '—'}</p>
                  </div>
                </div>
                {client.notes && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 text-xs font-medium">Notes & Remarques :</span>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">{client.notes}</p>
                  </div>
                )}
              </div>

              {/* Paramètres de Crédit */}
              <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Paramètres de Crédit & Autorisatoin
                </h4>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center gap-2.5">
                    {isOverLimit ? (
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Vente à Crédit : {isOverLimit ? 'Bloquée (Plafond Dépassé)' : 'Autorisée'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isOverLimit ? 'Encaissements de dette requis pour débloquer' : 'Client en règle avec le plafond'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-extrabold rounded-full border ${
                      isOverLimit
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isOverLimit ? 'Bloqué' : 'Actif'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                  <div className="rounded-xl p-3 bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 font-semibold">Plafond Autorisé</span>
                    <p className="font-mono font-extrabold text-slate-900 text-sm mt-0.5">
                      {plafond > 0 ? formatAmount(plafond) : 'Illimité'}
                    </p>
                  </div>
                  <div className="rounded-xl p-3 bg-slate-50 border border-slate-200/60">
                    <span className="text-slate-400 font-semibold">Achats Cumulés</span>
                    <p className="font-mono font-extrabold text-violet-900 text-sm mt-0.5">
                      {formatAmount(totalAchats)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 : HISTORIQUE DES ACHATS */}
          {activeTab === 'PURCHASES' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Tickets de Caisse & Achats Passés ({ventes.length})
              </h4>

              {ventes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Aucun achat enregistré pour ce client.</p>
              ) : (
                <div className="space-y-3">
                  {ventes.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs hover:border-violet-300 transition-all flex flex-col space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            #{v.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                              v.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : v.status === 'PENDING_PAYMENT'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {v.status === 'COMPLETED' ? 'Payée' : v.status === 'PENDING_PAYMENT' ? 'Abonnement / Crédit' : 'Annulée'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(v.createdAt).toLocaleDateString('fr-FR')} {new Date(v.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Items rattachés */}
                      <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        {v.items.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span>{it.quantite}× {it.product?.nom ?? 'Article'}</span>
                            <span className="font-mono font-bold text-slate-800">{formatAmount(it.prixReel * it.quantite)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Totaux & Reçu */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="font-mono">
                          <span className="text-slate-400">Total : </span>
                          <span className="font-extrabold text-slate-900">{formatAmount(v.total)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewReceipt(v)}
                          className="text-xs font-bold text-violet-700 border-violet-200 hover:bg-violet-50"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" /> Reçu thermique
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3 : RELEVÉ DE COMPTE & REMBOURSEMENTS */}
          {activeTab === 'STATEMENT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Registre des Versments & Remboursements
                </h4>
                <Button
                  onClick={onOpenPaymentModal}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Nouveau Versement
                </Button>
              </div>

              {remboursements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Aucun versement enregistré.</p>
              ) : (
                <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Observation</th>
                        <th className="p-3 text-right">Montant Versé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {remboursements.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="p-3 whitespace-nowrap text-slate-600">
                            {new Date(r.createdAt).toLocaleDateString('fr-FR')} {new Date(r.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-bold text-[10px] border border-emerald-200">
                              {r.methode}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{r.note || '—'}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                            +{formatAmount(r.montant)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
