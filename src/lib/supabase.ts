import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import {
  getSupabasePublishableKey,
  getSupabaseServiceKey,
  getSupabaseUrl
} from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let browserClientPromise:
  | Promise<ReturnType<typeof createBrowserClient> | null>
  | null = null;

type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

async function getPublicSupabaseConfig(): Promise<PublicSupabaseConfig | null> {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (publicUrl && publicKey) {
    return { url: publicUrl, publishableKey: publicKey };
  }

  if (typeof window === "undefined") {
    const url = getSupabaseUrl();
    const publishableKey = getSupabasePublishableKey();
    return url && publishableKey ? { url, publishableKey } : null;
  }

  const response = await fetch("/api/public-config");
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PublicSupabaseConfig;
  if (!data.url || !data.publishableKey) {
    return null;
  }

  return data;
}

export async function getBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  if (!browserClientPromise) {
    browserClientPromise = getPublicSupabaseConfig().then((config) => {
      if (!config) {
        return null;
      }

      browserClient = createBrowserClient(config.url, config.publishableKey);
      return browserClient;
    });
  }

  return browserClientPromise;
}

export function getServiceSupabaseClient() {
  const url = getSupabaseUrl();
  const serviceRole = getSupabaseServiceKey();
  const anonKey = getSupabasePublishableKey();

  if (!url || !(serviceRole || anonKey)) {
    return null;
  }

  return createClient(url, serviceRole || anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function getAnonServerSupabaseClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabasePublishableKey();

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
