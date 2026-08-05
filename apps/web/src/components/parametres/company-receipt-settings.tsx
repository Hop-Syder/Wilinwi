/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Onglet Profil Entreprise & Personnalisation des Reçus Thermiques + Live Receipt Preview
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { Building2, FileText, Printer, Save, CheckCircle2, QrCode } from 'lucide-react';
import { Card, Button } from '@wilinwi/ui';

export interface CompanyReceiptData {
  raisonSociale: string;
  nouveauIfu: string;
  telephone: string;
  adresse: string;
  logoUrl?: string;
  receiptHeader: string;
  receiptFooter: string;
  paperFormat: '58mm' | '80mm';
}

interface CompanyReceiptSettingsProps {
  initialData: CompanyReceiptData;
  onSave: (data: CompanyReceiptData) => Promise<void>;
}

export function CompanyReceiptSettings({
  initialData,
  onSave,
}: CompanyReceiptSettingsProps) {
  const [form, setForm] = useState<CompanyReceiptData>(initialData);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await onSave(form);
      setSuccessMsg('Paramètres d’entreprise et du reçu enregistrés avec succès !');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start select-none">
      {/* Colonne Gauche : Formulaire de Saisie (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1 : Informations Légales & Entreprise */}
          <Card className="p-5 border-slate-200/80 shadow-xs rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Profil Entreprise & Identité Légale</h3>
                <p className="text-[11px] text-slate-500 font-medium">Informations officielles affichées sur les reçus et factures</p>
              </div>
            </div>

            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Raison Sociale / Nom Enseigne *</label>
                <input
                  type="text"
                  required
                  value={form.raisonSociale}
                  onChange={(e) => setForm((prev) => ({ ...prev, raisonSociale: e.target.value }))}
                  placeholder="Ex: Wilinwi Boutique Prestige"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">N° IFU / NPI (Bénin / Sous-région)</label>
                <input
                  type="text"
                  value={form.nouveauIfu}
                  onChange={(e) => setForm((prev) => ({ ...prev, nouveauIfu: e.target.value }))}
                  placeholder="Ex: 3202612345678"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Téléphone Commercial</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm((prev) => ({ ...prev, telephone: e.target.value }))}
                  placeholder="Ex: +229 97 00 00 00"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse Physique / Zone</label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={(e) => setForm((prev) => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Ex: Agblangandan, Cotonou"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </Card>

          {/* Card 2 : Personnalisation du Ticket Thermique (Branding Reçu) */}
          <Card className="p-5 border-slate-200/80 shadow-xs rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Éditeur de Ticket Thermique</h3>
                <p className="text-[11px] text-slate-500 font-medium">Textes d'en-tête, pied de page et format de papier caisse</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-medium">
              {/* Format Papier */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Format de Papier Imprimante</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: '80mm', label: '80 mm (Caisse Fixe Standard)', desc: 'Largeur large pour comptoir' },
                    { id: '58mm', label: '58 mm (Imprimante Mobile Bluetooth)', desc: 'Format compact nomade' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, paperFormat: p.id as any }))}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.paperFormat === p.id
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-extrabold text-slate-900">{p.label}</p>
                      <p className="text-[10px] text-slate-500">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* En-tête Reçu */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Texte d’En-tête (Accroche)</label>
                <input
                  type="text"
                  value={form.receiptHeader}
                  onChange={(e) => setForm((prev) => ({ ...prev, receiptHeader: e.target.value }))}
                  placeholder="Ex: Vente de Prêt-à-Porter & Accessoires de Mode"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Pied de page Reçu */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pied de Page (Conditions & Remerciements)</label>
                <textarea
                  rows={3}
                  value={form.receiptFooter}
                  onChange={(e) => setForm((prev) => ({ ...prev, receiptFooter: e.target.value }))}
                  placeholder="Ex: Merci de votre confiance ! Les marchandises vendues ne sont ni reprises ni échangées. Conservez ce ticket."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs">
                <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </Card>
        </form>
      </div>

      {/* Colonne Droite : Live Thermal Receipt Preview (5 cols) */}
      <div className="lg:col-span-5 space-y-3 sticky top-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-indigo-600" /> Aperçu Visuel en Direct (Ticket {form.paperFormat})
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Aperçu Modèle
          </span>
        </div>

        {/* Simulacre de Ticket Thermique Imprimé */}
        <div
          className={`mx-auto bg-white p-5 border border-slate-300 shadow-xl rounded-xl font-mono text-xs text-slate-900 space-y-3 transition-all ${
            form.paperFormat === '58mm' ? 'max-w-[280px]' : 'max-w-[340px]'
          }`}
        >
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
            <h4 className="font-extrabold text-sm uppercase tracking-tight">{form.raisonSociale || 'NOM ENSEIGNE'}</h4>
            {form.receiptHeader && <p className="text-[11px] text-slate-600 italic">{form.receiptHeader}</p>}
            <p className="text-[10px] text-slate-500">{form.adresse || 'Adresse boutique'}</p>
            <p className="text-[10px] text-slate-500">Tél : {form.telephone || '+229 97 00 00 00'}</p>
            {form.nouveauIfu && <p className="text-[10px] font-bold text-slate-700">IFU : {form.nouveauIfu}</p>}
          </div>

          {/* Ticket Metadata */}
          <div className="text-[10px] space-y-0.5 text-slate-600">
            <div className="flex justify-between">
              <span>Ticket N° : REC-1048</span>
              <span>05/08/2026 14:30</span>
            </div>
            <div>Caissier : Yvette</div>
          </div>

          {/* Table Items */}
          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5 text-[11px]">
            <div className="flex justify-between font-bold text-slate-800">
              <span>2× Robe Pagne Brodé</span>
              <span>30 000 FCFA</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800">
              <span>1× Chaussures Cuir</span>
              <span>15 000 FCFA</span>
            </div>
          </div>

          {/* Totaux */}
          <div className="space-y-1 text-xs pt-1">
            <div className="flex justify-between font-extrabold text-sm">
              <span>TOTAL :</span>
              <span>45 000 FCFA</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Mode : Espèces</span>
              <span>Reçu : 50 000 FCFA</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Rendu : 5 000 FCFA</span>
            </div>
          </div>

          {/* Footer & Code QR */}
          <div className="text-center pt-3 border-t border-dashed border-slate-300 space-y-2">
            <p className="text-[10px] text-slate-600 leading-tight">
              {form.receiptFooter || 'Merci de votre visite ! Les marchandises vendues ne sont ni reprises ni échangées.'}
            </p>
            <div className="h-16 w-16 mx-auto bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
              <QrCode className="h-12 w-12 text-slate-700" />
            </div>
            <p className="text-[9px] text-slate-400">wilinwi.com/r/demo-ticket</p>
          </div>
        </div>
      </div>
    </div>
  );
}
