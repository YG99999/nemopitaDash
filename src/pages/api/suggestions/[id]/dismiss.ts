import type { NextApiRequest, NextApiResponse } from "next";

import { writeAuditLog } from "@/lib/audit";
import { requireApiUser, requireOwner } from "@/lib/auth";
import { hasServiceRole } from "@/lib/env";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { suggestionActionSchema } from "@/lib/validators";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireApiUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!requireOwner(user)) {
    return res.status(403).json({ error: "Only owners can dismiss suggestions" });
  }

  const parsed = suggestionActionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (!hasServiceRole()) {
    return res.status(200).json({ status: "dismissed", demo: true });
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured" });
  }

  const { error } = await supabase
    .from("suggestions")
    .update({
      dismissed: true,
      dismissed_at: new Date().toISOString(),
      dismissed_by: user.email
    })
    .eq("id", req.query.id)
    .eq("approved", false);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await writeAuditLog(req, "suggestion.dismissed", user.email, {
    suggestion_id: req.query.id,
    notes: parsed.data.notes
  });

  return res.status(200).json({ status: "dismissed" });
}
