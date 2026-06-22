'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, PlayCircle, Info } from 'lucide-react';
import { Button, Card } from '@wilinwi/ui';
import { TourGuide, type TourStep } from './tour-guide';
import { createPortal } from 'react-dom';

interface ContextualHelpProps {
  storageKey: string;
  tourSteps: TourStep[];
  useCases: { title: string; description: string }[];
}

export function ContextualHelp({ storageKey, tourSteps, useCases }: ContextualHelpProps) {
  const [showTour, setShowTour] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && !localStorage.getItem(storageKey)) {
      setTimeout(() => setShowTour(true), 500);
    }
  }, [storageKey]);

  if (!mounted) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowMenu(true)}>
        <HelpCircle className="mr-1 h-4 w-4" />
        Aide
      </Button>

      {showMenu && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowMenu(false)}>
          <Card className="w-full max-w-lg p-6 relative max-h-[85vh] overflow-x-hidden overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Décoration background */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-brand/5 blur-3xl" />
            
            <div className="flex items-center justify-between mb-4 relative">
              <h2 className="font-display text-xl font-bold text-brand flex items-center gap-2">
                <HelpCircle className="h-5 w-5" /> Centre d'aide
              </h2>
              <button onClick={() => setShowMenu(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            
            <div className="mb-6 bg-brand/5 border border-brand/20 rounded-xl p-4 flex items-start gap-3 relative">
              <PlayCircle className="h-6 w-6 text-brand shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-brand">Tutoriel interactif</h3>
                <p className="text-sm text-slate-600 mt-1 mb-3 leading-relaxed">Découvrez les fonctionnalités principales de cette page étape par étape. Idéal pour une première prise en main !</p>
                <Button size="sm" variant="primary" onClick={() => { setShowMenu(false); setShowTour(true); }}>
                  Lancer le tutoriel
                </Button>
              </div>
            </div>

            <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2 relative">
              <Info className="h-4 w-4 text-brand" /> Cas d'usage fréquents
            </h3>
            <ul className="space-y-3 relative">
              {useCases.map((uc, i) => (
                <li key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3 transition-colors hover:border-slate-200">
                  <div className="font-medium text-slate-800 text-sm">{uc.title}</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">{uc.description}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>,
        document.body
      )}

      {showTour && (
        <TourGuide 
          steps={tourSteps} 
          onComplete={() => {
            setShowTour(false);
            localStorage.setItem(storageKey, 'true');
          }} 
        />
      )}
    </>
  );
}
