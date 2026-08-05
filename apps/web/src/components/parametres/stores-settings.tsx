/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Onglet Établissements & Dépôts (StoresSettings) — Multi-Boutiques & Dépôts
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { Store, Warehouse, Plus, Star, MapPin, Edit3, X, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '@wilinwi/ui';

export interface StoreEtablissement {
  id: string;
  nom: string;
  type: 'BOUTIQUE' | 'ENTREPOT' | 'ECOMMERCE';
  adresse?: string | null;
  ville?: string | null;
  telephone?: string | null;
  isDefault: boolean;
  actif: boolean;
}

interface StoresSettingsProps {
  stores: StoreEtablissement[];
  onSaveStore: (store: Partial<StoreEtablissement>) => Promise<void>;
  onSetDefaultStore: (id: string) => Promise<void>;
}

export function StoresSettings({
  stores,
  onSaveStore,
  onSetDefaultStore,
}: StoresSettingsProps) {
  const [editingStore, setEditingStore] = useState<Partial<StoreEtablissement> | null>(null);
  const [busy, setBusy] = useState(false);

  const handleOpenAddModal = () => {
    setEditingStore({
      nom: '',
      type: 'BOUTIQUE',
      adresse: '',
      ville: 'Cotonou',
      telephone: '',
      isDefault: false,
      actif: true,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    setBusy(true);
    try {
      await onSaveStore(editingStore);
      setEditingStore(null);
    } catch {
      alert('Erreur lors de l’enregistrement de l’établissement');
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
            <Store className="h-5 w-5 text-indigo-600" /> Établissements & Points de Stockage
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Gestion des boutiques physiques, dépôts de réapprovisionnement et canaux de vente
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" /> Créer un Établissement
        </Button>
      </div>

      {/* Grille des Établissements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((s) => (
          <Card
            key={s.id}
            className={`p-5 bg-white border rounded-2xl shadow-2xs space-y-3 relative overflow-hidden transition-all ${
              s.isDefault ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            {s.isDefault && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-0.5 rounded-bl-xl text-[10px] font-extrabold flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" /> Principal par Défaut
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                {s.type === 'ENTREPOT' ? <Warehouse className="h-5 w-5" /> : <Store className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{s.nom}</h4>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {s.type === 'ENTREPOT' ? '📦 Dépôt / Stockage' : s.type === 'ECOMMERCE' ? '🌐 E-Commerce' : '🛍️ Boutique Physique'}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 font-medium">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{s.adresse || 'Adresse non spécifiée'} {s.ville ? `(${s.ville})` : ''}</span>
              </div>
              {s.telephone && <div>Tél : {s.telephone}</div>}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              {!s.isDefault ? (
                <button
                  type="button"
                  onClick={() => onSetDefaultStore(s.id)}
                  className="text-indigo-600 hover:underline font-bold text-[11px]"
                >
                  Définir par défaut
                </button>
              ) : (
                <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Boutique Principale
                </span>
              )}

              <button
                type="button"
                onClick={() => setEditingStore(s)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" /> Éditer
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modale de Création / Édition d'Établissement */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={() => setEditingStore(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-600" />
                {editingStore.id ? 'Modifier Établissement' : 'Nouvel Établissement'}
              </h3>
              <button onClick={() => setEditingStore(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom de l’Établissement *</label>
                <input
                  type="text"
                  required
                  value={editingStore.nom || ''}
                  onChange={(e) => setEditingStore((prev) => ({ ...prev, nom: e.target.value }))}
                  placeholder="Ex: Boutique Cotonou Ganhi"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Type d’Établissement</label>
                <select
                  value={editingStore.type || 'BOUTIQUE'}
                  onChange={(e) => setEditingStore((prev) => ({ ...prev, type: e.target.value as any }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="BOUTIQUE">🛍️ Boutique Physique (Vente en Caisse)</option>
                  <option value="ENTREPOT">📦 Dépôt / Réapprovisionnement Stock</option>
                  <option value="ECOMMERCE">🌐 Boutique en Ligne (E-Commerce)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse Physique</label>
                <input
                  type="text"
                  value={editingStore.adresse || ''}
                  onChange={(e) => setEditingStore((prev) => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Ex: Rue du Commerce, Ganhi"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={editingStore.ville || ''}
                    onChange={(e) => setEditingStore((prev) => ({ ...prev, ville: e.target.value }))}
                    placeholder="Ex: Cotonou"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={editingStore.telephone || ''}
                    onChange={(e) => setEditingStore((prev) => ({ ...prev, telephone: e.target.value }))}
                    placeholder="Ex: +229 97 00 00 00"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingStore(null)} disabled={busy}>
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
