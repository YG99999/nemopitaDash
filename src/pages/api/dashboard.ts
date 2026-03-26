import type { NextApiRequest, NextApiResponse } from "next";

import { requireApiUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireApiUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = await getDashboardData(user);
  return res.status(200).json(payload);
}
