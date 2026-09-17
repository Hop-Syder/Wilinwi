-- ============================================================================
-- Rôle ADMIN Wilinwi — verrou base de la console super-admin (séparation Lot A).
-- À exécuter UNE fois, en tant que `postgres` (DIRECT_URL), après platform.sql.
--
--   prisma db execute --url "$DIRECT_URL" --file admin-role.sql
--
-- Principe : les fonctions cross-tenant `app.*` (qui CONTOURNENT la RLS) ne sont
-- exécutables QUE par ce rôle. Le rôle applicatif public `wilinwi_app` en est privé
-- → même une API publique compromise ne peut pas déclencher d'opération cross-tenant.
-- ============================================================================

DROP ROLE IF EXISTS wilinwi_admin;
CREATE ROLE wilinwi_admin LOGIN PASSWORD 'QDrbS4s81i2RJIU6' NOBYPASSRLS;

GRANT USAGE ON SCHEMA app TO wilinwi_admin;
GRANT USAGE ON SCHEMA public TO wilinwi_admin;

-- ── Verrou : fonctions `app.*` réservées au rôle admin ──────────────────────
-- Futures fonctions (créées par postgres lors des migrations) : verrouillées d'office.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO wilinwi_admin;

-- Fonctions existantes : on retire le droit d'exécution à tout le monde sauf l'admin.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM wilinwi_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO wilinwi_admin;

-- EXCEPTION : `app.current_tenant_id()` est le helper appelé par les POLICIES RLS
-- à CHAQUE requête tenant → il DOIT rester exécutable par le rôle applicatif.
-- (Si vous ajoutez un autre helper opérationnel non-admin, re-grantez-le ici.)
GRANT EXECUTE ON FUNCTION app.current_tenant_id() TO PUBLIC;
