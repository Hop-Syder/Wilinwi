'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page d'Inscription Wilinwi — Wizard 3 Étapes Zéro-Scroll Pro
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
import { Button, Input } from '@wilinwi/ui';
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
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { apiPost } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="flex h-screen h-[100dvh] w-screen bg-background text-text-primary font-sans antialiased overflow-hidden">
      
      {/* ═══════════════════════════════════════
          PANNEAU GAUCHE — Branding & Offre
          ═══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1224] relative flex-col justify-between p-10 text-white overflow-hidden border-r border-slate-800/40">
        
        {/* Halos lumineux d'ambiance */}
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-[-8%] right-[-8%] h-[380px] w-[380px] rounded-full bg-primary/15 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[-8%] left-[-8%] h-[380px] w-[380px] rounded-full bg-[#00A86B]/10 blur-[90px] pointer-events-none" />

        {/* ── Logo ── */}
        <div className="relative z-10">
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

        {/* ── Carte Avantage (Style Bento Box) ── */}
        <div className="relative z-10 my-auto py-4 flex flex-col gap-6 max-w-sm">
          
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white leading-tight mb-2">
              Démarrez votre caisse en <span className="text-emerald-400">moins de 2 minutes.</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Le système d&apos;exploitation du commerce africain. Sans engagement, sans carte bancaire requise.
            </p>
          </div>

          <div className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.09] rounded-2xl p-6 shadow-2xl relative overflow-hidden group cursor-default hover:border-white/[0.15] transition-all duration-300">
             {/* Reflet interne */}
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.04] pointer-events-none rounded-2xl" />
             {/* Glow interne hover */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-center gap-2 mb-4">
              <span className="h-6 w-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                 <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-extrabold">
                Offre de bienvenue
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1.5">14 Jours d&apos;Essai Pro Gratuit</h3>
            <p className="text-xs text-slate-400 mb-5">
              Accès complet à toutes les fonctionnalités Premium : Caisse Tactile Offline, Gestion des Stocks Multi-Boutiques, et Rapports Financiers.
            </p>

            <div className="space-y-3">
              {[
                { icon: CheckCircle2, color: 'text-emerald-400', text: "Aucune carte bancaire requise" },
                { icon: Zap, color: 'text-primary-light', text: "Création automatique de votre magasin" },
                { icon: ShieldCheck, color: 'text-indigo-400', text: "Assistance et formation offertes" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center bg-white/[0.05] border border-white/[0.05] ${item.color}`}>
                     <item.icon className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-medium text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Footer gauche ── */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 relative z-10 border-t border-white/[0.05] pt-4">
          <span>© 2026 Wilinwi by Nexus Partners</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-500/70" />
            Données isolées et sécurisées
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          PANNEAU DROIT — Wizard d'inscription
          ═══════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-10 h-full bg-slate-50/60 overflow-hidden relative">
        
        {/* Header & Logo mobile */}
        <div className="flex items-center justify-between shrink-0 mb-6 lg:mb-0">
          <div className="lg:hidden flex items-center">
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

          {/* Indicateur de Progression */}
          <div className="ml-auto flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200/60 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Étape {step}/3
            </span>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Carte Formulaire ── */}
        <div className="w-full max-w-sm mx-auto my-auto relative">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_40px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden transition-all duration-300">
            
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              
              {/* Corps (Étapes) */}
              <div className="px-7 py-6">
                
                {error && (
                  <div className="mb-5 p-3 bg-rose-50 border border-rose-200/80 rounded-xl" role="alert">
                    <p className="text-xs font-semibold text-rose-700">{error}</p>
                  </div>
                )}

                {/* --- ÉTAPE 1 --- */}
                {step === 1 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="mb-6">
                      <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Créer votre compte 👋
                      </h1>
                      <p className="text-xs text-slate-500 mt-1.5">
                        Entrez vos coordonnées pour débuter l&apos;essai gratuit.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Nom Complet
                      </label>
                      <Input
                        type="text"
                        required
                        autoFocus
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="ex: Ismaël Abassi"
                        className="w-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" /> Téléphone
                      </label>
                      <Input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+229 97 00 00 00"
                        className="w-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="nom@entreprise.com"
                        className="w-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" /> Mot de passe
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full h-10 text-sm pr-9 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-0.5"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- ÉTAPE 2 --- */}
                {step === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="mb-6">
                      <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Votre Commerce 🏬
                      </h1>
                      <p className="text-xs text-slate-500 mt-1.5">
                        Configurez le profil de votre première boutique.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> Nom de l&apos;Enseigne
                      </label>
                      <Input
                        type="text"
                        required
                        autoFocus
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="ex: Prestige Prêt-à-Porter"
                        className="w-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-400" /> Secteur d&apos;Activité
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {sectors.map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setFormData({ ...formData, sector: sec })}
                            className={`px-2 py-2.5 text-[10px] font-bold leading-tight rounded-xl border text-left transition-all cursor-pointer ${
                              formData.sector === sec
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm shadow-emerald-500/10'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            {sec}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Ville d&apos;implantation
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="ex: Cotonou, Agblangandan..."
                        className="w-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* --- ÉTAPE 3 --- */}
                {step === 3 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="text-center mb-6">
                      <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm shadow-emerald-500/10">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Tout est prêt ! 🚀
                      </h1>
                      <p className="text-xs text-slate-500 mt-2 max-w-[260px] mx-auto">
                        Votre espace <strong className="text-slate-800 font-bold">{formData.companyName || 'Commerce'}</strong> va être initialisé.
                      </p>
                    </div>

                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 text-left space-y-2.5 text-xs">
                      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                        <span className="text-slate-500 font-medium">Promoteur</span>
                        <span className="font-bold text-slate-800">{formData.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                        <span className="text-slate-500 font-medium">Boutique</span>
                        <span className="font-bold text-slate-800">{formData.companyName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Formule</span>
                        <span className="font-extrabold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-md">14 Jours d&apos;Essai Pro</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions (Boutons) */}
              <div className="px-7 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center gap-3">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((step - 1) as 1 | 2)}
                    className="h-11 px-4 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 bg-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 h-11 text-sm font-semibold group rounded-xl transition-all duration-200 border-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(255,255,255,0.1)_inset] ${
                    step === 3 
                      ? 'bg-gradient-to-b from-[#00A86B] to-[#008f5a] shadow-[0_0_0_1px_rgba(0,168,107,0.4)] hover:from-[#00c980] hover:to-[#00A86B]' 
                      : 'bg-gradient-to-b from-[#0005ea] to-[#0004c8] shadow-[0_0_0_1px_rgba(0,5,234,0.4)] hover:from-[#2e31ff] hover:to-[#0005ea]'
                  } text-white active:scale-[0.98] cursor-pointer`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 text-xs">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création en cours…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      {step === 3 ? 'Lancer Ma Caisse' : 'Étape Suivante'}
                      {step < 3 && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />}
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Lien Login sous la carte */}
          <div className="text-center mt-6">
            <span className="text-xs text-slate-500 mr-1.5">Déjà inscrit ?</span>
            <Link
              href="/login"
              className="text-xs font-bold text-primary hover:text-primary-dark hover:underline transition-colors cursor-pointer"
            >
              Connectez-vous ici
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
