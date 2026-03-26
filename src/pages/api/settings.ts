import type { NextApiRequest, NextApiResponse } from "next";

import { writeAuditLog } from "@/lib/audit";
import { requireApiUser, requireOwner } from "@/lib/auth";
import { hasServiceRole } from "@/lib/env";
import { mockDashboard } from "@/lib/mock-data";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { settingsSchema } from "@/lib/validators";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireApiUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    if (!hasServiceRole()) {
      return res.status(200).json(mockDashboard.settings);
    }

    const supabase = getServiceSupabaseClient();
    if (!supabase) {
      return res.status(200).json(mockDashboard.settings);
    }

    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      return res.status(200).json(mockDashboard.settings);
    }

    return res.status(200).json({
      daily_report_time: data.daily_report_time,
      low_inventory_threshold: data.low_inventory_threshold,
      review_response_target: data.review_response_target,
      enabled_alerts: data.enabled_alerts
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireOwner(user)) {
    return res.status(403).json({ error: "Only owners can update settings" });
  }

  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (!hasServiceRole()) {
    return res.status(200).json(parsed.data);
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured" });
  }

  const { data, error } = await supabase
    .from("settings")
    .upsert({
      user_id: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await writeAuditLog(req, "settings.updated", user.email, parsed.data);

  return res.status(200).json({
    daily_report_time: data.daily_report_time,
    low_inventory_threshold: data.low_inventory_threshold,
    review_response_target: data.review_response_target,
    enabled_alerts: data.enabled_alerts
  });
}
