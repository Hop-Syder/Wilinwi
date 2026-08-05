'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page de Connexion Wilinwi — Finitions Pro (Split-Screen, 100dvh, Zero-Scroll)
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
import { Button, Input } from '@wilinwi/ui';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Simulation dynamique panneau gauche
  const [sales, setSales] = useState(148500);
  const [barHeights, setBarHeights] = useState([38, 55, 48, 72, 95]);

  useEffect(() => {
    setMounted(true);
    const bloc = localStorage.getItem('wilinwi_auth_block');
    if (bloc) {
      setError(bloc);
      localStorage.removeItem('wilinwi_auth_block');
    }

    const interval = setInterval(() => {
      setSales((s) => s + Math.floor(Math.random() * 900) + 150);
      setBarHeights((prev) =>
        prev.map((h, i) => {
          if (i === 4) return 95;
          const diff = Math.floor(Math.random() * 14) - 7;
          return Math.max(28, Math.min(88, h + diff));
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authErr } = await getSupabase().auth.signInWithPassword({ email, password });

    if (authErr) {
      setLoading(false);
      return setError(
        authErr.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : authErr.message
      );
    }

    await refreshUser();
    router.push('/');
  }

  return (
    <main className="flex h-screen h-[100dvh] w-screen bg-background text-text-primary font-sans antialiased overflow-hidden">

      {/* ═══════════════════════════════════════
          PANNEAU GAUCHE — Branding & Démo Live
          ═══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1224] relative flex-col justify-between p-10 text-white overflow-hidden border-r border-slate-800/40">

        {/* Halos lumineux d'ambiance */}
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-[-8%] right-[-8%] h-[380px] w-[380px] rounded-full bg-primary/15 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[-8%] left-[-8%] h-[380px] w-[380px] rounded-full bg-[#00A86B]/10 blur-[90px] pointer-events-none" />

        {/* ── Logo centré ── */}
        <div className="flex items-center justify-center relative z-10 w-full">
          <Image
            src="/logo.png"
            alt="Wilinwi Logo"
            width={200}
            height={60}
            className="object-contain brightness-0 invert"
            style={{ height: 'auto', maxHeight: '56px' }}
            priority
          />
        </div>

        {/* ── Widget Terminal Live ── */}
        <div className="relative z-10 my-auto py-4 flex flex-col items-center gap-6">

          {/* Carte terminal */}
          <div className="w-full max-w-sm bg-white/[0.04] backdrop-blur-xl border border-white/[0.09] rounded-2xl p-5 shadow-2xl relative overflow-hidden group cursor-default hover:border-white/[0.15] transition-all duration-300">
            {/* Reflet interne */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.04] pointer-events-none rounded-2xl" />
            {/* Glow interne hover */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* En-tête terminal */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-extrabold">Terminal Actif</p>
                <h4 className="text-xs font-bold text-slate-200 mt-0.5">Boutique Ganhi — Cotonou</h4>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/60" />
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* CA du jour */}
            <div className="space-y-0.5 mb-4">
              <p className="text-[10px] text-slate-400 font-medium">Ventes encaissées aujourd&apos;hui</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-[1.6rem] font-black font-mono tracking-tight text-white tabular-nums">
                  {mounted ? sales.toLocaleString('fr-FR') : '148 500'}
                </span>
                <span className="text-sm font-bold text-slate-300">FCFA</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-500/20">
                  <TrendingUp className="w-2.5 h-2.5" /> +14.2%
                </span>
              </div>
            </div>

            {/* Sparkline animée */}
            <div className="flex items-end justify-between gap-1.5 h-14 mb-3.5 px-0.5">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className={`w-full rounded-t transition-all duration-700 ease-in-out ${
                    i === 4
                      ? 'bg-primary shadow-[0_0_12px_rgba(0,5,234,0.55)]'
                      : i === 3
                      ? 'bg-primary/50 group-hover:bg-primary/65'
                      : 'bg-slate-700/70 group-hover:bg-slate-600/80'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            {/* Pied de carte */}
            <div className="border-t border-white/[0.07] pt-3 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Sync OK · IndexedDB
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary/70" />
                RLS actif
              </span>
            </div>
          </div>

          {/* Pitch sous la carte */}
          <div className="text-center max-w-xs space-y-1.5">
            <h3 className="text-base font-bold text-white leading-snug">
              Le système d&apos;exploitation du commerce africain
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Encaissez, gérez vos stocks et pilotez vos performances en temps réel — même sans internet.
            </p>
          </div>

          {/* 3 promesses compactes */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { label: '100% Hors-Ligne', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
              { label: 'MTN · Moov · Wave', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
              { label: 'Multi-Boutiques', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' },
            ].map(({ label, color }) => (
              <span key={label} className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${color}`}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 relative z-10 border-t border-white/[0.05] pt-4">
          <span>© 2026 Wilinwi by Nexus Partners</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-500/70" />
            Données chiffrées · Bénin XOF
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          PANNEAU DROIT — Formulaire Connexion
          ═══════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 h-full bg-slate-50/60 overflow-hidden">

        {/* Logo mobile only */}
        <div className="lg:hidden flex items-center justify-center w-full mb-4 shrink-0">
          <Image
            src="/logo.png"
            alt="Wilinwi Logo"
            width={140}
            height={44}
            className="object-contain"
            style={{ height: 'auto', maxHeight: '38px' }}
            priority
          />
        </div>

        {/* Carte formulaire */}
        <div className="w-full max-w-sm mx-auto my-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_40px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden">

            {/* Header carte */}
            <div className="px-7 pt-7 pb-4 border-b border-slate-100">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Ravi de vous revoir 👋
              </h1>
              <p className="text-xs text-slate-500 mt-1.5">
                Accédez à votre caisse & tableaux de bord.
              </p>
            </div>

            {/* Corps du formulaire */}
            <div className="px-7 py-6 space-y-4 select-none">
              <form onSubmit={onSubmit} className="space-y-4">

                {/* Champ Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Adresse email
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@entreprise.com"
                      required
                      className="w-full h-10 text-sm pr-3 focus:ring-2 focus:ring-primary/20 transition-all"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Champ Mot de passe */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Mot de passe
                    </label>
                    <Link
                      href="/reset-password"
                      className="text-[11px] font-semibold text-primary hover:underline transition-colors"
                    >
                      Oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-10 text-sm pr-9 focus:ring-2 focus:ring-primary/20 transition-all"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-0.5"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl" role="alert">
                    <p className="text-xs font-semibold text-rose-700">{error}</p>
                  </div>
                )}

                {/* Bouton Connexion */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full justify-center h-11 text-sm font-semibold group rounded-xl bg-gradient-to-b from-[#0005ea] to-[#0004c8] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,5,234,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#2e31ff] hover:to-[#0005ea] active:scale-[0.98] transition-all duration-200 mt-1 border-0 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connexion en cours…
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Ouvrir la caisse
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Séparateur */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100" />
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-medium">Nouveau sur Wilinwi ?</span>
                <div className="flex-grow border-t border-slate-100" />
              </div>

              {/* Lien Signup */}
              <div className="text-center pb-1">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors group cursor-pointer"
                >
                  Créer une boutique gratuitement
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </div>

          {/* Note de sécurité sous la carte */}
          <p className="text-center text-[10px] text-slate-400 mt-4 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Connexion chiffrée · Données isolées par boutique
          </p>
        </div>

        {/* Footer bas droite */}
        <div className="text-center text-[10px] text-slate-400 shrink-0 pt-2">
          © 2026 Wilinwi by Nexus Partners
        </div>
      </div>
    </main>
  );
}
