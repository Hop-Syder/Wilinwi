'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@wilinwi/ui';
import { X } from 'lucide-react';

export type TourStep = {
  targetId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
};

interface TourGuideProps {
  steps: TourStep[];
  onComplete: () => void;
}

const PAD = 4; // marge du surlignage autour de la cible
const GAP = 12; // espace entre la cible et la bulle
const EDGE = 12; // marge minimale avec les bords de l'écran
const MOBILE_BP = 640; // sm: feuille ancrée en bas sous ce seuil

export function TourGuide({ steps, onComplete }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  // 1) Mesure de la cible + suivi du redimensionnement / défilement.
  useEffect(() => {
    if (!step) return;
    const update = () => {
      setIsMobile(window.innerWidth < MOBILE_BP);
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };
    update();
    // Re-mesure après l'animation de scrollIntoView.
    const t = setTimeout(update, 320);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  // 2) Positionnement de la bulle (desktop) une fois sa taille réelle connue.
  useLayoutEffect(() => {
    if (isMobile) {
      setCoords(null); // mobile : feuille ancrée en bas (CSS pur)
      return;
    }
    const pop = popoverRef.current;
    if (!pop) return;
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Pas de cible : on centre la bulle.
    if (!rect) {
      setCoords({ top: (vh - ph) / 2, left: (vw - pw) / 2 });
      return;
    }

    const pos = step?.position ?? 'bottom';
    let top: number;
    let left: number;

    if (pos === 'top' || pos === 'bottom') {
      left = rect.left;
      top = pos === 'bottom' ? rect.bottom + GAP : rect.top - ph - GAP;
      // Bascule si débordement vertical.
      if (pos === 'bottom' && top + ph > vh - EDGE) top = rect.top - ph - GAP;
      if (pos === 'top' && top < EDGE) top = rect.bottom + GAP;
    } else {
      top = rect.top;
      left = pos === 'right' ? rect.right + GAP : rect.left - pw - GAP;
      // Bascule si débordement horizontal.
      if (pos === 'right' && left + pw > vw - EDGE) left = rect.left - pw - GAP;
      if (pos === 'left' && left < EDGE) left = rect.right + GAP;
    }

    // Clamp sur les deux axes pour rester dans l'écran.
    left = Math.min(Math.max(EDGE, left), vw - pw - EDGE);
    top = Math.min(Math.max(EDGE, top), vh - ph - EDGE);
    setCoords({ top, left });
  }, [rect, isMobile, step, currentStep]);

  if (!step) return null;

  // Surlignage (spotlight) découpé autour de la cible.
  const overlayClip = rect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${rect.left - PAD}px ${rect.top - PAD}px,
        ${rect.right + PAD}px ${rect.top - PAD}px,
        ${rect.right + PAD}px ${rect.bottom + PAD}px,
        ${rect.left - PAD}px ${rect.bottom + PAD}px,
        ${rect.left - PAD}px ${rect.top - PAD}px
      )`
    : undefined;

  const isLast = currentStep === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Voile + surlignage de la cible */}
      <div
        className="absolute inset-0 bg-slate-900/60 transition-all duration-300"
        style={{ clipPath: overlayClip }}
        onClick={onComplete}
      />

      {/* Bulle : feuille en bas sur mobile, ancrée près de la cible sur desktop */}
      <div
        ref={popoverRef}
        className={
          isMobile
            ? 'fixed inset-x-3 bottom-3 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl'
            : 'absolute w-80 max-w-[calc(100vw-1.5rem)] max-h-[80vh] overflow-y-auto rounded-xl border border-slate-100 bg-white p-5 shadow-2xl transition-all duration-200'
        }
        style={
          isMobile
            ? undefined
            : {
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                visibility: coords ? 'visible' : 'hidden',
              }
        }
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-brand">{step.title}</h3>
          <button
            onClick={onComplete}
            className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Fermer le tutoriel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-sm leading-relaxed text-slate-600">{step.content}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-400">
            {currentStep + 1} / {steps.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((c) => Math.max(0, c - 1))}
              disabled={currentStep === 0}
            >
              Précédent
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => (isLast ? onComplete() : setCurrentStep((c) => c + 1))}
            >
              {isLast ? 'Terminer' : 'Suivant'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
