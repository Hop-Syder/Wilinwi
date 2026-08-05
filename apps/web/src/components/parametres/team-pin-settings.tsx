/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Onglet Équipe, Rôles & Codes PIN (Sécurité, Matrice des Permissions & PIN Caissier)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { Users, KeyRound, ShieldCheck, UserPlus, Edit3, X } from 'lucide-react';
import { Card, Button } from '@wilinwi/ui';

export interface TeamMember {
  id: string;
  nom: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'SELLER' | 'DELIVERY';
  pinCode?: string | null;
  actif: boolean;
  permissions?: {
    allowDiscountOver10: boolean;
    allowSaleCancel: boolean;
    allowStockAdjustment: boolean;
    allowViewGlobalRevenue: boolean;
  };
}

interface TeamPinSettingsProps {
  members: TeamMember[];
  onSaveMember: (member: Partial<TeamMember>) => Promise<void>;
  _onDeleteMember?: (id: string) => Promise<void>;
}

export function TeamPinSettings({
  members,
  onSaveMember,
  _onDeleteMember,
}: TeamPinSettingsProps) {
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);
  const [busy, setBusy] = useState(false);

  const roleLabels: Record<string, string> = {
    OWNER: '👑 ADMIN / PROMOTEUR',
    MANAGER: '👔 GÉRANT DE BOUTIQUE',
    CASHIER: '🟢 CAISSIER (CAISSE)',
    SELLER: '🛍️ VENDEUR CONSEIL',
    DELIVERY: '🛵 LIVREUR / COURSIER',
  };

  const roleBadges: Record<string, string> = {
    OWNER: 'bg-rose-50 text-rose-800 border-rose-200',
    MANAGER: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    CASHIER: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    SELLER: 'bg-amber-50 text-amber-800 border-amber-200',
    DELIVERY: 'bg-sky-50 text-sky-800 border-sky-200',
  };

  const handleOpenAddModal = () => {
    setEditingMember({
      nom: '',
      email: '',
      role: 'CASHIER',
      pinCode: '1234',
      actif: true,
      permissions: {
        allowDiscountOver10: false,
        allowSaleCancel: false,
        allowStockAdjustment: false,
        allowViewGlobalRevenue: false,
      },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setBusy(true);
    try {
      await onSaveMember(editingMember);
      setEditingMember(null);
    } catch {
      alert('Erreur lors de l’enregistrement du membre');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Barre d'en-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" /> Équipe, Rôles & Sécurité des Accès
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Gestion des collaborateurs, attribution des codes PIN à 4 chiffres et matrice d’autorisations
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm">
          <UserPlus className="h-4 w-4 mr-1.5" /> Ajouter un Collaborateur
        </Button>
      </div>

      {/* Tableau des Membres de l'Équipe */}
      <Card className="p-4 border-slate-200/80 shadow-xs rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Collaborateur</th>
                <th className="py-3.5 px-4">Rôle Attribué</th>
                <th className="py-3.5 px-4">Code PIN Caissier</th>
                <th className="py-3.5 px-4">Matrice des Permissions</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Nom & Email */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {m.nom.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900">{m.nom}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{m.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Rôle */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold ${roleBadges[m.role] || 'bg-slate-100 text-slate-700'}`}>
                      {roleLabels[m.role] || m.role}
                    </span>
                  </td>

                  {/* Code PIN */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono font-extrabold text-slate-800">
                      <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{m.pinCode ? `•••• (${m.pinCode})` : 'Non défini'}</span>
                    </div>
                  </td>

                  {/* Permissions Matrice */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {m.permissions?.allowDiscountOver10 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          Remise &gt;10%
                        </span>
                      )}
                      {m.permissions?.allowSaleCancel && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                          Annulation Vente
                        </span>
                      )}
                      {m.permissions?.allowStockAdjustment && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                          Ajustement Stock
                        </span>
                      )}
                      {m.role === 'OWNER' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                          Accès Total Admin
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingMember(m)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Éditer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modale d'Édition / Création de Membre d'Équipe */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={() => setEditingMember(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                {editingMember.id ? 'Modifier Collaborateur' : 'Nouveau Collaborateur'}
              </h3>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={editingMember.nom || ''}
                  onChange={(e) => setEditingMember((prev) => ({ ...prev, nom: e.target.value }))}
                  placeholder="Ex: Koffi Christian"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={editingMember.email || ''}
                  onChange={(e) => setEditingMember((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Ex: caissier@wilinwi.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rôle dans la Boutique</label>
                <select
                  value={editingMember.role || 'CASHIER'}
                  onChange={(e) => setEditingMember((prev) => ({ ...prev, role: e.target.value as any }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="OWNER">👑 ADMIN / PROMOTEUR (Accès Total)</option>
                  <option value="MANAGER">👔 GÉRANT (Clôtures & Rapports)</option>
                  <option value="CASHIER">🟢 CAISSIER (Vente & Caisse)</option>
                  <option value="SELLER">🛍️ VENDEUR CONSEIL (Catalogue)</option>
                  <option value="DELIVERY">🛵 LIVREUR / COURSIER</option>
                </select>
              </div>

              {/* Code PIN à 4 chiffres */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Code PIN Caissier (4 chiffres pour changement rapide)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={editingMember.pinCode || ''}
                  onChange={(e) => setEditingMember((prev) => ({ ...prev, pinCode: e.target.value }))}
                  placeholder="Ex: 1234"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Matrice des autorisations */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Matrice des Autorisations Spéciales</label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingMember.permissions?.allowDiscountOver10 ?? false}
                      onChange={(e) =>
                        setEditingMember((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            permissions: {
                              ...(prev.permissions || {
                                allowDiscountOver10: false,
                                allowSaleCancel: false,
                                allowStockAdjustment: false,
                                allowViewGlobalRevenue: false,
                              }),
                              allowDiscountOver10: e.target.checked,
                            },
                          };
                        })
                      }
                      className="h-4 w-4 text-indigo-600 rounded-md"
                    />
                    <span>Droit d’accorder une remise supérieure à 10%</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingMember.permissions?.allowSaleCancel ?? false}
                      onChange={(e) =>
                        setEditingMember((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            permissions: {
                              ...(prev.permissions || {
                                allowDiscountOver10: false,
                                allowSaleCancel: false,
                                allowStockAdjustment: false,
                                allowViewGlobalRevenue: false,
                              }),
                              allowSaleCancel: e.target.checked,
                            },
                          };
                        })
                      }
                      className="h-4 w-4 text-indigo-600 rounded-md"
                    />
                    <span>Droit d’annuler un ticket de caisse</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingMember.permissions?.allowStockAdjustment ?? false}
                      onChange={(e) =>
                        setEditingMember((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            permissions: {
                              ...(prev.permissions || {
                                allowDiscountOver10: false,
                                allowSaleCancel: false,
                                allowStockAdjustment: false,
                                allowViewGlobalRevenue: false,
                              }),
                              allowStockAdjustment: e.target.checked,
                            },
                          };
                        })
                      }
                      className="h-4 w-4 text-indigo-600 rounded-md"
                    />
                    <span>Droit d’effectuer un ajustement de stock manuel</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingMember(null)} disabled={busy}>
                  Annuler
                </Button>
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold" disabled={busy}>
                  {busy ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
