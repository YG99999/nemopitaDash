import type { NextApiRequest, NextApiResponse } from "next";

import { hasServiceRole } from "@/lib/env";
import { getServiceSupabaseClient } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token || token !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!hasServiceRole()) {
    return res.status(200).json({ status: "executed", demo: true });
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured" });
  }

  const { error } = await supabase
    .from("suggestions")
    .update({
      executed: true,
      executed_at: new Date().toISOString()
    })
    .eq("id", req.query.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ status: "executed", suggestion_id: req.query.id });
}
