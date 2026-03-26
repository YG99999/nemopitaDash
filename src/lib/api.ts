import type { DashboardPayload, SettingsRecord } from "@/types/dashboard";

async function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const { getBrowserSupabaseClient } = await import("@/lib/supabase");
  const client = await getBrowserSupabaseClient();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json() as Promise<T>;
}

export function fetchDashboard() {
  return request<DashboardPayload>("/api/dashboard");
}

export function approveSuggestion(id: string, notes = "") {
  return request<{ status: string }>(`/api/suggestions/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes })
  });
}

export function dismissSuggestion(id: string, notes = "") {
  return request<{ status: string }>(`/api/suggestions/${id}/dismiss`, {
    method: "POST",
    body: JSON.stringify({ notes })
  });
}

export function saveSettings(payload: SettingsRecord) {
  return request<SettingsRecord>("/api/settings", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
