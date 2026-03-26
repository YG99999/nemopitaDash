import { z } from "zod";

export const suggestionActionSchema = z.object({
  notes: z.string().max(500).optional().default("")
});

export const settingsSchema = z.object({
  daily_report_time: z.string().regex(/^\d{2}:\d{2}$/),
  low_inventory_threshold: z.number().int().min(1).max(100),
  review_response_target: z.number().int().min(1).max(24),
  enabled_alerts: z.array(z.string()).min(1)
});

export const webhookSchema = z.object({
  event_type: z.enum(["daily_report", "log", "suggestion", "alert"]),
  timestamp: z.string(),
  data: z.record(z.string(), z.unknown())
});
