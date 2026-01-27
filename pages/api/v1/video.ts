import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiKey } from "@/server/auth/requireApiKey";
import legacyHandler from "../generate-video";
import { enforceRateLimit } from "@/server/rateLimit/enforceRateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const caller = await requireApiKey(req, res);
  if (!caller) return;

  const limited = await enforceRateLimit({ req, res, caller, resource: "video" });
  if (limited) return;

  return legacyHandler(req, res);
}
