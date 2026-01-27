import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getApiKeyRecordByHash, touchApiKeyLastUsed } from "@/server/db/apiKeys";

export type ApiCaller = {
  userId?: string | null;
  keyId: string;
  tier?: string | null;
  apiKeyMask: string;
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function extractToken(req: NextApiRequest) {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization || "";
  const xKey = req.headers["x-api-key"];
  const xKeyValue = Array.isArray(xKey) ? xKey[0] : xKey || "";

  const bearer = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  const token = (bearer || xKeyValue || "").toString().trim();
  return token;
}

export async function requireApiKey(req: NextApiRequest, res: NextApiResponse): Promise<ApiCaller | null> {
  const token = extractToken(req);

  if (!token || !token.startsWith("merse_")) {
    res.status(401).json({ error: "Missing API key" });
    return null;
  }

  const keyHash = sha256(token);

  try {
    const record = await getApiKeyRecordByHash(keyHash);

    if (!record || record.revokedAt) {
      res.status(401).json({ error: "Invalid or revoked API key" });
      return null;
    }

    // best-effort update
    void touchApiKeyLastUsed(record.id).catch(() => {});

    const apiKeyMask = token.length > 6 ? `...${token.slice(-6)}` : token;

    return {
      userId: record.userId ?? null,
      keyId: record.id,
      tier: record.rateLimitTier ?? null,
      apiKeyMask,
    };
  } catch (error) {
    console.error("requireApiKey error", error);
    res.status(500).json({ error: "Internal API auth error" });
    return null;
  }
}
