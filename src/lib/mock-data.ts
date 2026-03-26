import type { DashboardPayload } from "@/types/dashboard";

export const mockDashboard: DashboardPayload = {
  agent_status: "demo",
  last_update: new Date().toISOString(),
  today: {
    revenue: 1843.5,
    transactions: 96,
    reviews_new: 4,
    inventory_alerts: 2,
    suggestions_pending: 2
  },
  report: {
    report_date: new Date().toISOString().slice(0, 10),
    sales_total: 1843.5,
    num_transactions: 96,
    top_items: [
      { name: "Chicken Shawarma", qty: 34, revenue: 476 },
      { name: "Hummus Plate", qty: 28, revenue: 252 },
      { name: "Falafel Wrap", qty: 17, revenue: 187 }
    ],
    reviews_new: 4,
    reviews_sentiment: "positive",
    inventory_status: [
      { item: "Hummus", qty: 15, par_level: 100, status: "low" },
      { item: "Chicken", qty: 42, par_level: 120, status: "warning" },
      { item: "Tahini", qty: 70, par_level: 80, status: "good" }
    ],
    labor_forecast: [
      { time_slot: "12-2 PM", suggested_staff: 4, actual_staff: 3 },
      { time_slot: "6-8 PM", suggested_staff: 5, actual_staff: 4 }
    ],
    food_cost_pct: 28.5,
    notes:
      "Lunch held steady and dinner volume is trending above normal for this point in the week."
  },
  inventory_alerts: [
    { item: "Hummus", qty: 15, par_level: 100, status: "low" },
    { item: "Chicken", qty: 42, par_level: 120, status: "warning" }
  ],
  suggestions: [
    {
      id: "demo-staffing",
      suggestion_type: "staffing",
      content: "Schedule 1 additional staff Friday 6-8 PM.",
      data: {
        confidence: 0.92,
        reason: "Historical dinner spike",
        time_slot: "Friday 6-8 PM"
      },
      approved: false,
      approved_at: null,
      approved_by: null,
      dismissed: false,
      executed: false,
      created_at: new Date(Date.now() - 25 * 60000).toISOString()
    },
    {
      id: "demo-reorder",
      suggestion_type: "reorder",
      content: "Reorder hummus and chicken before tomorrow lunch prep.",
      data: {
        confidence: 0.88,
        items: ["Hummus", "Chicken"],
        reason: "Projected depletion before next delivery window"
      },
      approved: false,
      approved_at: null,
      approved_by: null,
      dismissed: false,
      executed: false,
      created_at: new Date(Date.now() - 55 * 60000).toISOString()
    }
  ],
  logs: [
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      action_type: "inventory_alert",
      status: "success",
      data: { message: "Hummus dropped below par level." }
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      action_type: "review_scan",
      status: "success",
      data: { message: "4 new reviews detected across Google and Yelp." }
    },
    {
      id: "log-3",
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      action_type: "daily_report",
      status: "success",
      data: { message: "Daily summary published to dashboard." }
    }
  ],
  settings: {
    daily_report_time: "23:45",
    low_inventory_threshold: 20,
    review_response_target: 2,
    enabled_alerts: ["inventory", "reviews", "sales", "labor"]
  },
  profile: {
    id: "demo-owner",
    email: "demo@pita22.com",
    role: "owner",
    full_name: "Demo Owner"
  },
  demo_mode: true
};
