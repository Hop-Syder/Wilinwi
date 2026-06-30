-- ============================================================================
-- Wilinwi — Fonctions Plateforme Super-admin (SECURITY DEFINER)
-- À exécuter APRÈS `prisma migrate deploy`. Idempotent.
--
-- Ces fonctions s'exécutent avec les privilèges du créateur (le rôle propriétaire
-- de la base, typiquement postgres) afin de bypasser la RLS et de lister/détailler
-- les locataires de manière cross-tenant de façon ultra-sécurisée.
-- Le schéma 'app' n'est pas exposé par PostgREST pour empêcher tout appel direct.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app;

-- 1. Liste globale et synthèse des tenants (entreprises) — inclut la facturation.
-- DROP car la signature (colonnes retournées) évolue : CREATE OR REPLACE ne le permet pas.
DROP FUNCTION IF EXISTS app.platform_tenants_overview();
CREATE OR REPLACE FUNCTION app.platform_tenants_overview()
RETURNS TABLE(
  id uuid,
  nom text,
  plan text,
  subscription_status text,
  created_at timestamptz,
  active_users_count bigint,
  etablissements_count bigint,
  subscription_due_date timestamptz,
  billing_cycle text,
  module_addons text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    t.id,
    t.nom::text,
    t.plan::text,
    t.subscription_status::text,
    t.created_at,
    (SELECT COUNT(*)::bigint FROM public.users u WHERE u.tenant_id = t.id AND u.actif = true) AS active_users_count,
    (SELECT COUNT(*)::bigint FROM public.etablissements e WHERE e.tenant_id = t.id) AS etablissements_count,
    t.subscription_due_date,
    t.billing_cycle::text,
    t.module_addons
  FROM public.tenants t
  ORDER BY t.created_at DESC;
$$;

-- 2. Liste des établissements d'un tenant spécifique
CREATE OR REPLACE FUNCTION app.platform_tenant_etablissements(p_tenant uuid)
RETURNS TABLE(
  id uuid,
  nom text,
  type text,
  actif boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.nom::text,
    e.type::text,
    e.actif,
    e.created_at
  FROM public.etablissements e
  WHERE e.tenant_id = p_tenant
  ORDER BY e.created_at ASC;
$$;

-- ============================================================================
-- Facturation (Lot 2.2) — cœur indépendant du prestataire de paiement.
-- Échéance d'abonnement + cycle, détection automatique des impayés, et
-- enregistrement manuel d'un règlement par le super-admin. L'intégration d'une
-- passerelle (FedaPay/Wave/CB) viendra brancher `billing_record_payment` sur un
-- webhook ; le serveur reste la source de vérité de l'échéance.
-- ============================================================================

-- 3. Enregistrer un règlement : régularise l'abonnement et reporte l'échéance d'un cycle.
--    Base de report = max(échéance courante, maintenant) → pas de perte de temps si payé en avance,
--    et repart de la date de paiement si l'échéance était dépassée.
CREATE OR REPLACE FUNCTION app.billing_record_payment(p_tenant uuid)
RETURNS TABLE (subscription_status text, subscription_due_date timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cycle text; v_base timestamptz; v_next timestamptz;
BEGIN
  SELECT t.billing_cycle::text, GREATEST(COALESCE(t.subscription_due_date, now()), now())
    INTO v_cycle, v_base
  FROM public.tenants t WHERE t.id = p_tenant;
  IF v_cycle IS NULL THEN RAISE EXCEPTION 'Entreprise introuvable'; END IF;
  v_next := v_base + (CASE WHEN v_cycle = 'YEARLY' THEN interval '1 year' ELSE interval '1 month' END);
  UPDATE public.tenants
     SET subscription_status = 'ACTIVE', past_due_since = NULL, subscription_due_date = v_next
   WHERE id = p_tenant;
  RETURN QUERY SELECT 'ACTIVE'::text, v_next;
END;
$$;

-- 4. Détecter les impayés : ACTIVE/TRIALING dont l'échéance est dépassée → PAST_DUE.
--    Renvoie le nombre d'entreprises marquées. À appeler périodiquement (cron) ou à la demande.
CREATE OR REPLACE FUNCTION app.billing_run_overdue()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.tenants
     SET subscription_status = 'PAST_DUE', past_due_since = subscription_due_date
   WHERE subscription_status IN ('ACTIVE','TRIALING')
     AND subscription_due_date IS NOT NULL
     AND subscription_due_date < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. Changer le plan d'une entreprise (super-admin).
CREATE OR REPLACE FUNCTION app.billing_set_plan(p_tenant uuid, p_plan text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE public.tenants SET plan = p_plan::"Plan" WHERE id = p_tenant $$;

-- 6. Changer le statut d'abonnement (suspendre / réactiver / annuler).
CREATE OR REPLACE FUNCTION app.billing_set_status(p_tenant uuid, p_status text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.tenants
     SET subscription_status = p_status::"SubscriptionStatus",
         past_due_since = CASE WHEN p_status = 'PAST_DUE' THEN COALESCE(past_due_since, now()) ELSE NULL END
   WHERE id = p_tenant
$$;

-- 7. Modules premium « à la carte » d'une entreprise (Lot 2.4) — remplace l'ensemble courant.
CREATE OR REPLACE FUNCTION app.platform_set_tenant_modules(p_tenant uuid, p_modules text[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE public.tenants SET module_addons = COALESCE(p_modules, '{}') WHERE id = p_tenant $$;

-- ============================================================================
-- Audit & métriques plateforme (Lot 2.5) — agrégats cross-tenant, lecture seule.
-- ============================================================================

-- 8. KPIs agrégés de la plateforme. MRR = somme du prix mensuel-équivalent des
--    entreprises ACTIVE (annuel → /12 ; prix null « sur devis » → 0). GMV 30 j =
--    total des ventes non annulées sur les 30 derniers jours.
CREATE OR REPLACE FUNCTION app.platform_metrics()
RETURNS TABLE (
  tenants_total bigint,
  tenants_active bigint,
  tenants_past_due bigint,
  new_tenants_30d bigint,
  users_active bigint,
  etablissements_total bigint,
  sales_30d_count bigint,
  sales_30d_revenue bigint,
  mrr bigint
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.tenants),
    (SELECT count(*) FROM public.tenants WHERE subscription_status = 'ACTIVE'),
    (SELECT count(*) FROM public.tenants WHERE subscription_status = 'PAST_DUE'),
    (SELECT count(*) FROM public.tenants WHERE created_at > now() - interval '30 days'),
    (SELECT count(*) FROM public.users WHERE actif),
    (SELECT count(*) FROM public.etablissements),
    (SELECT count(*) FROM public.sales
       WHERE status <> 'CANCELLED' AND created_at > now() - interval '30 days'),
    (SELECT COALESCE(sum(total), 0) FROM public.sales
       WHERE status <> 'CANCELLED' AND created_at > now() - interval '30 days'),
    (SELECT COALESCE(sum(
        CASE WHEN t.billing_cycle = 'YEARLY'
             THEN COALESCE(pc.price_yearly, 0) / 12
             ELSE COALESCE(pc.price_monthly, 0) END
      ), 0)
      FROM public.tenants t
      JOIN public.plan_configs pc ON pc.plan = t.plan
      WHERE t.subscription_status = 'ACTIVE');
$$;

-- 9. Flux d'audit cross-tenant : dernières actions, tout locataire confondu.
CREATE OR REPLACE FUNCTION app.platform_recent_activity(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  tenant_nom text,
  user_nom text,
  action text,
  entity text,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT a.id, a.tenant_id, t.nom::text, u.nom::text,
         a.action::text, a.entity::text, a.created_at
  FROM public.activity_logs a
  JOIN public.tenants t ON t.id = a.tenant_id
  LEFT JOIN public.users u ON u.id = a.user_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;
