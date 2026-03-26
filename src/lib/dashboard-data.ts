import type {
  AgentLogRecord,
  DashboardPayload,
  DailyReportRecord,
  InventoryItem,
  SettingsRecord,
  SuggestionRecord
} from "@/types/dashboard";
import { mockDashboard } from "@/lib/mock-data";
import { hasServiceRole, hasSupabaseEnv } from "@/lib/env";
import { getServiceSupabaseClient } from "@/lib/supabase";
import type { ApiUser } from "@/lib/auth";

function normalizeInventory(items: unknown): InventoryItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      item: String(item.item || "Unknown"),
      qty: Number(item.qty || item.current || 0),
      par_level: Number(item.par_level || item.par || 0),
      status: (item.status as InventoryItem["status"]) || "warning"
    }));
}

function fallbackSettings(): SettingsRecord {
  return mockDashboard.settings;
}

function emptyReport(): DailyReportRecord {
  return {
    report_date: new Date().toISOString().slice(0, 10),
    sales_total: 0,
    num_transactions: 0,
    top_items: [],
    reviews_new: 0,
    reviews_sentiment: "mixed",
    inventory_status: [],
    labor_forecast: [],
    food_cost_pct: 0,
    notes: "Waiting for the next agent report."
  };
}

function buildConnectedFallback(user: ApiUser): DashboardPayload {
  const report = emptyReport();

  return {
    agent_status: "offline",
    last_update: new Date().toISOString(),
    today: {
      revenue: 0,
      transactions: 0,
      reviews_new: 0,
      inventory_alerts: 0,
      suggestions_pending: 0
    },
    report,
    inventory_alerts: [],
    suggestions: [],
    logs: [],
    settings: fallbackSettings(),
    profile: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    },
    demo_mode: false
  };
}

export async function getDashboardData(user: ApiUser): Promise<DashboardPayload> {
  if (!hasSupabaseEnv()) {
    return {
      ...mockDashboard,
      profile: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      },
      demo_mode: true
    };
  }

  if (!hasServiceRole()) {
    return buildConnectedFallback(user);
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return buildConnectedFallback(user);
  }

  const today = new Date().toISOString().slice(0, 10);

  const [reportResult, suggestionsResult, logsResult, settingsResult] =
    await Promise.all([
      supabase
        .from("daily_reports")
        .select("*")
        .eq("report_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("suggestions")
        .select("*")
        .eq("approved", false)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("agent_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(12),
      supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
    ]);

  const report = reportResult.data
    ? ({
        ...reportResult.data,
        top_items: Array.isArray(reportResult.data.top_items)
          ? reportResult.data.top_items
          : [],
        inventory_status: normalizeInventory(reportResult.data.inventory_status),
        labor_forecast: Array.isArray(reportResult.data.labor_forecast)
          ? reportResult.data.labor_forecast
          : []
      } as DailyReportRecord)
    : emptyReport();

  const suggestions = suggestionsResult.error
    ? []
    : ((suggestionsResult.data || []) as SuggestionRecord[]);
  const logs = logsResult.error ? [] : ((logsResult.data || []) as AgentLogRecord[]);
  const settings = settingsResult.data
    ? ({
        daily_report_time: settingsResult.data.daily_report_time,
        low_inventory_threshold: settingsResult.data.low_inventory_threshold,
        review_response_target: settingsResult.data.review_response_target,
        enabled_alerts: Array.isArray(settingsResult.data.enabled_alerts)
          ? settingsResult.data.enabled_alerts
          : []
      } as SettingsRecord)
    : fallbackSettings();

  const inventoryAlerts = report.inventory_status.filter(
    (item) => item.status !== "good"
  );

  const lastUpdate = logs[0]?.timestamp || report.created_at || new Date().toISOString();

  return {
    agent_status: logs.length > 0 ? "online" : "offline",
    last_update: lastUpdate,
    today: {
      revenue: report.sales_total,
      transactions: report.num_transactions,
      reviews_new: report.reviews_new,
      inventory_alerts: inventoryAlerts.length,
      suggestions_pending: suggestions.length
    },
    report,
    inventory_alerts: inventoryAlerts,
    suggestions,
    logs,
    settings,
    profile: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    },
    demo_mode: false
  };
}
