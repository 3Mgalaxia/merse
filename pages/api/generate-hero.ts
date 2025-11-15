import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { injectHeroSection, injectPaletteStyles, buildImagePrompt, PaletteColors } from "@/lib/siteEnhancers";
import { logApiAction } from "@/lib/logger";
import { applyRateLimit } from "@/lib/rateLimit";

type SuccessResponse = {
  imageUrl: string;
  html: string;
};

type ErrorResponse = {
  error: string;
  details?: unknown;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  baseURL: process.env.OPENAI_BASE_URL,
});

const IMAGE_MODEL = (process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1").trim();

async function generateHeroImage(prompt: string) {
  const response = await openai.images.generate({
    model: IMAGE_MODEL || "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const generated = response.data?.[0];
  const url = generated?.url ?? (generated?.b64_json ? `data:image/png;base64,${generated.b64_json}` : null);
  if (!url) {
    throw new Error("Resposta da OpenAI não retornou imagem.");
  }
  return url;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  const rate = applyRateLimit(`generate-hero:${userId ?? clientIp}`, 6, 60_000);
  if (!rate.allowed) {
    await logApiAction({
      action: "generate-hero",
      userId,
      status: 429,
      durationMs: Date.now() - startedAt,
      metadata: { reason: "rate_limited" },
    });
    return res.status(429).json({
      error: "Muitas solicitações de imagem. Aguarde alguns instantes.",
      details: { retryAfter: rate.retryAfter },
    });
  }

  const {
    siteName,
    goal,
    layout,
    palette,
    heroMood,
    notes,
    rawBrief,
    html,
    paletteColors,
    paletteDescription,
  } = req.body ?? {};

  if (!siteName || typeof siteName !== "string") {
    return res.status(400).json({ error: "Informe o nome do site." });
  }

  if (!html || typeof html !== "string") {
    return res.status(400).json({ error: "HTML base não encontrado." });
  }

  try {
    const imagePrompt = buildImagePrompt({
      siteName,
      goal,
      layout,
      palette,
      heroMood,
      notes,
      rawBrief,
      paletteDescription,
    });

    const heroImageUrl = await generateHeroImage(imagePrompt);

    const paletteColorConfig = (paletteColors ?? {}) as PaletteColors;
    let updatedHtml = injectPaletteStyles(html, paletteColorConfig);
    updatedHtml = injectHeroSection(updatedHtml, heroImageUrl, siteName);

    await logApiAction({
      action: "generate-hero",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: { hasImage: true },
    });

    return res.status(200).json({ imageUrl: heroImageUrl, html: updatedHtml });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar imagem.";
    await logApiAction({
      action: "generate-hero",
      userId,
      status: 500,
      durationMs: Date.now() - startedAt,
      metadata: { error: message },
    });
    return res.status(500).json({ error: message });
  }
}
