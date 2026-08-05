/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Pipeline Kanban de Suivi des Livraisons à 4 Colonnes + Fiches WhatsApp & Appels Directs
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Card, Button } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

export type DeliveryKanbanStatus = 'TO_PREPARE' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

export interface KanbanDeliveryItem {
  id: string;
  total: number;
  fraisLivraison?: number;
  adresseLivraison?: string | null;
  clientNom?: string | null;
  clientTel?: string | null;
  livreurId?: string | null;
  livreurNom?: string | null;
  livreurTel?: string | null;
  createdAt: string;
  livreLe?: string | null;
  kanbanStatus: DeliveryKanbanStatus;
}

interface DeliveryKanbanProps {
  items: KanbanDeliveryItem[];
  onStatusChange: (id: string, newStatus: DeliveryKanbanStatus, restock?: boolean) => Promise<void>;
  onAssignClick: (item: KanbanDeliveryItem) => void;
}

export function DeliveryKanban({
  items,
  onStatusChange,
  onAssignClick,
}: DeliveryKanbanProps) {
  const { formatAmount } = useCurrency();
  const [restockConfirmItem, setRestockConfirmItem] = useState<KanbanDeliveryItem | null>(null);

  // Groupement des items par colonne
  const columns: { id: DeliveryKanbanStatus; title: string; icon: React.ElementType; color: string }[] = [
    { id: 'TO_PREPARE', title: 'À Préparer', icon: PackageCheck, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'IN_TRANSIT', title: 'En Transit (Livreur)', icon: Truck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'DELIVERED', title: 'Livrée & Effectuée', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'FAILED', title: 'Échec / Retour Stock', icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  // Génération du lien WhatsApp pré-rempli pour le livreur
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

  const handleMoveStatus = async (item: KanbanDeliveryItem, targetStatus: DeliveryKanbanStatus) => {
    if (targetStatus === 'FAILED') {
      // Ouvre le prompt de confirmation pour réintégration de stock
      setRestockConfirmItem(item);
    } else {
      await onStatusChange(item.id, targetStatus, false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* 4 Colonnes Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colItems = items.filter((i) => i.kanbanStatus === col.id);
          const ColIcon = col.icon;

          return (
            <div key={col.id} className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200/80 space-y-3 min-h-[500px]">
              {/* En-tête Colonne */}
              <div className={`p-3 rounded-xl border flex items-center justify-between font-extrabold text-xs ${col.color}`}>
                <div className="flex items-center gap-2">
                  <ColIcon className="h-4 w-4" />
                  <span>{col.title}</span>
                </div>
                <span className="h-5 w-5 rounded-full bg-white/80 flex items-center justify-center text-[11px] font-mono shadow-2xs">
                  {colItems.length}
                </span>
              </div>

              {/* Cartes de Livraison */}
              <div className="space-y-3">
                {colItems.map((item) => {
                  const shortId = item.id.slice(0, 8).toUpperCase();

                  return (
                    <Card
                      key={item.id}
                      className="p-4 bg-white border-slate-200/80 shadow-2xs rounded-2xl hover:shadow-md transition-all space-y-3"
                    >
                      {/* Ligne 1 : Order # + Badge Heure */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-extrabold text-slate-900">#{shortId}</span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Ligne 2 : Détails Client & Adresse */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900">{item.clientNom || 'Client Comptoir'}</span>
                          {item.clientTel && (
                            <a
                              href={`tel:${item.clientTel}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100 transition-colors"
                            >
                              <Phone className="h-3 w-3" /> Appel
                            </a>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.adresseLivraison || 'Adresse non renseignée'}</span>
                        </div>
                      </div>

                      {/* Ligne 3 : Livreur & Montant COD */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">Livreur attribué :</p>
                          {item.livreurNom ? (
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-800">{item.livreurNom}</span>
                              {item.livreurTel && (
                                <a
                                  href={`tel:${item.livreurTel}`}
                                  title="Appeler le livreur"
                                  className="text-amber-600 hover:text-amber-700"
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAssignClick(item)}
                              className="text-[11px] font-bold text-indigo-600 hover:underline"
                            >
                              + Assigner
                            </button>
                          )}
                        </div>

                        <div className="text-right font-mono">
                          <p className="text-[10px] text-slate-400 font-medium">À encaisser (COD)</p>
                          <p className="font-extrabold text-slate-900 text-sm">{formatAmount(item.total)}</p>
                        </div>
                      </div>

                      {/* Ligne 4 : Transmission WhatsApp Livreur & Actions de changement de statut */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        {item.livreurNom && (
                          <a
                            href={getCourierWhatsAppUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors border border-emerald-200"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Envoyer au Livreur (WhatsApp)</span>
                          </a>
                        )}

                        {/* Boutons de changement d'état rapide */}
                        <div className="flex items-center justify-between gap-1 text-[11px] pt-1">
                          {col.id === 'TO_PREPARE' && (
                            <Button
                              size="sm"
                              onClick={() => handleMoveStatus(item, 'IN_TRANSIT')}
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                            >
                              Remettre au Livreur <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          )}

                          {col.id === 'IN_TRANSIT' && (
                            <div className="flex gap-1.5 w-full">
                              <Button
                                size="sm"
                                onClick={() => handleMoveStatus(item, 'DELIVERED')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Livrée
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMoveStatus(item, 'FAILED')}
                                className="flex-1 text-rose-700 border-rose-200 hover:bg-rose-50 text-[11px] font-bold"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Échec
                              </Button>
                            </div>
                          )}

                          {(col.id === 'DELIVERED' || col.id === 'FAILED') && (
                            <button
                              type="button"
                              onClick={() => handleMoveStatus(item, 'IN_TRANSIT')}
                              className="text-slate-400 hover:text-slate-600 text-[10px] font-semibold underline mx-auto"
                            >
                              Replacer en Transit
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {colItems.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-white/50">
                    Aucun colis
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale de Confirmation de Réintégration de Stock en cas d'Échec */}
      {restockConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Échec de Livraison</h4>
                <p className="text-xs text-slate-500 font-medium">
                  Livraison #{restockConfirmItem.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Voulez-vous réintégrer automatiquement les articles de cette commande dans le stock de la boutique ?
            </p>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={async () => {
                  await onStatusChange(restockConfirmItem.id, 'FAILED', false);
                  setRestockConfirmItem(null);
                }}
              >
                Non (Ne pas restocker)
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs"
                onClick={async () => {
                  await onStatusChange(restockConfirmItem.id, 'FAILED', true);
                  setRestockConfirmItem(null);
                }}
              >
                Oui, Réintégrer Stock
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
