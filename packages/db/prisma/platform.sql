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
  module_addons text[],
  owner_name text,
  owner_email text
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
    t.module_addons,
    -- Propriétaire principal (OWNER) — nom + e-mail de contact pour le support.
    (SELECT u.nom::text   FROM public.users u WHERE u.tenant_id = t.id AND u.role = 'OWNER' ORDER BY u.created_at ASC LIMIT 1) AS owner_name,
    (SELECT u.email::text FROM public.users u WHERE u.tenant_id = t.id AND u.role = 'OWNER' ORDER BY u.created_at ASC LIMIT 1) AS owner_email
  FROM public.tenants t
  WHERE NOT t.internal
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
    (SELECT count(*) FROM public.tenants WHERE NOT internal),
    (SELECT count(*) FROM public.tenants WHERE NOT internal AND subscription_status = 'ACTIVE'),
    (SELECT count(*) FROM public.tenants WHERE NOT internal AND subscription_status = 'PAST_DUE'),
    (SELECT count(*) FROM public.tenants WHERE NOT internal AND created_at > now() - interval '30 days'),
    (SELECT count(*) FROM public.users u JOIN public.tenants t ON t.id = u.tenant_id
       WHERE u.actif AND NOT t.internal),
    (SELECT count(*) FROM public.etablissements e JOIN public.tenants t ON t.id = e.tenant_id
       WHERE NOT t.internal),
    (SELECT count(*) FROM public.sales s JOIN public.tenants t ON t.id = s.tenant_id
       WHERE NOT t.internal AND s.status <> 'CANCELLED' AND s.created_at > now() - interval '30 days'),
    (SELECT COALESCE(sum(s.total), 0) FROM public.sales s JOIN public.tenants t ON t.id = s.tenant_id
       WHERE NOT t.internal AND s.status <> 'CANCELLED' AND s.created_at > now() - interval '30 days'),
    (SELECT COALESCE(sum(
        CASE WHEN t.billing_cycle = 'YEARLY'
             THEN COALESCE(pc.price_yearly, 0) / 12
             ELSE COALESCE(pc.price_monthly, 0) END
      ), 0)
      FROM public.tenants t
      JOIN public.plan_configs pc ON pc.plan = t.plan
      WHERE NOT t.internal AND t.subscription_status = 'ACTIVE');
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

-- 10. Séries temporelles d'évolution (courbes) : par jour sur p_days derniers jours —
--     nouvelles entreprises, ventes (volume + GMV), + cumul d'entreprises.
CREATE OR REPLACE FUNCTION app.platform_timeseries(p_days int DEFAULT 30)
RETURNS TABLE (
  day date,
  new_tenants int,
  cumulative_tenants int,
  sales_count int,
  sales_revenue bigint
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  WITH bounds AS (
    SELECT GREATEST(1, LEAST(p_days, 365)) AS n
  ),
  days AS (
    SELECT generate_series((now()::date - (n - 1)), now()::date, interval '1 day')::date AS day
    FROM bounds
  )
  SELECT
    d.day,
    (SELECT count(*) FROM public.tenants t WHERE NOT t.internal AND t.created_at::date = d.day)::int AS new_tenants,
    (SELECT count(*) FROM public.tenants t WHERE NOT t.internal AND t.created_at::date <= d.day)::int AS cumulative_tenants,
    (SELECT count(*) FROM public.sales s JOIN public.tenants t ON t.id = s.tenant_id
       WHERE NOT t.internal AND s.status <> 'CANCELLED' AND s.created_at::date = d.day)::int AS sales_count,
    (SELECT COALESCE(sum(s.total), 0) FROM public.sales s JOIN public.tenants t ON t.id = s.tenant_id
       WHERE NOT t.internal AND s.status <> 'CANCELLED' AND s.created_at::date = d.day)::bigint AS sales_revenue
  FROM days d
  ORDER BY d.day;
$$;

-- 11. Funnel d'activation : un compte est « activé » quand il a créé ≥ 10 articles
--     ET réalisé au moins une vente non annulée. Étapes intermédiaires comptées.
CREATE OR REPLACE FUNCTION app.platform_activation_funnel()
RETURNS TABLE (
  total int,
  with_any_product int,
  with_10_products int,
  with_any_sale int,
  activated int
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  WITH per AS (
    SELECT
      t.id,
      (SELECT count(*) FROM public.products p WHERE p.tenant_id = t.id) AS pc,
      (SELECT count(*) FROM public.sales s WHERE s.tenant_id = t.id AND s.status <> 'CANCELLED') AS sc
    FROM public.tenants t
    WHERE NOT t.internal
  )
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE pc >= 1)::int,
    count(*) FILTER (WHERE pc >= 10)::int,
    count(*) FILTER (WHERE sc >= 1)::int,
    count(*) FILTER (WHERE pc >= 10 AND sc >= 1)::int
  FROM per;
$$;

-- 12. Comptes NON activés : créés mais < 10 articles ou aucune vente — pour relance.
CREATE OR REPLACE FUNCTION app.platform_inactive_tenants(p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  nom text,
  products_count int,
  sales_count int,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT t.id, t.nom::text,
    (SELECT count(*) FROM public.products p WHERE p.tenant_id = t.id)::int AS products_count,
    (SELECT count(*) FROM public.sales s WHERE s.tenant_id = t.id AND s.status <> 'CANCELLED')::int AS sales_count,
    t.created_at
  FROM public.tenants t
  WHERE NOT t.internal AND NOT (
    (SELECT count(*) FROM public.products p WHERE p.tenant_id = t.id) >= 10
    AND (SELECT count(*) FROM public.sales s WHERE s.tenant_id = t.id AND s.status <> 'CANCELLED') >= 1
  )
  ORDER BY t.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

-- 13. Hits par IP (cross-tenant) sur p_days derniers jours — la géolocalisation
--     (IP → pays/ville) est faite côté API par geoip-lite (hors-ligne, RGPD-friendly).
CREATE OR REPLACE FUNCTION app.platform_ip_hits(p_days int DEFAULT 90)
RETURNS TABLE (ip text, hits int)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT a.ip::text, count(*)::int
  FROM public.activity_logs a
  WHERE a.ip IS NOT NULL AND a.ip <> ''
    AND a.created_at > now() - make_interval(days => GREATEST(1, LEAST(p_days, 365)))
  GROUP BY a.ip
  ORDER BY count(*) DESC
  LIMIT 5000;
$$;

-- ============================================================================
-- Cockpit — Utilisateurs, Revenus, Abonnements, Géo établissements (Lot cockpit).
-- Toutes excluent les tenants `internal`.
-- ============================================================================

-- 14. Utilisateurs (cross-tenant) avec recherche + dernière connexion (PIN).
CREATE OR REPLACE FUNCTION app.platform_users(p_search text DEFAULT '', p_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid, nom text, email text, role text, actif boolean,
  tenant_id uuid, tenant_nom text, last_login timestamptz, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT
    u.id, u.nom::text, u.email::text, u.role::text, u.actif,
    u.tenant_id, t.nom::text,
    (SELECT max(a.created_at) FROM public.activity_logs a
       WHERE a.user_id = u.id AND a.action = 'PIN_LOGIN'),
    u.created_at
  FROM public.users u
  JOIN public.tenants t ON t.id = u.tenant_id
  WHERE NOT t.internal
    AND ( p_search = '' OR p_search IS NULL
          OR u.nom ILIKE '%' || p_search || '%'
          OR u.email ILIKE '%' || p_search || '%'
          OR t.nom ILIKE '%' || p_search || '%' )
  ORDER BY u.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;

-- 15. Bloquer / débloquer un utilisateur.
CREATE OR REPLACE FUNCTION app.platform_set_user_active(p_user uuid, p_active boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE public.users SET actif = p_active WHERE id = p_user $$;

-- 16. Réinitialiser le PIN (le hash bcrypt est calculé côté API).
CREATE OR REPLACE FUNCTION app.platform_set_user_pin(p_user uuid, p_hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE public.users SET pin_code = p_hash WHERE id = p_user $$;

-- 17. Historique de connexion (best-effort : événements PIN_LOGIN).
CREATE OR REPLACE FUNCTION app.platform_user_logins(p_user uuid, p_limit int DEFAULT 20)
RETURNS TABLE (id uuid, created_at timestamptz, ip text, device_label text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT a.id, a.created_at, a.ip::text, a.device_label::text
  FROM public.activity_logs a
  WHERE a.user_id = p_user AND a.action = 'PIN_LOGIN'
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

-- 18. Métriques financières : MRR/ARR/ARPU/LTV + churn (proxy snapshot = annulés/total).
CREATE OR REPLACE FUNCTION app.platform_revenue_metrics()
RETURNS TABLE (
  mrr int, arr int, active int, trialing int, cancelled int, total int,
  arpu int, churn_rate double precision, ltv int
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  WITH agg AS (
    SELECT
      COALESCE(sum(CASE WHEN t.subscription_status = 'ACTIVE' THEN
        CASE WHEN t.billing_cycle = 'YEARLY' THEN COALESCE(pc.price_yearly, 0) / 12
             ELSE COALESCE(pc.price_monthly, 0) END
      ELSE 0 END), 0)::numeric AS mrr,
      count(*) FILTER (WHERE t.subscription_status = 'ACTIVE')   AS active,
      count(*) FILTER (WHERE t.subscription_status = 'TRIALING') AS trialing,
      count(*) FILTER (WHERE t.subscription_status = 'CANCELLED') AS cancelled,
      count(*) AS total
    FROM public.tenants t
    JOIN public.plan_configs pc ON pc.plan = t.plan
    WHERE NOT t.internal
  )
  SELECT
    mrr::int,
    (mrr * 12)::int,
    active::int, trialing::int, cancelled::int, total::int,
    (CASE WHEN active > 0 THEN mrr / active ELSE 0 END)::int AS arpu,
    (CASE WHEN total > 0 THEN cancelled::float8 / total ELSE 0 END) AS churn_rate,
    (CASE
       WHEN cancelled > 0 THEN round((mrr / GREATEST(active, 1)) * total::numeric / cancelled)
       ELSE (mrr / GREATEST(active, 1)) * 24
     END)::int AS ltv
  FROM agg;
$$;

-- 19. Abonnements qui arrivent à échéance (ou déjà dépassés) sous p_days jours.
CREATE OR REPLACE FUNCTION app.platform_expiring_subscriptions(p_days int DEFAULT 14)
RETURNS TABLE (
  id uuid, nom text, plan text, subscription_status text,
  subscription_due_date timestamptz, days_left int, owner_email text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT
    t.id, t.nom::text, t.plan::text, t.subscription_status::text, t.subscription_due_date,
    (t.subscription_due_date::date - now()::date)::int AS days_left,
    (SELECT u.email::text FROM public.users u
       WHERE u.tenant_id = t.id AND u.role = 'OWNER' ORDER BY u.created_at ASC LIMIT 1) AS owner_email
  FROM public.tenants t
  WHERE NOT t.internal
    AND t.subscription_due_date IS NOT NULL
    AND t.subscription_status IN ('ACTIVE', 'TRIALING', 'PAST_DUE')
    AND t.subscription_due_date <= now() + make_interval(days => GREATEST(0, LEAST(p_days, 365)))
  ORDER BY t.subscription_due_date ASC
  LIMIT 200;
$$;

-- 20. Répartition géographique des établissements (par ville).
CREATE OR REPLACE FUNCTION app.platform_etablissements_geo()
RETURNS TABLE (ville text, count int)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(e.ville), ''), 'Non renseignée') AS ville, count(*)::int
  FROM public.etablissements e
  JOIN public.tenants t ON t.id = e.tenant_id
  WHERE NOT t.internal
  GROUP BY 1
  ORDER BY count(*) DESC;
$$;

-- 21. Suppression DÉFINITIVE d'une entreprise et de TOUTES ses données (irréversible).
--     Ordre enfants → parents (les FK par défaut sont RESTRICT, on ne dépend pas des
--     cascades). Refuse les entreprises internes. Renvoie les ids des utilisateurs
--     supprimés pour que l'API purge aussi leurs comptes Supabase Auth (best-effort).
CREATE OR REPLACE FUNCTION app.platform_delete_tenant(p_tenant uuid)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_ids uuid[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant) THEN
    RAISE EXCEPTION 'TENANT_NOT_FOUND';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant AND internal) THEN
    RAISE EXCEPTION 'TENANT_INTERNAL';
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO v_user_ids
  FROM public.users WHERE tenant_id = p_tenant;

  DELETE FROM public.price_overrides      WHERE tenant_id = p_tenant;
  DELETE FROM public.sale_installments    WHERE tenant_id = p_tenant;
  DELETE FROM public.sale_items           WHERE tenant_id = p_tenant;
  DELETE FROM public.client_payments      WHERE tenant_id = p_tenant;
  DELETE FROM public.public_receipts      WHERE tenant_id = p_tenant;
  DELETE FROM public.cash_movements       WHERE tenant_id = p_tenant;
  DELETE FROM public.cash_closes          WHERE tenant_id = p_tenant;
  DELETE FROM public.dispatch_order_items WHERE tenant_id = p_tenant;
  DELETE FROM public.dispatch_orders      WHERE tenant_id = p_tenant;
  DELETE FROM public.supplier_payments    WHERE tenant_id = p_tenant;
  DELETE FROM public.purchase_order_items WHERE tenant_id = p_tenant;
  DELETE FROM public.purchase_orders      WHERE tenant_id = p_tenant;
  DELETE FROM public.suppliers            WHERE tenant_id = p_tenant;
  DELETE FROM public.inventory_items      WHERE tenant_id = p_tenant;
  DELETE FROM public.inventories          WHERE tenant_id = p_tenant;
  DELETE FROM public.product_stock        WHERE tenant_id = p_tenant;
  DELETE FROM public.stock_movements      WHERE tenant_id = p_tenant;
  DELETE FROM public.product_variants     WHERE tenant_id = p_tenant;
  DELETE FROM public.notifications        WHERE tenant_id = p_tenant;
  DELETE FROM public.sales                WHERE tenant_id = p_tenant;
  DELETE FROM public.clients              WHERE tenant_id = p_tenant;
  DELETE FROM public.products             WHERE tenant_id = p_tenant;
  DELETE FROM public.activity_logs        WHERE tenant_id = p_tenant;
  DELETE FROM public.user_etablissements  WHERE tenant_id = p_tenant;
  DELETE FROM public.users                WHERE tenant_id = p_tenant;
  DELETE FROM public.etablissements       WHERE tenant_id = p_tenant;
  DELETE FROM public.tenants              WHERE id = p_tenant;

  RETURN v_user_ids;
END;
$$;

-- ============================================================================
-- VERROU (idempotent) — réservé au rôle admin, ré-appliqué à CHAQUE déploiement.
-- Ferme le trou : les fonctions `app.*` (qui contournent la RLS) ne sont exécutables
-- QUE par `wilinwi_admin`, jamais par le rôle applicatif public. Exception : le helper
-- RLS `app.current_tenant_id()` doit rester exécutable par tous (appelé par les policies).
-- (S'exécute seulement si les rôles existent — sur une base fraîche, admin-role.sql suit.)
-- ============================================================================
DO $lock$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wilinwi_admin') THEN
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO wilinwi_admin;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wilinwi_app') THEN
      REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM wilinwi_app;
    END IF;
    GRANT EXECUTE ON FUNCTION app.current_tenant_id() TO PUBLIC;
  END IF;
END
$lock$;
