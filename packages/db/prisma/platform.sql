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

-- 1. Liste globale et synthèse des tenants (entreprises)
CREATE OR REPLACE FUNCTION app.platform_tenants_overview()
RETURNS TABLE(
  id uuid,
  nom text,
  plan text,
  subscription_status text,
  created_at timestamptz,
  active_users_count bigint,
  etablissements_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.id,
    t.nom::text,
    t.plan::text,
    t.subscription_status::text,
    t.created_at,
    (SELECT COUNT(*)::bigint FROM public.users u WHERE u.tenant_id = t.id AND u.actif = true) AS active_users_count,
    (SELECT COUNT(*)::bigint FROM public.etablissements e WHERE e.tenant_id = t.id) AS etablissements_count
  FROM public.tenants t
  ORDER BY t.created_at DESC;
$$;

-- 2. Liste des établissements d'un tenant spécifique
CREATE OR REPLACE FUNCTION app.platform_tenant_etablissements(p_tenant_id uuid)
RETURNS TABLE(
  id uuid,
  nom text,
  type text,
  actif boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    e.id,
    e.nom::text,
    e.type::text,
    e.actif,
    e.created_at
  FROM public.etablissements e
  WHERE e.tenant_id = p_tenant_id
  ORDER BY e.created_at ASC;
$$;
