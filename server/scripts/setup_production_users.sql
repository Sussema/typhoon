-- server/scripts/setup_production_users.sql
-- Chapter 20.4: Database in Production (Least-Privilege User Partitioning)
-- Two-user model: circularlink_owner for migrations; circularlink_app for runtime API

-- 1. Schema Owner User (for running npm run migrate)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'circularlink_owner') THEN
    CREATE USER circularlink_owner WITH ENCRYPTED PASSWORD 'CHANGE_IN_PRODUCTION_OWNER_PW';
  END IF;
END $$;

-- 2. Runtime Application User (runs the Node.js API with zero UPDATE/DELETE rights on ledgers)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'circularlink_app') THEN
    CREATE USER circularlink_app WITH ENCRYPTED PASSWORD 'CHANGE_IN_PRODUCTION_APP_PW';
  END IF;
END $$;

-- Database access
GRANT CONNECT ON DATABASE circularlink TO circularlink_app;
GRANT USAGE ON SCHEMA public TO circularlink_app;

-- Append-only permissions: SELECT and INSERT only
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO circularlink_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO circularlink_app;

-- Strict defense-in-depth: Revoke UPDATE and DELETE from all ledger tables
REVOKE UPDATE, DELETE ON transactions FROM circularlink_app;
REVOKE UPDATE, DELETE ON batches FROM circularlink_app;
REVOKE UPDATE, DELETE ON batch_inputs FROM circularlink_app;
REVOKE UPDATE, DELETE ON shipments FROM circularlink_app;
REVOKE UPDATE, DELETE ON shipment_receipts FROM circularlink_app;
REVOKE UPDATE, DELETE ON pickups FROM circularlink_app;
REVOKE UPDATE, DELETE ON reward_ledger FROM circularlink_app;
REVOKE UPDATE, DELETE ON audit_log FROM circularlink_app;
REVOKE UPDATE, DELETE ON machine_events FROM circularlink_app;

-- Only people_private allows DELETE for lawful DPDP Act erasure rights
GRANT DELETE ON people_private TO circularlink_app;
-- Sessions allows DELETE for logout and session revocation
GRANT DELETE ON sessions TO circularlink_app;

-- Ensure default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO circularlink_app;
