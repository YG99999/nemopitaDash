import type { NextApiRequest } from "next";

import { getServiceSupabaseClient } from "@/lib/supabase";

export async function writeAuditLog(
  req: NextApiRequest,
  action: string,
  performedBy: string,
  details: Record<string, unknown> = {}
) {
  const supabase = getServiceSupabaseClient();
  if (!supabase) return;

  const ipHeader = req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(ipHeader)
    ? ipHeader[0]
    : ipHeader?.split(",")[0]?.trim() || null;

  await supabase.from("audit_trail").insert({
    action,
    performed_by: performedBy,
    ip_address: ipAddress,
    details
  });
}
