'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page de Connexion Wilinwi MVP2 - Design Split-Screen Premium, Réassurance & Double Mode (Manager / PIN)
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
  Wifi,
  Smartphone,
  Store,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [loginMode, setLoginMode] = useState<'manager' | 'cashier'>('manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mode Caissier PIN
  const [pinCode, setPinCode] = useState('');
  const [selectedBoutique, setSelectedBoutique] = useState('Boutique Prestige - Ganhi');

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
    setLoadingStep('[ 1/3 ] Validation des identifiants...');

    const { error: authErr } = await getSupabase().auth.signInWithPassword({ email, password });
    if (authErr) {
      setLoading(false);
      return setError(authErr.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : authErr.message);
    }

    setLoadingStep('[ 2/3 ] Synchronisation du catalogue local...');
    const me = await refreshUser();

    setLoadingStep('[ 3/3 ] Caisse prête ! Redirection...');
    setTimeout(() => {
      setLoading(false);
      if (me?.role === 'CASHIER' || me?.role === 'SELLER') {
        router.push('/pos');
      } else if (me?.role === 'DELIVERY') {
        router.push('/livraisons');
      } else {
        if (!getPinToken()) {
          router.push('/pos');
        } else {
          router.push('/');
        }
      }
    }, 600);
  };

  const handleCashierPinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length < 4) {
      return setError('Le code PIN doit comporter 4 chiffres');
    }
    setLoading(true);
    setError(null);
    setLoadingStep('Vérification du PIN caissier...');

    try {
      setPinToken(pinCode);
      await refreshUser();
      setLoadingStep('Redirection vers la caisse tactile...');
      setTimeout(() => {
        setLoading(false);
        router.push('/pos');
      }, 500);
    } catch {
      setLoading(false);
      setError('Code PIN invalide. Veuillez réessayer.');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 font-sans text-slate-900 antialiased overflow-x-hidden">
      {/* 1. PANNEAU GAUCHE : MARQUE, GRAPHISMES & RÉASSURANCE (Desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden border-r border-slate-800/60 select-none">
        {/* Motifs géométriques décoratifs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

        {/* Logo & Tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Image
              src="/logo.png"
              alt="Wilinwi Logo"
              width={200}
              height={60}
              className="object-contain brightness-0 invert"
              style={{ height: 'auto', maxHeight: '55px' }}
              priority
            />
          </div>
          <h2 className="text-3xl font-extrabold leading-snug text-slate-100 max-w-md tracking-tight">
            La solution de caisse & gestion commerciale offline-first d’Afrique de l’Ouest.
          </h2>
        </div>

        {/* Center Mockup - Widget Caisse & Chiffre d'Affaires Live */}
        <div className="relative z-10 my-auto py-6 max-w-md w-full">
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Terminal de Vente Actif</p>
                <h4 className="text-sm font-bold text-slate-100">Boutique Ganhi — Cotonou</h4>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            </div>

            <div className="space-y-1 mb-5">
              <p className="text-xs text-slate-400 font-medium">Ventes encaissées aujourd'hui</p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-white transition-all">
                  {mounted ? sales.toLocaleString('fr-FR') : '148 500'} FCFA
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +14.2%
                </span>
              </div>
            </div>

            {/* Mini Graphique */}
            <div className="flex items-end justify-between gap-2 h-16 mb-4 px-1">
              {barHeights.map((h, idx) => (
                <div
                  key={idx}
                  className={`w-full rounded-t transition-all duration-700 ${
                    idx === 4
                      ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-700/60 group-hover:bg-slate-600'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Base Locale Sync OK
              </span>
              <span className="font-mono text-[11px] text-slate-400">IndexedDB v2.4</span>
            </div>
          </div>
        </div>

        {/* 3 Promesses Opérationnelles (Badges Glassmorphism) */}
        <div className="space-y-3 relative z-10 max-w-md">
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-xs">Caisse 100% Hors-Ligne</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Encaissez vos clients même sans connexion internet ou lors de coupures réseau.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-xs">Paiements Locaux & Mobile Money</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Compatibilité instantanée avec MTN MoMo, MoMo Moov, Wave et Espèces.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-xs">Multi-Boutiques & Dépôts</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Passez d'un point de vente à l'autre et contrôlez vos caisses en 1 clic.</p>
            </div>
          </div>
        </div>

        {/* Footer Panneau Gauche */}
        <div className="flex items-center justify-between text-xs text-slate-400 relative z-10 border-t border-white/10 pt-4 mt-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Données sécurisées & isolées par entreprise</span>
          </div>
          <span className="font-semibold text-slate-500">Bénin / UOA</span>
        </div>
      </div>

      {/* 2. PANNEAU DROIT : FORMULAIRE DE CONNEXION */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white">
        {/* Top Bar Mobile / Devise */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 lg:hidden">
            <Image src="/logo.png" alt="Wilinwi Logo" width={140} height={45} className="object-contain" style={{ height: 'auto', maxHeight: '38px' }} priority />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
              Bénin (XOF)
            </span>
          </div>
        </div>

        {/* Conteneur Formulaire */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bienvenue sur Wilinwi 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-8 font-medium">
            Connectez-vous pour accéder à votre espace marchand et à votre caisse.
          </p>

          {/* Selector de Mode (Double Mode) */}
          <div className="grid grid-cols-2 gap-1 p-1.5 bg-slate-100 rounded-2xl mb-6 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setLoginMode('manager'); setError(null); }}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                loginMode === 'manager'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Promoteur / Gérant</span>
            </button>

            <button
              type="button"
              onClick={() => { setLoginMode('cashier'); setError(null); }}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                loginMode === 'cashier'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Caissier Rapide (PIN)</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl">
              <p className="text-xs font-bold text-rose-700">{error}</p>
            </div>
          )}

          {/* Formulaire Gérant (Email / Mot de Passe) */}
          {loginMode === 'manager' ? (
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: christian@prestige.bj"
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Garder ma session active sur cet appareil
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="text-xs font-bold flex items-center gap-2.5">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {loadingStep}
                  </span>
                ) : (
                  <>
                    <span>Se Connecter à la Caisse</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Mode Caissier Rapide (PIN) */
            <form onSubmit={handleCashierPinLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Boutique / Point de Vente
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedBoutique}
                    onChange={(e) => setSelectedBoutique(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 text-slate-900"
                  >
                    <option value="Boutique Prestige - Ganhi">Boutique Prestige — Ganhi (Cotonou)</option>
                    <option value="Boutique Prestige - Agblangandan">Boutique Prestige — Agblangandan (Sèmè-Kpodji)</option>
                    <option value="Dépôt Central Prestige - Calavi">Dépôt Central Prestige — Calavi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                  Code PIN Caissier (4 chiffres)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.8em] text-3xl py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono bg-slate-50/50 font-black text-slate-900"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || pinCode.length < 4}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="text-xs font-bold flex items-center gap-2.5">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {loadingStep}
                  </span>
                ) : (
                  <>
                    <span>Ouvrir la Session Caisse (PIN)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Link Signup */}
        <div className="text-center text-xs text-slate-500 font-medium border-t border-slate-100 pt-6">
          Vous êtes un nouveau commerce marchand ?{' '}
          <Link href="/signup" className="font-extrabold text-emerald-600 hover:text-emerald-700 hover:underline">
            Créer un compte marchand (14 jours gratuits)
          </Link>
        </div>
      </div>
    </div>
  );
}
