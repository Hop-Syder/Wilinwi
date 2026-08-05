'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page d'Inscription Wilinwi — Wizard 3 Étapes Zéro-Scroll (100% Viewport Height)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  Smartphone,
  Building2,
  Mail,
  Lock,
} from 'lucide-react';
import { apiPost } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données du formulaire
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    companyName: '',
    sector: 'Mode & Prêt-à-Porter',
    city: 'Cotonou',
  });

  const sectors = [
    'Mode & Prêt-à-Porter',
    'Supérette & Alimentation',
    'Électronique & Téléphonie',
    'Pharmacie & Santé',
    'Restauration & Bar',
    'Commerce Général',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step < 3) {
      setStep((step + 1) as 2 | 3);
      return;
    }

    setLoading(true);
    try {
      // 1. Création du compte marchand & entreprise via l'API Wilinwi
      await apiPost('/api/auth/signup', {
        nomBoutique: formData.companyName || 'Boutique Prestige',
        nomComplet: formData.fullName || 'Promoteur Wilinwi',
        email: formData.email,
        password: formData.password,
        typeEtablissement: 'BOUTIQUE',
        infrastructure: 'RETAIL',
      });

      // 2. Connexion immédiate Supabase Auth
      const { error: authErr } = await getSupabase().auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authErr) throw authErr;

      // 3. Redirection vers la caisse tactile
      router.push('/pos');
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le compte. Vérifiez vos informations."
      );
    }
  };

  return (
    <div className="h-screen h-[100dvh] w-screen overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-white font-sans text-slate-900 antialiased">
      {/* 1. PANNEAU GAUCHE : MARQUE & OFFRE DE BIENVENUE (Desktop Zéro-Scroll) */}
      <div className="hidden lg:flex flex-col justify-between p-8 xl:p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden h-full select-none border-r border-slate-800/60">
        {/* Halos lumineux arrière-plan */}
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
          <h2 className="text-2xl xl:text-3xl font-extrabold leading-tight text-slate-100 max-w-md">
            Démarrez votre caisse en moins de 2 minutes.
          </h2>
        </div>

        {/* Avantages de l'Essai Gratuit */}
        <div className="space-y-3.5 relative z-10 max-w-md my-auto">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
              <Sparkles className="w-4 h-4" />
              <span>OFFRE DE BIENVENUE</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100">14 Jours d'Essai Gratuit</h3>
            <p className="text-xs text-slate-300 mt-1">
              Accès complet à toutes les fonctionnalités Pro : Caisse Offline, Stocks, Trésorerie
              & Rapports Z.
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-300 pl-1">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Aucune carte bancaire requise à l'inscription</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Création automatique de votre premier magasin</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Assistance & formation de l'équipe offertes</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-400 relative z-10 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Données hébergées en toute sécurité & isolées</span>
          </div>
          <span className="font-semibold text-slate-500">Bénin / XOF</span>
        </div>
      </div>

      {/* 2. PANNEAU DROIT : ASSISTANT MULTI-ÉTAPES (Zero-Scroll) */}
      <div className="flex flex-col justify-between p-5 sm:p-8 lg:p-10 h-full overflow-hidden bg-white">
        {/* Header & Barre de Progression */}
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

          {/* Indicateur d'étape */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Étape {step} sur 3</span>
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Formulaire Centré */}
        <div className="max-w-sm sm:max-w-md w-full mx-auto my-auto py-2">
          {error && (
            <div className="mb-3.5 p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl">
              <p className="text-xs font-bold text-rose-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ÉTAPE 1 : IDENTITÉ PROMOTEUR */}
            {step === 1 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Créer votre compte 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Entrez vos coordonnées pour débuter l'essai gratuit.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom & Prénom du Promoteur
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="ex: Ismaël Abassi"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Numéro de Téléphone Portable
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+229 97 00 00 00"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adresse Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="commerce@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : INFORMATIONS COMMERCE */}
            {step === 2 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Votre Commerce 🏬
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Configurez le profil de votre première boutique.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom du Commerce / Enseigne
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="ex: Prestige Prêt-à-Porter"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Secteur d'Activité Principal
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {sectors.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setFormData({ ...formData, sector: sec })}
                        className={`p-2 text-[11px] font-medium rounded-xl border text-left transition-all cursor-pointer ${
                          formData.sector === sec
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ville d'implantation
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="ex: Cotonou, Agblangandan, Calavi..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 focus:bg-white text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : CONFIRMATION & LANCEMENT */}
            {step === 3 && (
              <div className="space-y-4 animate-fadeIn text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Tout est prêt ! 🚀
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Votre espace{' '}
                    <strong className="text-slate-900">
                      {formData.companyName || 'Mon Commerce'}
                    </strong>{' '}
                    va être initialisé avec 14 jours d'essai offert.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-left space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Promoteur:</span>{' '}
                    <span className="font-semibold text-slate-800">{formData.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Téléphone:</span>{' '}
                    <span className="font-semibold text-slate-800">{formData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Boutique:</span>{' '}
                    <span className="font-semibold text-slate-800">{formData.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Formule:</span>{' '}
                    <span className="font-bold text-emerald-600">Plan Pro (14j gratuits)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons de Navigation Wizard */}
            <div className="flex items-center gap-2 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as 1 | 2)}
                  className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <span className="text-xs flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création du magasin en cours...
                  </span>
                ) : (
                  <>
                    <span>{step === 3 ? 'Lancer Ma Caisse Maintenant' : 'Étape Suivante'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Lien Login */}
        <div className="text-center text-xs text-slate-500 shrink-0 py-1">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="font-bold text-emerald-600 hover:underline">
            Se connecter à la caisse
          </Link>
        </div>
      </div>
    </div>
  );
}
