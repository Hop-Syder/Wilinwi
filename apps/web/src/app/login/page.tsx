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
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Wifi,
  CreditCard,
  Store,
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
  const [sales, setSales] = useState(152566);

  useEffect(() => {
    setMounted(true);
    const bloc = localStorage.getItem('wilinwi_auth_block');
    if (bloc) {
      setError(bloc);
      localStorage.removeItem('wilinwi_auth_block');
    }

    const interval = setInterval(() => {
      setSales((s) => s + Math.floor(Math.random() * 800) + 200);
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
      {/* 1. PANNEAU GAUCHE : VIVANT & COLORÉ */}
      <div className="hidden lg:flex flex-col justify-between p-8 xl:p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden h-full select-none border-r border-slate-800">

        {/* Halos lumineux ambiants */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

        {/* ─── LOGO + HEADLINE ─── */}
        <div className="relative z-10 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-500 p-0.5 shadow-lg shadow-emerald-500/30 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-emerald-400">
                W
              </div>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white block leading-none">Wilinwi</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block mt-0.5">
                Le système d&apos;exploitation du commerce africain
              </span>
            </div>
          </div>
          <h2 className="text-xl xl:text-2xl font-black leading-tight text-slate-100 max-w-md">
            Démarrez votre caisse &amp; vos stocks en moins de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              2 minutes
            </span>.
          </h2>
        </div>

        {/* ─── VISUEL VIVANT : CARTE POS GLASSMORPHISM ─── */}
        <div className="relative z-10 my-auto">

          {/* Carte principale */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">

            {/* Badge Offre + badge En direct */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>14 JOURS D&apos;ESSAI OFFERTS</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                En direct
              </span>
            </div>

            {/* CA du jour */}
            <div className="my-2">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Ventes encaissées aujourd&apos;hui · Boutique Ganhi (Cotonou)
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl xl:text-4xl font-black text-white tracking-tight font-mono">
                  {mounted ? sales.toLocaleString('fr-FR') : '152 566'}{' '}
                  <span className="text-xl font-bold text-emerald-400">FCFA</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +14.2%
                </span>
              </div>
            </div>

            {/* Badges modes de paiement colorés */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Modes acceptés:</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">MTN MoMo</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-400/20 text-blue-300 border border-blue-400/30">Moov MoMo</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">Wave</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">Espèces</span>
            </div>
          </div>

          {/* 3 avantages avec icônes colorées */}
          <div className="grid grid-cols-1 gap-2.5 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Wifi className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">
                Fonctionnement <strong className="text-emerald-400">100% Hors-Ligne</strong> sans coupure
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">
                <strong className="text-amber-400">Sans carte bancaire</strong> requise à l&apos;inscription
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">
                Création <strong className="text-indigo-300">automatique</strong> de votre premier magasin
              </span>
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <div className="flex items-center justify-between text-xs text-slate-400 relative z-10 pt-3 border-t border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Données sécurisées &amp; isolées</span>
          </div>
          <span className="font-semibold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            🇧🇯 Bénin / XOF (FCFA)
          </span>
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
