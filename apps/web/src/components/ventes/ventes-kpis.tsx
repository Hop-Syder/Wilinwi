/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant des cartes KPI financières pour la page Ventes
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Card, formatFCFA } from '@wilinwi/ui';

interface VentesKpisProps {
  kpis: {
    salesCount: number;
    ca: number;
    encaisse: number;
    resteDu: number;
    annulées: number;
  };
}

export function VentesKpis({ kpis }: VentesKpisProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="p-4 bg-gradient-to-br from-white to-blue-50/30 border-blue-100/60 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-blue-900 font-bold text-7xl select-none group-hover:scale-110 transition-transform">
          #
        </div>
        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventes</span>
        <span className="block mt-2 font-display text-2xl font-black text-blue-900">{kpis.salesCount}</span>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-white to-emerald-50/30 border-emerald-100/60 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-emerald-900 font-bold text-7xl select-none group-hover:scale-110 transition-transform">
          F
        </div>
        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Chiffre d'Affaires</span>
        <span className="block mt-2 font-display text-2xl font-black text-emerald-800">{formatFCFA(kpis.ca)}</span>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-white to-slate-50 border-slate-200/60 shadow-sm relative overflow-hidden group">
        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Encaissé</span>
        <span className="block mt-2 font-display text-2xl font-black text-slate-800">{formatFCFA(kpis.encaisse)}</span>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-white to-amber-50/30 border-amber-100/60 shadow-sm relative overflow-hidden group">
        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Reste à encaisser</span>
        <span className={`block mt-2 font-display text-2xl font-black ${kpis.resteDu > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
          {formatFCFA(kpis.resteDu)}
        </span>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-white to-rose-50/30 border-rose-100/60 shadow-sm relative overflow-hidden group col-span-2 md:col-span-1">
        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Annulées</span>
        <span className="block mt-2 font-display text-2xl font-black text-rose-700">{kpis.annulées}</span>
      </Card>
    </div>
  );
}
