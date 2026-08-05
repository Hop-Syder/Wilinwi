/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau Liste & Historique des Expéditions (DeliveryTable) avec Filtres & Actions
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useMemo, useState } from 'react';
import { Search, Phone, MessageCircle, MapPin, UserPlus } from 'lucide-react';
import { Card } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';
import type { KanbanDeliveryItem, DeliveryKanbanStatus } from './delivery-kanban';

interface DeliveryTableProps {
  items: KanbanDeliveryItem[];
  onAssignClick: (item: KanbanDeliveryItem) => void;
  onStatusChange: (id: string, newStatus: DeliveryKanbanStatus) => Promise<void>;
}

export function DeliveryTable({
  items,
  onAssignClick,
  onStatusChange,
}: DeliveryTableProps) {
  const { formatAmount } = useCurrency();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryKanbanStatus | 'ALL'>('ALL');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.kanbanStatus !== statusFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchId = item.id.toLowerCase().includes(q);
        const matchClient = (item.clientNom ?? '').toLowerCase().includes(q);
        const matchTel = (item.clientTel ?? '').toLowerCase().includes(q);
        const matchLivreur = (item.livreurNom ?? '').toLowerCase().includes(q);
        const matchAdresse = (item.adresseLivraison ?? '').toLowerCase().includes(q);
        if (!matchId && !matchClient && !matchTel && !matchLivreur && !matchAdresse) return false;
      }
      return true;
    });
  }, [items, statusFilter, query]);

  // WhatsApp courier message link
  const getCourierWhatsAppUrl = (item: KanbanDeliveryItem) => {
    const courierPhone = (item.livreurTel ?? '').replace(/[^0-9]/g, '');
    const shortId = item.id.slice(0, 8).toUpperCase();
    const clientName = item.clientNom || 'Client';
    const clientTel = item.clientTel || '';
    const address = item.adresseLivraison || 'Zone non spécifiée';
    const total = formatAmount(item.total);
    const fee = item.fraisLivraison ? formatAmount(item.fraisLivraison) : '1 000 FCFA';

    const message = `Bonjour ${item.livreurNom || 'Livreur'}, voici la livraison N°${shortId} :\nClient : ${clientName} (${clientTel})\nLieu : ${address}\nÀ encaisser (COD) : ${total} (Dont ${fee} frais de livraison).`;
    return `https://wa.me/${courierPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <Card className="p-4 border-slate-200/80 shadow-xs rounded-2xl space-y-4 select-none">
      {/* Search & Filter pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="N° commande, client, adresse, livreur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'ALL', label: 'Toutes les expéditions' },
            { id: 'TO_PREPARE', label: '📦 À Préparer' },
            { id: 'IN_TRANSIT', label: '🛵 En Transit' },
            { id: 'DELIVERED', label: '✅ Livrées' },
            { id: 'FAILED', label: '❌ Échecs' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-full transition-all shrink-0 ${
                statusFilter === f.id
                  ? 'bg-amber-950 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vue Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">N° Expédition</th>
              <th className="py-3.5 px-4">Client & Contact</th>
              <th className="py-3.5 px-4">Zone / Adresse</th>
              <th className="py-3.5 px-4">Livreur Attribué</th>
              <th className="py-3.5 px-4 text-right">Montant COD</th>
              <th className="py-3.5 px-4">Statut Pipeline</th>
              <th className="py-3.5 px-4 text-center">Actions Directes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredItems.map((item) => {
              const shortId = item.id.slice(0, 8).toUpperCase();

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* N° Expédition */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="font-mono font-extrabold text-slate-900">#{shortId}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR')} {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>

                  {/* Client & Contact */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="font-extrabold text-slate-900">{item.clientNom || 'Client Comptoir'}</p>
                    {item.clientTel ? (
                      <a href={`tel:${item.clientTel}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline">
                        <Phone className="h-3 w-3" /> {item.clientTel}
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px]">—</span>
                    )}
                  </td>

                  {/* Zone / Adresse */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{item.adresseLivraison || 'Non spécifiée'}</span>
                    </div>
                  </td>

                  {/* Livreur Attribué */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800">
                    {item.livreurNom ? (
                      <div className="flex items-center gap-1">
                        <span>🛵 {item.livreurNom}</span>
                        {item.livreurTel && (
                          <a href={`tel:${item.livreurTel}`} title="Appeler le livreur" className="text-amber-600 hover:text-amber-700 ml-1">
                            <Phone className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAssignClick(item)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Assigner
                      </button>
                    )}
                  </td>

                  {/* Montant COD */}
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap text-slate-900 text-sm">
                    {formatAmount(item.total)}
                  </td>

                  {/* Statut Pipeline */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <select
                      value={item.kanbanStatus}
                      onChange={(e) => onStatusChange(item.id, e.target.value as DeliveryKanbanStatus)}
                      className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-extrabold text-slate-800 outline-none cursor-pointer hover:border-amber-500"
                    >
                      <option value="TO_PREPARE">📦 À Préparer</option>
                      <option value="IN_TRANSIT">🛵 En Transit</option>
                      <option value="DELIVERED">✅ Livrée</option>
                      <option value="FAILED">❌ Échec / Retour</option>
                    </select>
                  </td>

                  {/* Actions Directes */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.livreurNom && (
                        <a
                          href={getCourierWhatsAppUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Envoyer la fiche sur WhatsApp"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => onAssignClick(item)}
                        title="Modifier l'assignation"
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-medium">
                  Aucune expédition trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
