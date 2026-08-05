/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Annuaire Clients & Carnet de Dettes (ClientsTable) — Table avec badges colorés & Relances WhatsApp
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useMemo, useState } from 'react';
import { Search, Phone, DollarSign, MessageCircle, Eye, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ClientDto } from '@wilinwi/types';
import { Card, Button } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

interface ClientsTableProps {
  clients: ClientDto[];
  onSelectClient: (client: ClientDto) => void;
  onOpenPaymentModal: (client: ClientDto) => void;
}

export function ClientsTable({
  clients,
  onSelectClient,
  onOpenPaymentModal,
}: ClientsTableProps) {
  const { formatAmount } = useCurrency();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'DEBTORS' | 'NO_DEBT' | 'OVER_LIMIT'>('ALL');

  // Filtrage dynamique
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const debt = c.soldeCredit ?? 0;
      const ceiling = c.plafondCredit ?? 0;
      const isOver = ceiling > 0 && debt > ceiling;

      if (filter === 'DEBTORS' && debt <= 0) return false;
      if (filter === 'NO_DEBT' && debt > 0) return false;
      if (filter === 'OVER_LIMIT' && !isOver) return false;

      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchNom = c.nom.toLowerCase().includes(q);
        const matchTel = c.telephone?.toLowerCase().includes(q);
        if (!matchNom && !matchTel) return false;
      }
      return true;
    });
  }, [clients, filter, query]);

  // Générateur de message de relance WhatsApp pré-rempli
  const getWhatsAppUrl = (client: ClientDto) => {
    const phoneClean = (client.telephone ?? '').replace(/[^0-9]/g, '');
    const debt = client.soldeCredit ?? 0;
    const shortCode = client.id.slice(0, 8).toUpperCase();
    const text = `Bonjour ${client.nom}, sauf erreur de notre part, votre solde débiteur chez nous est de ${formatAmount(debt)}. Voici votre récapitulatif client : wilinwi.com/r/client-${shortCode}`;
    return `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`;
  };

  return (
    <Card className="p-4 border-slate-200/80 shadow-xs rounded-2xl space-y-4">
      {/* Barre de Recherche Omnibox + Pills de Filtres */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'ALL', label: 'Toutes les fiches' },
            { id: 'DEBTORS', label: '💳 Débiteurs' },
            { id: 'NO_DEBT', label: '🟢 À jour' },
            { id: 'OVER_LIMIT', label: '⚠️ Plafond dépassé' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-full transition-all shrink-0 ${
                filter === f.id
                  ? 'bg-violet-950 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vue Bureau : Tableau */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Client</th>
              <th className="py-3.5 px-4">Téléphone</th>
              <th className="py-3.5 px-4 text-right">Dette Actuelle</th>
              <th className="py-3.5 px-4 text-right">Plafond Crédit</th>
              <th className="py-3.5 px-4">Statut Compte</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredClients.map((c) => {
              const debt = c.soldeCredit ?? 0;
              const ceiling = c.plafondCredit ?? 0;
              const isOver = ceiling > 0 && debt > ceiling;
              const isDebtor = debt > 0;

              return (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Client */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {c.nom.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900">{c.nom}</p>
                        {c.notes && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.notes}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Téléphone */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-bold">
                    {c.telephone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.telephone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Dette Actuelle */}
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap">
                    <span className={debt > 0 ? 'text-rose-600' : 'text-slate-900'}>
                      {formatAmount(debt)}
                    </span>
                  </td>

                  {/* Plafond Crédit */}
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                    {ceiling > 0 ? formatAmount(ceiling) : 'Illimité'}
                  </td>

                  {/* Statut Compte */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {!isDebtor ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Compte à jour
                      </span>
                    ) : isOver ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                        <ShieldAlert className="h-3 w-3 text-rose-600" /> Plafond dépassé / Bloqué
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                        <AlertTriangle className="h-3 w-3 text-amber-600" /> Encours normal
                      </span>
                    )}
                  </td>

                  {/* Colonne Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {isDebtor && (
                        <button
                          type="button"
                          onClick={() => onOpenPaymentModal(c)}
                          title="Encaisser un remboursement"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Encaisser
                        </button>
                      )}
                      {isDebtor && c.telephone && (
                        <a
                          href={getWhatsAppUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Relancer sur WhatsApp"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectClient(c)}
                        title="Consulter la fiche client"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vue Mobile : Cartes Responsives */}
      <div className="block md:hidden space-y-3">
        {filteredClients.map((c) => {
          const debt = c.soldeCredit ?? 0;
          const isDebtor = debt > 0;
          const ceiling = c.plafondCredit ?? 0;
          const isOver = ceiling > 0 && debt > ceiling;

          return (
            <div
              key={c.id}
              className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center font-extrabold text-sm">
                    {c.nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{c.nom}</h4>
                    <p className="text-xs text-slate-500 font-medium">{c.telephone || 'Sans téléphone'}</p>
                  </div>
                </div>

                {!isDebtor ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                    À jour
                  </span>
                ) : isOver ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                    Bloqué
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold">
                    Débiteur
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium">Dette : </span>
                  <span className="font-mono font-extrabold text-rose-600">{formatAmount(debt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isDebtor && (
                    <Button
                      size="sm"
                      onClick={() => onOpenPaymentModal(c)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      <DollarSign className="h-3.5 w-3.5 mr-1" /> Encaisser
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectClient(c)}
                    className="text-xs font-bold text-slate-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
