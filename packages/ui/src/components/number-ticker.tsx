/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé : number-ticker.tsx (Animation de compteur)
 * @created 2026-07-21
 * @updated 2026-07-21
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import * as React from 'react';
import { cn } from '../cn.js';

interface NumberTickerProps {
  value: number;
  format?: (val: number) => string;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({ 
  value, 
  format = (val) => val.toString(), 
  duration = 1.5, 
  className,
  prefix = '',
  suffix = ''
}: NumberTickerProps) {
  const [current, setCurrent] = React.useState(0);
  
  React.useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCurrent(value * easeProgress);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCurrent(value);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  
  return (
    <span className={cn("inline-block tabular-nums", className)}>
      {prefix}{format(current)}{suffix}
    </span>
  );
}
