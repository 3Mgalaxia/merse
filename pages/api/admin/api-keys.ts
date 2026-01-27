import type { NextApiRequest, NextApiResponse } from "next";
import { createApiKey, revokeApiKey } from "@/server/auth/apiKeys";

function isAdmin(req: NextApiRequest) {
  const adminKey = process.env.MERSE_ADMIN_KEY?.trim();
  if (!adminKey) return false;
  const header = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization ?? req.headers["x-admin-key"];
  const token =
    typeof header === "string"
      ? header.replace(/Bearer\s+/i, "").trim()
      : typeof header === "number"
      ? String(header)
      : "";
  return token === adminKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Admin key inválida ou ausente." });
  }

  if (req.method === "POST") {
    const { userId, name, rateLimitTier } = req.body ?? {};
    if (typeof userId !== "string" || !userId.trim() || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Envie userId e name para criar a chave." });
    }
    const record = await createApiKey({ userId: userId.trim(), name: name.trim(), rateLimitTier });
    return res.status(200).json(record);
  }

  if (req.method === "DELETE") {
    const { keyId } = req.body ?? {};
    if (typeof keyId !== "string" || !keyId.trim()) {
      return res.status(400).json({ error: "Envie keyId para revogar." });
    }
    await revokeApiKey(keyId.trim());
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
