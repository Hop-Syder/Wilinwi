-- ============================================================================
-- Wilinwi — Configuration des plans (Lot 2.3) : tarifs & limites pilotables.
-- À exécuter APRÈS `prisma db push` (table `plan_configs`). Idempotent.
--
-- Table de RÉFÉRENCE globale (non multi-tenant) :
--   • Lecture ouverte (politique SELECT permissive) — c'est de l'info tarifaire publique.
--   • Écriture INTERDITE au rôle applicatif (aucune policy d'écriture) → seule la fonction
--     `app.platform_set_plan_config` (SECURITY DEFINER, propriétaire BYPASSRLS) peut écrire,
--     gardée au niveau API par PlatformAdminGuard. Ferme aussi le trou d'écriture PostgREST.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app;

-- RLS : lecture pour tous, écriture via fonction privilégiée uniquement.
-- FORCE est requis car la table est créée (par `prisma db push`) par le rôle applicatif
-- lui-même : sans FORCE, le propriétaire contournerait la RLS et pourrait écrire.
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_configs_read_all ON public.plan_configs;
CREATE POLICY plan_configs_read_all ON public.plan_configs FOR SELECT USING (true);

-- Setter super-admin (prix `null` = « sur devis » ; limite `-1` = illimité).
CREATE OR REPLACE FUNCTION app.platform_set_plan_config(
  p_plan text,
  p_label text,
  p_price_monthly int,
  p_price_yearly int,
  p_max_users int,
  p_max_etablissements int,
  p_max_devices int,
  p_max_photos int
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.plan_configs SET
    label              = p_label,
    price_monthly      = p_price_monthly,
    price_yearly       = p_price_yearly,
    max_users          = p_max_users,
    max_etablissements = p_max_etablissements,
    max_devices        = p_max_devices,
    max_photos         = p_max_photos,
    updated_at         = now()
  WHERE plan = p_plan::"Plan";
$$;

-- Valeurs par défaut = code actuel (PLAN_LIMITS) + tarifs réels du nouveau business plan (dès 10 000 F/mois).
-- ON CONFLICT DO UPDATE : synchronise automatiquement la table avec la grille tarifaire officielle.
INSERT INTO public.plan_configs
  (plan, label, price_monthly, price_yearly, max_users, max_etablissements, max_devices, max_photos, updated_at)
VALUES
  ('STARTER',    'Starter (Boutique Solo)',          10000, 100000,  1,  1,  1,  1,  now()),
  ('PRO',        'Professionnel (Croissance)',       25000, 250000,  5,  2,  3,  5,  now()),
  ('BUSINESS',   'Business (Réseau & Entrepôt)',     50000, 500000, 15, -1, 10, -1,  now()),
  ('ENTERPRISE', 'Entreprise (Sur-mesure & Réseau)', NULL,  NULL,   -1, -1, -1, -1,  now())
ON CONFLICT (plan) DO UPDATE SET
  label              = EXCLUDED.label,
  price_monthly      = EXCLUDED.price_monthly,
  price_yearly       = EXCLUDED.price_yearly,
  max_users          = EXCLUDED.max_users,
  max_etablissements = EXCLUDED.max_etablissements,
  max_devices        = EXCLUDED.max_devices,
  max_photos         = EXCLUDED.max_photos,
  updated_at         = now();

