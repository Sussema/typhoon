CREATE TABLE audit_log (
  seq bigserial PRIMARY KEY,
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  body text NOT NULL, -- the exact text that was hashed
  prev_hash text NOT NULL,
  hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER no_change_audit BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION forbid_change();
