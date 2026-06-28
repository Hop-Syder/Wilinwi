/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Preloader premium avec animation du logo Wilinwi
 * @created 2026-06-25
 * @updated 2026-06-25
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Image from 'next/image';

interface PreloaderProps {
  message?: string;
  fullscreen?: boolean;
}

export function Preloader({ message = 'Chargement de votre espace...', fullscreen = true }: PreloaderProps) {
  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white transition-opacity duration-300'
          : 'flex flex-col items-center justify-center p-8 bg-slate-900/5 rounded-2xl border border-slate-100 backdrop-blur-sm'
      }
    >
      <div className="relative flex flex-col items-center">
        {/* Glow effect behind the logo */}
        <div className="absolute -inset-6 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />

        {/* Logo container with scale animation */}
        <div className="relative h-48 w-48 sm:h-56 sm:w-56 animate-pulse">
          <Image
            src="/logo.png"
            alt="Wilinwi Logo"
            fill
            sizes="224px"
            className="object-contain"
            priority
          />
        </div>

        {/* Brand name */}
        <span className="mt-4 font-display text-xl font-black tracking-widest text-emerald-400">
          WILINWI
        </span>

        {/* Status Message */}
        <p className="mt-4 text-xs font-medium text-slate-400 tracking-wide animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
