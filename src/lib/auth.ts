import type { NextApiRequest } from "next";

import { mockDashboard } from "@/lib/mock-data";
import { hasSupabaseEnv } from "@/lib/env";
import { getAnonServerSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase";
import type { UserRole } from "@/types/dashboard";

export type ApiUser = {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  demoMode: boolean;
};

export async function requireApiUser(
  req: NextApiRequest
): Promise<ApiUser | null> {
  if (!hasSupabaseEnv()) {
    return {
      ...mockDashboard.profile,
      demoMode: true
    };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return null;
  }

  const anonClient = getAnonServerSupabaseClient();
  const serviceClient = getServiceSupabaseClient();
  if (!anonClient || !serviceClient) {
    return null;
  }

  const {
    data: { user },
    error
  } = await anonClient.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || "",
    role: (profile?.role as UserRole) || "manager",
    full_name: profile?.full_name,
    demoMode: false
  };
}

export function requireOwner(user: ApiUser | null) {
  return Boolean(user && user.role === "owner");
}
