import crypto from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { hasServiceRole } from "@/lib/env";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { webhookSchema } from "@/lib/validators";

function normalizeInventoryObject(
  inventory: Record<string, unknown> | undefined
): Array<Record<string, unknown>> {
  if (!inventory) return [];

  return Object.entries(inventory).map(([item, details]) => {
    const value = (details || {}) as Record<string, unknown>;
    return {
      item,
      qty: Number(value.current || value.qty || 0),
      par_level: Number(value.par || value.par_level || 0),
      status: String(value.status || "warning")
    };
  });
}

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

  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const signature = req.headers["x-agent-signature"];
  if (signature && process.env.WEBHOOK_SECRET) {
    const expected = crypto
      .createHmac("sha256", process.env.WEBHOOK_SECRET)
      .update(JSON.stringify(parsed.data))
      .digest("hex");

    if (signature !== expected) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  if (!hasServiceRole()) {
    return res.status(200).json({
      status: "received",
      id: "demo-webhook",
      processed_at: new Date().toISOString()
    });
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured" });
  }

  const payload = parsed.data;
  const webhookId = crypto.randomUUID();

  const { data: logRows, error: logError } = await supabase
    .from("agent_logs")
    .insert({
      action_type: payload.event_type,
      status: "success",
      data: payload.data,
      timestamp: payload.timestamp,
      webhook_id: webhookId,
      webhook_acknowledged: true
    })
    .select();

  if (logError) {
    return res.status(500).json({ error: logError.message });
  }

  if (payload.event_type === "daily_report") {
    const reportDate = new Date(payload.timestamp).toISOString().slice(0, 10);
    const data = payload.data;
    const inventory = normalizeInventoryObject(
      (data.inventory as Record<string, unknown>) || undefined
    );
    const topItems = Array.isArray(data.top_items)
      ? data.top_items.map((item) =>
          typeof item === "string"
            ? { name: item, qty: 0, revenue: 0 }
            : item
        )
      : [];

    await supabase.from("daily_reports").upsert({
      report_date: reportDate,
      sales_total: Number(data.revenue || 0),
      num_transactions: Number(data.transactions || 0),
      top_items: topItems,
      reviews_new: Number(data.reviews_new || 0),
      reviews_sentiment: String(data.reviews_sentiment || "mixed"),
      inventory_status: inventory,
      labor_forecast: Array.isArray(data.labor_forecast) ? data.labor_forecast : [],
      food_cost_pct: Number(data.food_cost_pct || 0),
      notes: String(data.notes || "")
    });
  }

  const suggestions = Array.isArray(payload.data.suggestions)
    ? payload.data.suggestions
    : [];

  if (suggestions.length > 0) {
    await supabase.from("suggestions").insert(
      suggestions.map((suggestion) => {
        const entry = suggestion as Record<string, unknown>;
        return {
          suggestion_type: String(entry.type || "suggestion"),
          content: String(entry.content || "Agent recommendation"),
          data: entry
        };
      })
    );
  }

  return res.status(200).json({
    status: "received",
    id: logRows?.[0]?.id || webhookId,
    processed_at: new Date().toISOString()
  });
}
