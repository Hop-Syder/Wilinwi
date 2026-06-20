'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@wilinwi/ui';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

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

export function TourGuide({ steps, onComplete }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    const updatePosition = () => {
      if (!step) return;
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [step]);

  if (!step) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* Overlay with cutout effect */}
      <div 
        className="absolute inset-0 bg-slate-900/60 transition-all duration-300"
        style={{
          clipPath: targetRect ? `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
            ${targetRect.left - 4}px ${targetRect.top - 4}px,
            ${targetRect.right + 4}px ${targetRect.top - 4}px,
            ${targetRect.right + 4}px ${targetRect.bottom + 4}px,
            ${targetRect.left - 4}px ${targetRect.bottom + 4}px,
            ${targetRect.left - 4}px ${targetRect.top - 4}px
          )` : 'none'
        }}
      />
      
      {/* Popover */}
      {targetRect && (
        <div 
          className="absolute bg-white rounded-xl shadow-2xl w-80 p-5 transition-all duration-300 border border-slate-100"
          style={getPopoverPosition(targetRect, step.position || 'bottom')}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display font-bold text-lg text-brand">{step.title}</h3>
            <button onClick={onComplete} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed mb-5">{step.content}</p>
          
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-400">
              {currentStep + 1} / {steps.length}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentStep(c => Math.max(0, c - 1))}
                disabled={currentStep === 0}
              >
                Précédent
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => {
                  if (currentStep === steps.length - 1) onComplete();
                  else setCurrentStep(c => c + 1);
                }}
              >
                {currentStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function getPopoverPosition(rect: DOMRect, position: 'top' | 'bottom' | 'left' | 'right') {
  const margin = 16;
  const cardWidth = 320;
  
  // Basic positioning logic. For a real app, use Floating UI for robust positioning.
  if (position === 'bottom') {
    return {
      top: rect.bottom + margin,
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - cardWidth - margin)),
    };
  }
  if (position === 'top') {
    return {
      top: rect.top - margin - 200, // Appx height
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - cardWidth - margin)),
    };
  }
  if (position === 'left') {
    return {
      top: rect.top,
      left: rect.left - cardWidth - margin,
    };
  }
  // Right
  return {
    top: rect.top,
    left: rect.right + margin,
  };
}
