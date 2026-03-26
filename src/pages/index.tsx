import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { ActivityFeed } from "@/components/ActivityFeed";
import { InventoryList } from "@/components/InventoryList";
import { MetricCard } from "@/components/MetricCard";
import { SectionCard } from "@/components/SectionCard";
import { SettingsModal } from "@/components/SettingsModal";
import { SuggestionList } from "@/components/SuggestionList";
import {
  approveSuggestion,
  dismissSuggestion,
  fetchDashboard,
  saveSettings
} from "@/lib/api";
import { hasSupabaseEnv } from "@/lib/env";
import { formatCurrency, formatNumber, formatRelativeDate } from "@/lib/format";
import { mockDashboard } from "@/lib/mock-data";
import { getBrowserSupabaseClient } from "@/lib/supabase";
import type { DashboardPayload, SettingsRecord } from "@/types/dashboard";

export default function HomePage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardPayload>(mockDashboard);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const supabaseReady = useMemo(() => hasSupabaseEnv(), []);

  useEffect(() => {
    let cancelled = false;
    const client = getBrowserSupabaseClient();

    async function loadDashboard() {
      try {
        const payload = await fetchDashboard();
        if (!cancelled) {
          setDashboard(payload);
          setError("");
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function bootstrap() {
      if (!supabaseReady) {
        setLoading(false);
        return;
      }

      if (!client) {
        setLoading(false);
        return;
      }

      const {
        data: { session }
      } = await client.auth.getSession();

      if (!session) {
        await router.replace("/auth");
        return;
      }

      await loadDashboard();
    }

    bootstrap();

    if (client) {
      const channel = client
        .channel("dashboard-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "agent_logs" },
          () => void loadDashboard()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "daily_reports" },
          () => void loadDashboard()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "suggestions" },
          () => void loadDashboard()
        )
        .subscribe();

      return () => {
        cancelled = true;
        client.removeChannel(channel);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [router, supabaseReady]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await approveSuggestion(id);
      setDashboard((current) => ({
        ...current,
        suggestions: current.suggestions.filter((item) => item.id !== id),
        today: {
          ...current.today,
          suggestions_pending: Math.max(current.today.suggestions_pending - 1, 0)
        }
      }));
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to approve suggestion."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      await dismissSuggestion(id);
      setDashboard((current) => ({
        ...current,
        suggestions: current.suggestions.filter((item) => item.id !== id),
        today: {
          ...current.today,
          suggestions_pending: Math.max(current.today.suggestions_pending - 1, 0)
        }
      }));
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to dismiss suggestion."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveSettings(payload: SettingsRecord) {
    setSavingSettings(true);
    try {
      const saved = await saveSettings(payload);
      setDashboard((current) => ({
        ...current,
        settings: saved
      }));
      setSettingsOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save settings."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSignOut() {
    const client = getBrowserSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    await router.push("/auth");
  }

  if (loading) {
    return <main className="loading-screen">Loading dashboard...</main>;
  }

  const isOwner = dashboard.profile.role === "owner";

  return (
    <>
      <Head>
        <title>Pita 22 NemoClaw Dashboard</title>
      </Head>
      <main className="dashboard-page">
        <div className="dashboard-shell">
          <header className="hero panel">
            <div>
              <p className="eyebrow">Pita 22 operations</p>
              <h1>NemoClaw dashboard</h1>
              <p className="hero-copy">
                One screen for live restaurant performance, agent suggestions,
                and the latest exceptions that need attention.
              </p>
            </div>

            <div className="hero-actions">
              <div className="hero-meta">
                <span className={`status-dot status-${dashboard.agent_status}`} />
                <span>{dashboard.agent_status}</span>
                <span className="muted">
                  Updated {formatRelativeDate(dashboard.last_update)}
                </span>
              </div>
              <div className="hero-buttons">
                <button
                  className="button button-secondary"
                  onClick={() => setSettingsOpen(true)}
                  type="button"
                >
                  Settings
                </button>
                {supabaseReady ? (
                  <button
                    className="button button-ghost"
                    onClick={handleSignOut}
                    type="button"
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          {dashboard.demo_mode ? (
            <div className="demo-banner">
              Demo mode is active. Connect Supabase to enable auth, realtime, and
              persistence.
            </div>
          ) : null}

          {error ? <div className="error-banner">{error}</div> : null}

          <section className="metrics-grid">
            <MetricCard
              detail={`${formatNumber(dashboard.today.transactions)} transactions today`}
              label="Revenue"
              tone="success"
              value={formatCurrency(dashboard.today.revenue)}
            />
            <MetricCard
              detail="New review volume today"
              label="Reviews"
              value={formatNumber(dashboard.today.reviews_new)}
            />
            <MetricCard
              detail="Items need a closer look"
              label="Inventory Alerts"
              tone={dashboard.today.inventory_alerts > 0 ? "alert" : "default"}
              value={formatNumber(dashboard.today.inventory_alerts)}
            />
            <MetricCard
              detail={isOwner ? "Awaiting your decision" : "Pending owner review"}
              label="Suggestions"
              tone={dashboard.today.suggestions_pending > 0 ? "alert" : "default"}
              value={formatNumber(dashboard.today.suggestions_pending)}
            />
          </section>

          <section className="dashboard-grid">
            <div className="primary-column">
              <SectionCard
                action={<span className="muted">{dashboard.report.report_date}</span>}
                eyebrow="Daily report"
                title="Today’s snapshot"
              >
                <div className="report-grid">
                  <div>
                    <h3>Top sellers</h3>
                    <div className="stack-list compact">
                      {dashboard.report.top_items.map((item) => (
                        <div className="table-row" key={item.name}>
                          <div>
                            <strong>{item.name}</strong>
                            <p className="muted">{item.qty} sold</p>
                          </div>
                          <span>{formatCurrency(item.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3>Labor forecast</h3>
                    <div className="stack-list compact">
                      {dashboard.report.labor_forecast.map((item) => (
                        <div className="table-row" key={item.time_slot}>
                          <div>
                            <strong>{item.time_slot}</strong>
                            <p className="muted">
                              Suggested {item.suggested_staff}, actual {item.actual_staff}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="report-footer">
                  <div>
                    <p className="eyebrow">Sentiment</p>
                    <p>{dashboard.report.reviews_sentiment}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Food cost</p>
                    <p>{dashboard.report.food_cost_pct}%</p>
                  </div>
                  <div className="report-note">
                    <p className="eyebrow">Notes</p>
                    <p>{dashboard.report.notes}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard eyebrow="Action queue" title="Pending suggestions">
                <SuggestionList
                  busyId={busyId}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                  role={dashboard.profile.role}
                  suggestions={dashboard.suggestions}
                />
              </SectionCard>
            </div>

            <div className="secondary-column">
              <SectionCard eyebrow="Exceptions" title="Inventory alerts">
                <InventoryList items={dashboard.inventory_alerts} />
              </SectionCard>

              <SectionCard eyebrow="Agent log" title="Recent activity">
                <ActivityFeed logs={dashboard.logs} />
              </SectionCard>

              <SectionCard eyebrow="Access" title="Active operator">
                <div className="operator-card">
                  <strong>{dashboard.profile.full_name || dashboard.profile.email}</strong>
                  <p className="muted">{dashboard.profile.email}</p>
                  <span className="pill">{dashboard.profile.role}</span>
                </div>
              </SectionCard>
            </div>
          </section>
        </div>

        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
          open={settingsOpen}
          role={dashboard.profile.role}
          saving={savingSettings}
          settings={dashboard.settings}
        />
      </main>
    </>
  );
}
