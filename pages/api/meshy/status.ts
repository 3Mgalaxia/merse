import type { NextApiRequest, NextApiResponse } from "next";

import { applyRateLimit } from "@/lib/rateLimit";
import { logApiAction } from "@/lib/logger";

type SuccessResponse = {
  status: string;
  result?: unknown;
};

type ErrorResponse = {
  error: string;
  details?: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  const startedAt = Date.now();
  const userIdHeader = Array.isArray(req.headers["x-merse-uid"])
    ? req.headers["x-merse-uid"][0]
    : req.headers["x-merse-uid"];
  const userId = typeof userIdHeader === "string" && userIdHeader.length > 0 ? userIdHeader : undefined;
  const clientIp =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ||
    req.socket.remoteAddress ||
    "unknown";

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const rateResult = applyRateLimit(`meshy-status:${userId ?? clientIp}`, 20, 60_000);
  if (!rateResult.allowed) {
    await logApiAction({
      action: "meshy-status",
      userId,
      status: 429,
      durationMs: Date.now() - startedAt,
      metadata: { reason: "rate_limited" },
    });
    return res.status(429).json({
      error: "Consultas ao status excederam o limite. Aguarde alguns segundos.",
      details: { retryAfter: rateResult.retryAfter },
    });
  }

  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Configure MESHY_API_KEY no ambiente." });
  }

  const taskId = String(req.query.taskId ?? "");

  if (!taskId) {
    return res.status(400).json({ error: "Informe taskId na query string." });
  }

  try {
    const response = await fetch(`https://api.meshy.ai/v2/text-to-3d/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message ?? "Falha ao consultar status na Meshy.",
        details: data,
      });
    }

    const payload = {
      status: data?.status ?? "unknown",
      result: data,
    };

    await logApiAction({
      action: "meshy-status",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: { taskId },
    });

    return res.status(200).json(payload);
  } catch (error) {
    await logApiAction({
      action: "meshy-status",
      userId,
      status: 500,
      durationMs: Date.now() - startedAt,
      metadata: { error: error instanceof Error ? error.message : String(error), taskId },
    });
    return res.status(500).json({
      error: "Erro inesperado ao consultar a Meshy.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
