-- Audit log table for tracking all data mutations
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL, -- 'create', 'update', 'delete'
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_table_name ON audit_log (table_name);
CREATE INDEX idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX idx_audit_log_record_id ON audit_log (record_id);
