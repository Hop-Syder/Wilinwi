/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Modal d'Ouverture de Session POS & Saisie du Fond de Caisse Initial (pos-open-session-modal.tsx)
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useState } from 'react';
import { Unlock, Wallet, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { Button, Input } from '@wilinwi/ui';
import type { PosSessionDto } from '@wilinwi/types';
import { apiPost } from '@/lib/api';
import { useCurrency } from '@/lib/currency-context';
import { useAuth } from '@/lib/auth-context';

interface PosOpenSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: PosSessionDto) => void;
}

const PRESET_AMOUNTS = [0, 10000, 25000, 50000, 100000];

export function PosOpenSessionModal({ isOpen, onClose, onSuccess }: PosOpenSessionModalProps) {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();

  const [fondInitial, setFondInitial] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericAmount = Math.max(0, Number(fondInitial) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const session = await apiPost<PosSessionDto>('/api/pos/sessions/open', {
        fondInitial: numericAmount,
        note: note.trim() || undefined,
      });

      onSuccess(session);
      onClose();
    } catch (err: unknown) {
      // Fallback Offline : si pas de réseau, créer une session locale temporaire
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const offlineSession: PosSessionDto = {
          id: `local-session-${Date.now()}`,
          tenantId: user?.tenantId || 'local-tenant',
          etablissementId: user?.etablissementId || 'local-etab',
          openedById: user?.userId || 'local-user',
          status: 'OPEN',
          fondInitial: numericAmount,
          totalEspeces: 0,
          totalMoMo: 0,
          totalBanque: 0,
          totalCredit: 0,
          totalVentes: 0,
          nombreVentes: 0,
          soldeTheorique: numericAmount,
          openedAt: new Date().toISOString(),
        };
        onSuccess(offlineSession);
        onClose();
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Impossible d\'ouvrir la session de caisse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* En-tête de la Modale */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight">Ouverture de Caisse</h2>
              <p className="text-xs text-emerald-200/80 font-medium">Déclaration du fond de caisse initial</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Badge Caissier & Point de Vente */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>{user?.nom || user?.email || 'Caissier'}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
              Session Prête
            </span>
          </div>

          {/* Saisie du Fond Initial */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Fond de caisse initial (Espèces au départ) *
            </label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="500"
                value={fondInitial}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFondInitial(e.target.value)}
                placeholder="0"
                className="pl-9 text-lg font-mono font-black text-slate-900 border-slate-300 focus:ring-emerald-500 focus:border-emerald-500 rounded-2xl"
                autoFocus
                required
              />
              <Wallet className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Boutons Montants Pré-définis (Raccourcis) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFondInitial(String(amt))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                    numericAmount === amt
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {formatAmount(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Note explicative optionnelle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Note ou motif d'ouverture (Optionnel)
            </label>
            <Input
              type="text"
              value={note}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
              placeholder="Ex: Fond de caisse billet de 10 000 et monnaie..."
              className="text-xs rounded-xl border-slate-200"
            />
          </div>

          {/* Actions de validation */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20"
            >
              {loading ? (
                'Ouverture...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Ouvrir la Caisse ({formatAmount(numericAmount)})
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
