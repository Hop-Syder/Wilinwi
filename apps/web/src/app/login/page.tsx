'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page de Connexion Wilinwi — Style Bento Box Fintech, Split-Screen 100dvh Zero-Scroll
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getPinToken, setPinToken } from '@/lib/api';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Zap,
  LayoutGrid,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [mounted, setMounted] = useState(false);

  // Simulation Ventes du jour en direct sur le panneau de gauche
  const [sales, setSales] = useState(148500);
  const [barHeights, setBarHeights] = useState([40, 60, 50, 75, 95]);

  useEffect(() => {
    setMounted(true);
    const bloc = localStorage.getItem('wilinwi_auth_block');
    if (bloc) {
      setError(bloc);
      localStorage.removeItem('wilinwi_auth_block');
    }

    const interval = setInterval(() => {
      setSales((s) => s + Math.floor(Math.random() * 800) + 200);
      setBarHeights((prev) =>
        prev.map((h, i) => {
          if (i === 4) return 95;
          const diff = Math.floor(Math.random() * 15) - 7;
          return Math.max(30, Math.min(90, h + diff));
        })
      );
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLoadingStep('Validation des identifiants...');

    const { error: authErr } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      setLoading(false);
      return setError(
        authErr.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : authErr.message
      );
    }

    setLoadingStep('Synchronisation session...');
    const userProfile = await refreshUser();

    setLoadingStep('Caisse prête ! Redirection...');
    setTimeout(() => {
      setLoading(false);
      if (userProfile?.role === 'CASHIER' || userProfile?.role === 'SELLER') {
        router.push('/pos');
      } else if (userProfile?.role === 'DELIVERY') {
        router.push('/livraisons');
      } else {
        router.push('/');
      }
    }, 500);
  };


  return (
    <div className="h-screen h-[100dvh] w-screen overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-white font-sans text-slate-900 antialiased">
      {/* 1. PANNEAU GAUCHE : BENTO BOX FINTECH (Desktop Zéro-Scroll) */}
      <div className="hidden lg:flex flex-col justify-between p-7 xl:p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden h-full select-none border-r border-slate-800/40">
        {/* Halos lumineux */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/[0.10] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* ─── LOGO + TAGLINE ─── */}
        <div className="relative z-10 shrink-0">
          <Image
            src="/logo.png"
            alt="Wilinwi Logo"
            width={160}
            height={44}
            className="object-contain brightness-0 invert mb-2.5"
            style={{ height: 'auto', maxHeight: '42px' }}
            priority
          />
          <p className="text-[13px] xl:text-sm font-semibold text-slate-400 leading-snug max-w-xs">
            Le système d'exploitation du commerce africain.
          </p>
        </div>

        {/* ─── BENTO GRID ─── */}
        <div className="relative z-10 my-auto flex flex-col gap-2.5 max-w-md w-full">

          {/* Bento 1 — Grand widget Terminal (pleine largeur) */}
          <div className="relative rounded-2xl border border-white/[0.09] bg-white/[0.045] backdrop-blur-xl p-4 xl:p-5 overflow-hidden group transition-all hover:bg-white/[0.065] hover:border-white/[0.14]">
            {/* Glow interne */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Terminal Actif</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Ganhi · Cotonou</span>
            </div>
            {/* Montant + trend */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl xl:text-3xl font-black font-mono tracking-tight text-white">
                {mounted ? sales.toLocaleString('fr-FR') : '148 500'}&nbsp;
                <span className="text-lg text-slate-400 font-bold">FCFA</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full shrink-0">
                <TrendingUp className="w-3 h-3" /> +14.2%
              </span>
            </div>
            {/* Sparkline */}
            <div className="flex items-end gap-1.5 h-10 mb-3">
              {barHeights.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-t-md transition-all duration-700 ${
                    idx === 4
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]'
                      : idx >= 3
                      ? 'bg-emerald-500/40'
                      : 'bg-slate-700/70 group-hover:bg-slate-600/80'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            {/* Footer status */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.07] text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sync OK
              </span>
              <span className="font-mono text-slate-500">IndexedDB v2.4</span>
            </div>
          </div>

          {/* Bento 2+3 — Deux cards côte à côte */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card Offline */}
            <div className="relative rounded-2xl border border-white/[0.09] bg-white/[0.04] backdrop-blur-xl p-3.5 xl:p-4 overflow-hidden group transition-all hover:bg-white/[0.07] hover:border-white/[0.14]">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="mb-2 flex items-center justify-between">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">100% Offline</span>
              </div>
              <h4 className="text-[13px] font-bold text-slate-100 leading-tight">Caisse Sans Internet</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Ventes enregistrées en local, sync auto à la reconnexion.
              </p>
            </div>

            {/* Card Mobile Money */}
            <div className="relative rounded-2xl border border-white/[0.09] bg-white/[0.04] backdrop-blur-xl p-3.5 xl:p-4 overflow-hidden group transition-all hover:bg-white/[0.07] hover:border-white/[0.14]">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="mb-2 flex items-center justify-between">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/20">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/70">MoMo</span>
              </div>
              <h4 className="text-[13px] font-bold text-slate-100 leading-tight">Mobile Money</h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {['MTN', 'Moov', 'Wave'].map((op) => (
                  <span key={op} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/10">
                    {op}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bento 4 — Multi-boutiques (pleine largeur) */}
          <div className="relative rounded-2xl border border-white/[0.09] bg-white/[0.04] backdrop-blur-xl p-3.5 xl:p-4 overflow-hidden group transition-all hover:bg-white/[0.07] hover:border-white/[0.14]">
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20 shrink-0">
                <LayoutGrid className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-slate-100">Multi-Boutiques & Dépôts</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Basculez entre vos points de vente en 1 clic — stocks & caisses unifiés.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FOOTER SÉCURITÉ ─── */}
        <div className="flex items-center justify-between text-xs text-slate-500 relative z-10 border-t border-white/[0.07] pt-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Données chiffrées & isolation par boutique</span>
          </div>
          <span className="font-bold text-slate-600">Bénin · XOF</span>
        </div>
      </div>

      {/* 2. PANNEAU DROIT : FORMULAIRE CONNEXION (Zero-Scroll) */}
      <div className="flex flex-col justify-between p-5 sm:p-8 lg:p-10 h-full overflow-hidden bg-white">
        {/* Top Header Mobile / Devises */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 lg:hidden">
            <Image
              src="/logo.png"
              alt="Wilinwi Logo"
              width={130}
              height={40}
              className="object-contain"
              style={{ height: 'auto', maxHeight: '34px' }}
              priority
            />
          </div>
          <div className="ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            FCFA (XOF)
          </div>
        </div>

        {/* Formulaire Centré Verticalement */}
        <div className="max-w-sm sm:max-w-md w-full mx-auto my-auto py-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Connexion à votre espace 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
            Entrez vos identifiants marchands pour accéder à votre caisse.
          </p>

          {/* Affichage d'Erreur */}
          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl">
              <p className="text-xs font-bold text-rose-700">{error}</p>
            </div>
          )}

          {/* Formulaire Email / Mot de passe */}
          <form onSubmit={handleManagerLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email ou Numéro de Téléphone
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: commerce@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mot de passe
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>Garder ma session active</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70 mt-2 cursor-pointer"
            >
              {loading ? (
                <span className="text-xs flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {loadingStep || 'Connexion...'}
                </span>
              ) : (
                <>
                  <span>Se Connecter à la Caisse</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Lien Création de Compte */}
        <div className="text-center text-xs text-slate-500 shrink-0 py-1">
          Nouveau commerce ?{' '}
          <Link href="/signup" className="font-bold text-emerald-600 hover:underline">
            Créer un compte (14 jours gratuits)
          </Link>
        </div>
      </div>
    </div>
  );
}
