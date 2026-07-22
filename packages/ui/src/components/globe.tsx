/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé : globe.tsx
 * @created 2026-07-22
 * @updated 2026-07-22
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { cn } from '../cn.js';

export interface GlobeProps {
  className?: string;
}

export function Globe({ className }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let phi = 0;
    let width = 0;

    if (!canvasRef.current) return;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 0, // Light mode globe. Set to 1 for dark mode.
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: [0.1, 0.8, 0.3], // Emerald style
      glowColor: [1, 1, 1],
      markers: [
        // Quelques établissements factices en Afrique de l'Ouest et en Europe
        { location: [14.6928, -17.4467], size: 0.1 }, // Dakar
        { location: [5.3599, -4.0083], size: 0.1 }, // Abidjan
        { location: [48.8566, 2.3522], size: 0.05 }, // Paris
        { location: [34.0522, -118.2437], size: 0.05 }, // LA
      ],
      // @ts-expect-error cobe types might be missing onRender or require specific state typing
      onRender: (state: any) => {
        // Animation continue
        state.phi = phi;
        phi += 0.005;
        // Ajuste la taille si redimensionnement
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    setIsLoaded(true);

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      className={cn(
        'mx-auto relative flex items-center justify-center w-full max-w-[600px] aspect-square',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          'w-full h-full contain-layout-paint-size transition-opacity duration-1000',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
