import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { applyRateLimit } from "@/lib/rateLimit";
import { logApiAction } from "@/lib/logger";

type RequestBody = {
  brief?: unknown;
  image?: unknown;
  objective?: unknown;
  tone?: unknown;
  audience?: unknown;
  channel?: unknown;
  language?: unknown;
};

type LayoutBlueprint = {
  name: string;
  format: string;
  purpose: string;
  sections: string[];
  notes: string;
};

type CanvasPackageResponse = {
  concept: string;
  conceptSummary: string;
  voice: string;
  visualDirections: string[];
  slogans: string[];
  headlines: string[];
  bodyCopies: string[];
  ctaOptions: string[];
  socialCaptions: string[];
  layoutBlueprints: LayoutBlueprint[];
  styleGuide: {
    palette: string[];
    typography: string[];
    composition: string[];
  };
  provider: "openai" | "fallback";
  generatedAt: string;
  latencyMs: number;
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeImage(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "";
}

function normalizeArray(value: unknown, maxLength: number, maxItems: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeHexColors(value: unknown) {
  const colors = normalizeArray(value, 20, 6);
  const hexRegex = /^#[0-9a-f]{3,8}$/i;
  const normalized = colors.filter((color) => hexRegex.test(color));
  return normalized.length > 0 ? normalized : ["#0f172a", "#7c3aed", "#ec4899", "#38bdf8"];
}

function asObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractJsonText(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw.trim();
}

function normalizeLayoutBlueprint(value: unknown): LayoutBlueprint | null {
  const raw = asObject(value);
  if (!raw) return null;

  const name = sanitizeText(raw.name, 80);
  const purpose = sanitizeText(raw.purpose, 180);
  if (!name || !purpose) return null;

  const sections = normalizeArray(raw.sections, 120, 8);
  const notes = sanitizeText(raw.notes, 200) || "Aplicar contraste alto no bloco principal.";
  const format = sanitizeText(raw.format, 60) || "landing";

  return {
    name,
    format,
    purpose,
    sections:
      sections.length > 0
        ? sections
        : ["Hero com promessa", "Prova social", "Oferta", "CTA final"],
    notes,
  };
}

function normalizeCanvasResponse(payload: unknown, latencyMs: number): CanvasPackageResponse {
  const raw = asObject(payload) ?? {};
  const styleGuide = asObject(raw.styleGuide) ?? {};
  const layoutRaw = Array.isArray(raw.layoutBlueprints) ? raw.layoutBlueprints : [];

  const layoutBlueprints = layoutRaw
    .map((item) => normalizeLayoutBlueprint(item))
    .filter((item): item is LayoutBlueprint => Boolean(item))
    .slice(0, 4);

  return {
    concept: sanitizeText(raw.concept, 90) || "Merse Cosmic Statement",
    conceptSummary:
      sanitizeText(raw.conceptSummary, 240) ||
      "Campanha com assinatura Merse, contraste premium e narrativa visual orientada a conversao.",
    voice: sanitizeText(raw.voice, 120) || "Confiante, futurista e direto ao beneficio.",
    visualDirections:
      normalizeArray(raw.visualDirections, 120, 8).length > 0
        ? normalizeArray(raw.visualDirections, 120, 8)
        : ["Luz volumetrica", "Vidro liquido", "Gradiente neon", "Tipografia ampla"],
    slogans:
      normalizeArray(raw.slogans, 120, 8).length > 0
        ? normalizeArray(raw.slogans, 120, 8)
        : ["Sua marca em orbita de conversao."],
    headlines:
      normalizeArray(raw.headlines, 140, 8).length > 0
        ? normalizeArray(raw.headlines, 140, 8)
        : ["Transforme visuais em campanhas com assinatura Merse."],
    bodyCopies:
      normalizeArray(raw.bodyCopies, 220, 8).length > 0
        ? normalizeArray(raw.bodyCopies, 220, 8)
        : ["Use IA para criar comunicacao completa com narrativa, contraste e hierarquia visual."],
    ctaOptions:
      normalizeArray(raw.ctaOptions, 60, 8).length > 0
        ? normalizeArray(raw.ctaOptions, 60, 8)
        : ["Criar campanha agora", "Ver blueprint"],
    socialCaptions:
      normalizeArray(raw.socialCaptions, 180, 6).length > 0
        ? normalizeArray(raw.socialCaptions, 180, 6)
        : ["Visual pronto, copy pronta, campanha pronta. Tudo no ritmo Merse."],
    layoutBlueprints:
      layoutBlueprints.length > 0
        ? layoutBlueprints
        : [
            {
              name: "Hero + Beneficio",
              format: "landing",
              purpose: "Apresentar promessa e capturar interesse imediato.",
              sections: ["Hero", "Prova", "Oferta", "CTA"],
              notes: "Use CTA principal acima da dobra.",
            },
          ],
    styleGuide: {
      palette: normalizeHexColors(styleGuide.palette),
      typography:
        normalizeArray(styleGuide.typography, 80, 5).length > 0
          ? normalizeArray(styleGuide.typography, 80, 5)
          : ["Space Grotesk para titulos", "Poppins para corpo", "Peso 600 para CTA"],
      composition:
        normalizeArray(styleGuide.composition, 120, 6).length > 0
          ? normalizeArray(styleGuide.composition, 120, 6)
          : ["Hero com foco central", "Cards com borda luminosa", "Espacamento 24/32px"],
    },
    provider: raw.provider === "fallback" ? "fallback" : "openai",
    generatedAt: new Date().toISOString(),
    latencyMs,
  };
}

function buildFallbackResponse(params: {
  brief: string;
  objective: string;
  tone: string;
  audience: string;
  channel: string;
  latencyMs: number;
}): CanvasPackageResponse {
  const concept = params.objective
    ? `Merse ${params.objective}`
    : "Merse Campaign Frame";
  const tone = params.tone || "futurista";
  const audience = params.audience || "publico digital";
  const channel = params.channel || "campanha";
  const base = params.brief || "solucao visual";

  return {
    concept,
    conceptSummary: `Direcao criativa ${tone} para ${channel}, focada em ${audience} com narrativa clara e assinatura Merse.`,
    voice: `${tone} com foco em beneficio imediato e linguagem premium.`,
    visualDirections: [
      "Nebulosas suaves no fundo",
      "Glassmorphism com bordas luminosas",
      "Contraste alto em titulos e CTA",
      "Elementos orbitais para profundidade",
    ],
    slogans: [
      "Sua ideia em velocidade de orbita.",
      "Visual que converte, assinatura que permanece.",
      "Do briefing ao impacto em segundos.",
    ],
    headlines: [
      `Transforme ${base} em campanha de alta conversao.`,
      "Pacotes criativos completos com IA Merse.",
      "Textos, slogans e layout no mesmo fluxo.",
    ],
    bodyCopies: [
      `Criamos uma linha narrativa para ${audience}, com estrutura pronta para ${channel} e foco em performance.`,
      "A composicao foi planejada para leitura rapida, com CTA forte e hierarquia visual consistente.",
      "O pacote final chega pronto para ajustar detalhes e publicar.",
    ],
    ctaOptions: [
      "Gerar pacote agora",
      "Validar conceito",
      "Publicar campanha",
      "Testar variacao",
    ],
    socialCaptions: [
      "Upload da referencia, direcao pronta e campanha no ar.",
      "Menos retrabalho, mais consistencia visual com assinatura Merse.",
      "Criacao orientada a resultado, do feed ao pitch.",
    ],
    layoutBlueprints: [
      {
        name: "Landing de Conversao",
        format: "landing",
        purpose: "Converter trafego frio com proposta clara e CTA forte.",
        sections: ["Hero", "Beneficios", "Prova social", "Oferta", "FAQ", "CTA final"],
        notes: "Repetir CTA no meio e no fim da pagina.",
      },
      {
        name: "Carrossel de Oferta",
        format: "social 4:5",
        purpose: "Apresentar problema, solucao e prova em sequencia rapida.",
        sections: ["Capa", "Dor", "Solucao", "Prova", "Oferta", "CTA"],
        notes: "Manter texto de 8-12 palavras por card.",
      },
    ],
    styleGuide: {
      palette: ["#0b1120", "#7c3aed", "#ec4899", "#22d3ee"],
      typography: ["Space Grotesk nos titulos", "Poppins no corpo", "Peso 700 para CTA"],
      composition: ["Grid modular 12 colunas", "Cards com glow", "Blocos com respiro vertical"],
    },
    provider: "fallback",
    generatedAt: new Date().toISOString(),
    latencyMs: params.latencyMs,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CanvasPackageResponse | ErrorResponse>,
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
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rate = applyRateLimit(`canvas-ia:${userId ?? clientIp}`, 12, 60_000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Muitas geracoes em sequencia. Aguarde alguns segundos e tente novamente.",
      details: [`retryAfterMs=${rate.retryAfter}`],
    });
  }

  const body = (req.body ?? {}) as RequestBody;
  const brief = sanitizeText(body.brief, 2000);
  const image = normalizeImage(body.image);
  const objective = sanitizeText(body.objective, 80);
  const tone = sanitizeText(body.tone, 80);
  const audience = sanitizeText(body.audience, 80);
  const channel = sanitizeText(body.channel, 80);
  const language = sanitizeText(body.language, 10).toLowerCase() || "pt-br";

  if (!image) {
    return res.status(400).json({ error: "Envie uma imagem para gerar o pacote do Canvas IA." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = buildFallbackResponse({
      brief,
      objective,
      tone,
      audience,
      channel,
      latencyMs: Date.now() - startedAt,
    });
    return res.status(200).json(fallback);
  }

  const model = (process.env.OPENAI_CANVAS_MODEL ?? "gpt-4o-mini").trim();
  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const contextLines = [
    brief ? `Brief: ${brief}` : null,
    objective ? `Objetivo: ${objective}` : null,
    tone ? `Tom: ${tone}` : null,
    audience ? `Publico: ${audience}` : null,
    channel ? `Canal: ${channel}` : null,
    `Idioma de saida: ${language}`,
  ]
    .filter(Boolean)
    .join("\n");

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [
        "Voce e diretora criativa da Merse.",
        "Analise a imagem e gere um pacote pronto de copy + layouts.",
        "Retorne APENAS JSON com chaves:",
        "concept, conceptSummary, voice, visualDirections, slogans, headlines, bodyCopies,",
        "ctaOptions, socialCaptions, layoutBlueprints, styleGuide, provider.",
        "layoutBlueprints: array com name, format, purpose, sections, notes.",
        "styleGuide: palette(hex), typography, composition.",
        "Maximo de 4 layoutBlueprints, 8 slogans/headlines/copies.",
        "Sem markdown. Sem texto fora do JSON.",
      ].join(" "),
    },
    {
      role: "user",
      content: contextLines || "Gerar pacote completo no padrao Merse.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Use esta imagem como referencia visual principal para os textos, slogans e layouts.",
        },
        {
          type: "image_url",
          image_url: { url: image },
        },
      ],
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.75,
      max_tokens: 1400,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("Resposta vazia da IA.");
    }

    const parsed = JSON.parse(extractJsonText(raw));
    const payload = normalizeCanvasResponse(
      { ...parsed, provider: "openai" },
      Date.now() - startedAt,
    );

    void logApiAction({
      action: "canvas-ia-generate",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: {
        objective,
        tone,
        audience,
        channel,
        briefChars: brief.length,
        hasImage: Boolean(image),
      },
    });

    return res.status(200).json(payload);
  } catch (error) {
    console.error("[canvas-ia/generate] error:", error);

    const fallback = buildFallbackResponse({
      brief,
      objective,
      tone,
      audience,
      channel,
      latencyMs: Date.now() - startedAt,
    });

    void logApiAction({
      action: "canvas-ia-generate",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: {
        objective,
        tone,
        audience,
        channel,
        hasImage: Boolean(image),
        usedFallback: true,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return res.status(200).json(fallback);
  }
}
