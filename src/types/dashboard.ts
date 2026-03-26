export type UserRole = "owner" | "manager";

export type InventoryItem = {
  item: string;
  qty: number;
  par_level: number;
  status: "good" | "warning" | "low";
};

export type TopItem = {
  name: string;
  qty: number;
  revenue: number;
};

export type LaborForecastItem = {
  time_slot: string;
  suggested_staff: number;
  actual_staff: number;
};

export type SuggestionRecord = {
  id: string;
  suggestion_type: string;
  content: string;
  data: Record<string, unknown>;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  dismissed: boolean;
  dismissed_at?: string | null;
  dismissed_by?: string | null;
  executed: boolean;
  executed_at?: string | null;
  created_at: string;
};

export type AgentLogRecord = {
  id: string;
  timestamp: string;
  action_type: string;
  status: string;
  data: Record<string, unknown>;
  error_message?: string | null;
};

export type DailyReportRecord = {
  id?: string;
  report_date: string;
  sales_total: number;
  num_transactions: number;
  top_items: TopItem[];
  reviews_new: number;
  reviews_sentiment: string;
  inventory_status: InventoryItem[];
  labor_forecast: LaborForecastItem[];
  food_cost_pct: number;
  notes: string;
  created_at?: string;
};

export type SettingsRecord = {
  daily_report_time: string;
  low_inventory_threshold: number;
  review_response_target: number;
  enabled_alerts: string[];
};

export type DashboardSummary = {
  revenue: number;
  transactions: number;
  reviews_new: number;
  inventory_alerts: number;
  suggestions_pending: number;
};

export type DashboardPayload = {
  agent_status: "online" | "offline" | "demo";
  last_update: string;
  today: DashboardSummary;
  report: DailyReportRecord;
  inventory_alerts: InventoryItem[];
  suggestions: SuggestionRecord[];
  logs: AgentLogRecord[];
  settings: SettingsRecord;
  profile: {
    id: string;
    email: string;
    role: UserRole;
    full_name?: string | null;
  };
  demo_mode: boolean;
};
