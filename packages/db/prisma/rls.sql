-- ============================================================================
-- Wilinwi — Row-Level Security (l'ADN)
-- À exécuter APRÈS `prisma migrate deploy`. Idempotent.
--
-- Principe : chaque requête applicative ouvre une transaction et fait
--   SET LOCAL app.current_tenant_id = '<uuid>';
-- Les policies n'autorisent que les lignes du tenant courant.
-- FORCE ROW LEVEL SECURITY garantit que même le propriétaire de la table
-- (rôle de connexion Prisma) est soumis aux policies — défense réelle.
-- ============================================================================

-- Schéma applicatif pour les helpers
CREATE SCHEMA IF NOT EXISTS app;

-- Tenant courant lu depuis la variable de session (NULL si non défini).
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;

-- Active RLS + policy tenant-scopée sur une table donnée.
CREATE OR REPLACE FUNCTION app.enable_tenant_rls(target regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  tbl text := target::text;
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);

  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %s
       USING (tenant_id = app.current_tenant_id())
       WITH CHECK (tenant_id = app.current_tenant_id())',
    tbl
  );
END;
$$;

-- Applique la policy à toutes les tables multi-tenant.
SELECT app.enable_tenant_rls('public.users');
SELECT app.enable_tenant_rls('public.products');
SELECT app.enable_tenant_rls('public.product_variants');
SELECT app.enable_tenant_rls('public.stock_movements');
SELECT app.enable_tenant_rls('public.inventories');
SELECT app.enable_tenant_rls('public.inventory_items');
SELECT app.enable_tenant_rls('public.sales');
SELECT app.enable_tenant_rls('public.sale_items');
SELECT app.enable_tenant_rls('public.sale_installments');
SELECT app.enable_tenant_rls('public.clients');
SELECT app.enable_tenant_rls('public.client_payments');
SELECT app.enable_tenant_rls('public.cash_movements');
SELECT app.enable_tenant_rls('public.cash_closes');
SELECT app.enable_tenant_rls('public.activity_logs');
SELECT app.enable_tenant_rls('public.etablissements');
SELECT app.enable_tenant_rls('public.user_etablissements');
SELECT app.enable_tenant_rls('public.suppliers');
SELECT app.enable_tenant_rls('public.purchase_orders');
SELECT app.enable_tenant_rls('public.purchase_order_items');
SELECT app.enable_tenant_rls('public.supplier_payments');
SELECT app.enable_tenant_rls('public.product_stock');
SELECT app.enable_tenant_rls('public.dispatch_orders');
SELECT app.enable_tenant_rls('public.dispatch_order_items');
SELECT app.enable_tenant_rls('public.notifications');
SELECT app.enable_tenant_rls('public.audit_alerts');
SELECT app.enable_tenant_rls('public.product_recipes');
SELECT app.enable_tenant_rls('public.recipe_items');
SELECT app.enable_tenant_rls('public.food_tables');
SELECT app.enable_tenant_rls('public.product_batches');
SELECT app.enable_tenant_rls('public.product_units');
SELECT app.enable_tenant_rls('public.product_exclusions');
SELECT app.enable_tenant_rls('public.devices');

-- Unicité du solde par emplacement : 1 ligne par (établissement, produit) au niveau
-- produit, et 1 par (établissement, variante) au niveau variante (index partiels,
-- car une contrainte unique standard traite les NULL comme distincts).
CREATE UNIQUE INDEX IF NOT EXISTS product_stock_prod_etab_uq
  ON public.product_stock (etablissement_id, product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_stock_var_etab_uq
  ON public.product_stock (etablissement_id, variant_id) WHERE variant_id IS NOT NULL;

-- La table `tenants` n'a pas de tenant_id : on la restreint à la ligne courante.
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self ON public.tenants;
CREATE POLICY tenant_self ON public.tenants
  USING (id = app.current_tenant_id())
  WITH CHECK (id = app.current_tenant_id());
