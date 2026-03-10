import { createServerClient } from "@/lib/supabase/server";

// Fields that should never appear in audit logs
const SENSITIVE_FIELDS = ["password", "password_hash", "secret", "token", "api_key"];

function sanitize(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!data) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

interface AuditParams {
  user_id?: string | null;
  action: "create" | "update" | "delete";
  table_name: string;
  record_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
}

/**
 * Log an audit entry. Fire-and-forget -- never blocks the main request flow.
 */
export function logAudit(params: AuditParams): void {
  const supabase = createServerClient();

  supabase
    .from("audit_log")
    .insert({
      user_id: params.user_id ?? null,
      action: params.action,
      table_name: params.table_name,
      record_id: params.record_id ?? null,
      old_data: sanitize(params.old_data),
      new_data: sanitize(params.new_data),
      ip_address: params.ip_address ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("Audit log insert failed:", error);
      }
    });
}
