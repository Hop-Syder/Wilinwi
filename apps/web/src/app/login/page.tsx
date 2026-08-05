'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page de Connexion Wilinwi — Layout Split-Screen 100dvh Zero-Scroll (Desktop / Tablette / Mobile)
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
        if (!getPinToken()) {
          router.push('/pos');
        } else {
          router.push('/');
        }
      }
    }, 500);
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
    <div className="h-screen h-[100dvh] w-screen overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-white font-sans text-slate-900 antialiased">
      {/* 1. PANNEAU GAUCHE : MARQUE, GRAPHISMES & RÉASSURANCE (Desktop Zéro-Scroll) */}
      <div className="hidden lg:flex flex-col justify-between p-8 xl:p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden h-full select-none border-r border-slate-800/60">
        {/* Halos lumineux en arrière-plan */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

        {/* Header / Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Image
              src="/logo.png"
              alt="Wilinwi Logo"
              width={180}
              height={50}
              className="object-contain brightness-0 invert"
              style={{ height: 'auto', maxHeight: '48px' }}
              priority
            />
          </div>
          <h2 className="text-xl xl:text-2xl font-extrabold leading-tight text-slate-100 max-w-md">
            La solution de caisse & gestion commerciale offline-first d’Afrique de l’Ouest.
          </h2>
        </div>

        {/* Center Mockup - Widget Caisse Live */}
        <div className="relative z-10 my-auto py-2 max-w-md w-full">
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-4 xl:p-5 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold">
                  Terminal de Vente Actif
                </p>
                <h4 className="text-xs font-bold text-slate-100">Boutique Ganhi — Cotonou</h4>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            </div>

            <div className="space-y-0.5 mb-3">
              <p className="text-[11px] text-slate-400 font-medium">Ventes encaissées aujourd'hui</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl xl:text-3xl font-extrabold font-mono tracking-tight text-white">
                  {mounted ? sales.toLocaleString('fr-FR') : '148 500'} FCFA
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +14.2%
                </span>
              </div>
            </div>

            {/* Mini Graphique */}
            <div className="flex items-end justify-between gap-2 h-12 mb-3 px-1">
              {barHeights.map((h, idx) => (
                <div
                  key={idx}
                  className={`w-full rounded-t transition-all duration-700 ${
                    idx === 4
                      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-700/60 group-hover:bg-slate-600'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Base Locale Sync OK
              </span>
              <span className="font-mono text-[10px] text-slate-400">IndexedDB v2.4</span>
            </div>
          </div>
        </div>

        {/* 3 Promesses Opérationnelles Compactes */}
        <div className="space-y-2.5 relative z-10 max-w-md">
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-xs">Mode 100% Hors-Ligne</h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Encaissez vos ventes même en cas de coupure internet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-xs">Mobile Money Intégré</h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                MTN MoMo, MoMo Moov et Wave enregistrés en 1 clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-xs">Multi-Boutiques & Dépôts</h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Suivez vos stocks et vos caisses sur tous vos points de vente.
              </p>
            </div>
          </div>
        </div>

        {/* Pied de panneau */}
        <div className="flex items-center justify-between text-xs text-slate-400 relative z-10 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Données chiffrées & isolation stricte par boutique</span>
          </div>
          <span className="font-semibold text-slate-500">Bénin / XOF</span>
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
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-4">
            Entrez vos identifiants marchands pour accéder à votre caisse.
          </p>

          {/* Selector de Mode (Double Mode) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-4 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setLoginMode('manager');
                setError(null);
              }}
              className={`py-2 px-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'manager'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gérant / Promoteur</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('cashier');
                setError(null);
              }}
              className={`py-2 px-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'cashier'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Caissier (PIN)</span>
            </button>
          </div>

          {/* Affichage d'Erreur */}
          {error && (
            <div className="mb-3.5 p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl">
              <p className="text-xs font-bold text-rose-700">{error}</p>
            </div>
          )}

          {/* Formulaire Gérant / Promoteur */}
          {loginMode === 'manager' ? (
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
          ) : (
            /* Mode Caissier Rapide (PIN) */
            <form onSubmit={handleCashierPinLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Boutique / Point de Vente
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedBoutique}
                    onChange={(e) => setSelectedBoutique(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 text-slate-900 font-medium"
                  >
                    <option value="Boutique Prestige - Ganhi">Boutique Prestige — Ganhi (Cotonou)</option>
                    <option value="Boutique Prestige - Agblangandan">
                      Boutique Prestige — Agblangandan
                    </option>
                    <option value="Dépôt Central Prestige - Calavi">
                      Dépôt Central Prestige — Calavi
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                  Code PIN Caissier (4 chiffres)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.8em] text-2xl py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono bg-slate-50/50 font-black text-slate-900"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || pinCode.length < 4}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
              >
                {loading ? (
                  <span className="text-xs flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {loadingStep || 'Connexion PIN...'}
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
