'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant de verrouillage par PIN avec sélection de profil (Mode Kiosque)
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import { Lock, Unlock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@wilinwi/ui';

export interface PinUser {
  id: string;
  nom: string;
  role: string;
}

interface PinSwitchModalProps {
  users: PinUser[];
  onUnlock: (userId: string, pin: string) => void;
  onCancel?: () => void; // Pour retourner au Hub par exemple
}

export function PinSwitchModal({ users, onUnlock, onCancel }: PinSwitchModalProps) {
  const [selectedUser, setSelectedUser] = useState<PinUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      
      // Auto-submit si 4 chiffres
      if (newPin.length === 4) {
        // Le composant parent vérifiera le PIN via API, ici on passe juste la valeur
        onUnlock(selectedUser!.id, newPin);
        // Si erreur, le parent devrait idéalement repasser une prop `error`, mais pour fluidifier on réinitialise.
        setTimeout(() => setPin(''), 500); 
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleBack = () => {
    setSelectedUser(null);
    setPin('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        
        {/* ÉTAPE 1 : CHOIX DE L'UTILISATEUR */}
        {!selectedUser ? (
          <div className="flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">Qui êtes-vous ?</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">Sélectionnez votre profil pour accéder au module.</p>
              </div>
              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Fermer
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-1 hover:border-brand hover:shadow-md active:translate-y-0"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <span className="text-xl font-bold">{u.nom.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-900">{u.nom}</div>
                    <div className="text-xs font-medium text-slate-500">{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
            
            {users.length === 0 && (
              <div className="rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-700">
                Aucun utilisateur trouvé.
              </div>
            )}
          </div>
        ) : (
          
        /* ÉTAPE 2 : SAISIE DU CODE PIN */
          <div className="flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <button onClick={handleBack} className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 pr-4 pl-1 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white font-bold text-sm">
                  {selectedUser.nom.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-700">{selectedUser.nom}</span>
              </div>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            <h2 className="font-display text-2xl font-bold text-slate-900 mt-2">Code PIN</h2>
            <p className="mt-1 text-center text-sm text-slate-500">Saisissez votre code secret à 4 chiffres.</p>

            <div className="my-8 flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full transition-all ${
                    pin.length > i ? 'bg-brand scale-110' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleInput(num.toString())}
                  className="flex h-16 items-center justify-center rounded-full bg-slate-50 text-2xl font-semibold text-slate-800 transition-colors hover:bg-slate-100 active:bg-slate-200"
                >
                  {num}
                </button>
              ))}
              <div className="flex h-16 items-center justify-center"></div>
              <button
                onClick={() => handleInput('0')}
                className="flex h-16 items-center justify-center rounded-full bg-slate-50 text-2xl font-semibold text-slate-800 transition-colors hover:bg-slate-100 active:bg-slate-200"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="flex h-16 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 active:bg-slate-100"
              >
                Effacer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
