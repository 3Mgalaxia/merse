import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { applyRateLimit } from "@/lib/rateLimit";
import { logApiAction } from "@/lib/logger";

type RequestBody = {
  prompt?: unknown;
  image?: unknown;
  goal?: unknown;
  audience?: unknown;
  tone?: unknown;
  focusAreas?: unknown;
  mode?: unknown;
};

type PriorityLevel = "alta" | "media" | "baixa";

type AnalysisBucket = {
  score: number;
  diagnosis: string;
  actions: string[];
};

type AssistantResponse = {
  headline: string;
  suggestions: string[];
  callouts: string[];
  analysis: {
    layout: AnalysisBucket;
    contrast: AnalysisBucket;
    hierarchy: AnalysisBucket;
    cta: AnalysisBucket;
    responsive: AnalysisBucket;
  };
  quickWins: string[];
  roadmap: Array<{
    priority: PriorityLevel;
    task: string;
    impact: string;
    effort: string;
  }>;
  provider: "openai" | "fallback";
  mode: "quick" | "deep";
  generatedAt: string;
  latencyMs: number;
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

const FALLBACK_CALLOUTS = ["Hierarquia", "Contraste", "CTA", "Mobile-first"];

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

function normalizeMode(value: unknown): "quick" | "deep" {
  if (typeof value === "string" && value.trim().toLowerCase() === "quick") {
    return "quick";
  }
  return "deep";
}

function normalizeImage(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return undefined;
}

function normalizeFocusAreas(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item, 40))
    .filter(Boolean)
    .slice(0, 8);
}

function clampScore(value: unknown, fallback: number) {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function asObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeStringArray(value: unknown, maxLength: number, maxItems: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizePriority(value: unknown): PriorityLevel {
  const normalized = sanitizeText(value, 16).toLowerCase();
  if (normalized === "alta") return "alta";
  if (normalized === "baixa") return "baixa";
  return "media";
}

function normalizeBucket(value: unknown, fallbackDiagnosis: string): AnalysisBucket {
  const raw = asObject(value) ?? {};
  return {
    score: clampScore(raw.score, 68),
    diagnosis: sanitizeText(raw.diagnosis, 220) || fallbackDiagnosis,
    actions:
      normalizeStringArray(raw.actions, 170, 4).length > 0
        ? normalizeStringArray(raw.actions, 170, 4)
        : ["Ajustar composição e simplificar elementos visuais."],
  };
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

function normalizeAssistantResponse(
  payload: unknown,
  fallbackMode: "quick" | "deep",
  latencyMs: number,
): AssistantResponse {
  const raw = asObject(payload) ?? {};
  const analysisRaw = asObject(raw.analysis) ?? {};

  const suggestions = normalizeStringArray(raw.suggestions, 200, 10);
  const quickWins = normalizeStringArray(raw.quickWins, 180, 6);
  const callouts = normalizeStringArray(raw.callouts, 40, 6);
  const roadmapRaw = Array.isArray(raw.roadmap) ? raw.roadmap : [];

  const roadmap = roadmapRaw
    .map((entry) => {
      const item = asObject(entry);
      if (!item) return null;
      return {
        priority: normalizePriority(item.priority),
        task: sanitizeText(item.task, 180),
        impact: sanitizeText(item.impact, 180),
        effort: sanitizeText(item.effort, 180),
      };
    })
    .filter(
      (
        item,
      ): item is { priority: PriorityLevel; task: string; impact: string; effort: string } =>
        Boolean(item?.task),
    )
    .slice(0, 6);

  return {
    headline: sanitizeText(raw.headline, 120) || "Diagnostico visual Merse",
    suggestions:
      suggestions.length > 0
        ? suggestions
        : ["Organize o topo em uma mensagem principal, prova e CTA claro."],
    callouts: callouts.length > 0 ? callouts : FALLBACK_CALLOUTS,
    analysis: {
      layout: normalizeBucket(
        analysisRaw.layout,
        "Estrutura geral funcional, mas pode ganhar mais clareza no fluxo de leitura.",
      ),
      contrast: normalizeBucket(
        analysisRaw.contrast,
        "Contraste mediano entre texto e fundo; priorize legibilidade em blocos principais.",
      ),
      hierarchy: normalizeBucket(
        analysisRaw.hierarchy,
        "Hierarquia visual pode ficar mais clara com títulos, subtítulos e espaçamento consistente.",
      ),
      cta: normalizeBucket(
        analysisRaw.cta,
        "CTAs existem, mas podem ser mais evidentes na primeira dobra e em pontos-chave.",
      ),
      responsive: normalizeBucket(
        analysisRaw.responsive,
        "Ajuste responsivo recomendado para preservar ritmo visual em telas menores.",
      ),
    },
    quickWins:
      quickWins.length > 0
        ? quickWins
        : [
            "Aumentar contraste do CTA principal.",
            "Reforcar hierarquia entre titulo e subtitulo.",
            "Padronizar espacamento vertical entre seções.",
          ],
    roadmap:
      roadmap.length > 0
        ? roadmap
        : [
            {
              priority: "alta",
              task: "Reorganizar hero com beneficio principal + CTA.",
              impact: "Aumenta clareza e conversao inicial.",
              effort: "Baixo",
            },
            {
              priority: "media",
              task: "Revisar escala tipografica para desktop e mobile.",
              impact: "Melhora leitura e ritmo de navegacao.",
              effort: "Medio",
            },
          ],
    provider: raw.provider === "fallback" ? "fallback" : "openai",
    mode: raw.mode === "quick" ? "quick" : fallbackMode,
    generatedAt: new Date().toISOString(),
    latencyMs,
  };
}

function buildFallbackResponse(params: {
  prompt: string;
  hasImage: boolean;
  focusAreas: string[];
  mode: "quick" | "deep";
  latencyMs: number;
}): AssistantResponse {
  const hasContrastFocus =
    params.focusAreas.some((item) => item.toLowerCase().includes("contraste")) ||
    params.prompt.toLowerCase().includes("contraste");
  const hasHierarchyFocus =
    params.focusAreas.some((item) => item.toLowerCase().includes("hierarquia")) ||
    params.prompt.toLowerCase().includes("hierarquia");

  return {
    headline: params.hasImage
      ? "Diagnostico visual pronto para iteracao"
      : "Diagnostico estrategico pronto para execucao",
    suggestions: [
      "Defina uma proposta de valor unica no hero e reduza distrações no primeiro bloco.",
      "Mantenha um CTA primario fixo por secao para evitar competicao entre botoes.",
      "Use contraste mais forte entre fundo e textos secundarios para leitura imediata.",
      "Agrupe elementos relacionados em blocos com espacamento vertical consistente.",
      "Em mobile, reduza densidade visual e priorize escaneabilidade em 3 segundos.",
    ],
    callouts: FALLBACK_CALLOUTS,
    analysis: {
      layout: {
        score: 74,
        diagnosis: "Fluxo visual bom, com espaco para simplificar blocos e reduzir ruído.",
        actions: [
          "Encurtar o hero para uma promessa + prova + CTA.",
          "Separar seções longas em blocos com subtitulos claros.",
        ],
      },
      contrast: {
        score: hasContrastFocus ? 66 : 72,
        diagnosis: "Alguns textos e elementos de interface podem perder legibilidade.",
        actions: [
          "Garantir contraste AA para textos e botoes principais.",
          "Escurecer fundo ou clarear tipografia em cards secundários.",
        ],
      },
      hierarchy: {
        score: hasHierarchyFocus ? 67 : 73,
        diagnosis: "Hierarquia existe, mas titulos e CTAs podem ficar mais evidentes.",
        actions: [
          "Aumentar diferença visual entre H1, H2 e corpo.",
          "Limitar variações tipograficas para reforçar consistência.",
        ],
      },
      cta: {
        score: 71,
        diagnosis: "CTAs funcionais, porém sem destaque máximo nos pontos de decisão.",
        actions: [
          "Padronizar texto do CTA em linguagem orientada a beneficio.",
          "Adicionar repetição de CTA após blocos de prova social.",
        ],
      },
      responsive: {
        score: 70,
        diagnosis: "Base responsiva adequada, mas a ordem de leitura mobile pode melhorar.",
        actions: [
          "Reposicionar CTA primario acima da dobra no mobile.",
          "Reduzir espaçamento lateral para ganhar área útil em telas pequenas.",
        ],
      },
    },
    quickWins: [
      "Aumentar contraste do botao principal em 1 nível.",
      "Reescrever H1 para benefício direto ao usuário.",
      "Padronizar margens verticais entre blocos em 24/32px.",
    ],
    roadmap: [
      {
        priority: "alta",
        task: "Reestruturar hero com foco em conversao.",
        impact: "Mais clareza e menor taxa de abandono inicial.",
        effort: "Baixo",
      },
      {
        priority: "media",
        task: "Aplicar matriz de contraste para textos e UI.",
        impact: "Melhora legibilidade e percepção premium.",
        effort: "Medio",
      },
      {
        priority: "media",
        task: "Revisar hierarquia tipografica em mobile.",
        impact: "Escaneabilidade superior em telas pequenas.",
        effort: "Medio",
      },
    ],
    provider: "fallback",
    mode: params.mode,
    generatedAt: new Date().toISOString(),
    latencyMs: params.latencyMs,
  };
}

function buildUserContext(params: {
  prompt: string;
  goal: string;
  audience: string;
  tone: string;
  focusAreas: string[];
  mode: "quick" | "deep";
}) {
  return [
    params.prompt ? `Contexto: ${params.prompt}` : null,
    params.goal ? `Objetivo: ${params.goal}` : null,
    params.audience ? `Publico: ${params.audience}` : null,
    params.tone ? `Tom visual: ${params.tone}` : null,
    params.focusAreas.length > 0 ? `Focos: ${params.focusAreas.join(", ")}` : null,
    `Modo de analise: ${params.mode === "quick" ? "rapido" : "profundo"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AssistantResponse | ErrorResponse>,
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

  const rateResult = applyRateLimit(`assistente-site:${userId ?? clientIp}`, 12, 60_000);
  if (!rateResult.allowed) {
    return res.status(429).json({
      error: "Muitas análises em sequência. Aguarde alguns segundos e tente novamente.",
      details: [`retryAfterMs=${rateResult.retryAfter}`],
    });
  }

  const body = (req.body ?? {}) as RequestBody;
  const prompt = sanitizeText(body.prompt, 2000);
  const image = normalizeImage(body.image);
  const goal = sanitizeText(body.goal, 120);
  const audience = sanitizeText(body.audience, 120);
  const tone = sanitizeText(body.tone, 120);
  const focusAreas = normalizeFocusAreas(body.focusAreas);
  const mode = normalizeMode(body.mode);

  if (!prompt && !image) {
    return res.status(400).json({ error: "Envie um contexto ou uma imagem." });
  }

  const contextText = buildUserContext({ prompt, goal, audience, tone, focusAreas, mode });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = buildFallbackResponse({
      prompt,
      hasImage: Boolean(image),
      focusAreas,
      mode,
      latencyMs: Date.now() - startedAt,
    });
    return res.status(200).json(fallback);
  }

  const model = (process.env.OPENAI_SITE_MENTOR_MODEL ?? "gpt-4o-mini").trim();
  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [
        "Voce e uma especialista de UX/UI da Merse.",
        "Analise layout, contraste, hierarquia, CTA e responsividade.",
        "Retorne APENAS JSON com chaves:",
        "headline, suggestions, callouts, analysis, quickWins, roadmap, provider, mode.",
        "analysis deve ter buckets: layout, contrast, hierarchy, cta, responsive.",
        "Cada bucket: score (0-100), diagnosis, actions (array).",
        "roadmap: lista com priority(alta|media|baixa), task, impact, effort.",
        "Responda em portugues do Brasil, sem markdown.",
      ].join(" "),
    },
  ];

  if (contextText) {
    messages.push({ role: "user", content: contextText });
  }

  if (image) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: "Analise esta screenshot de site com foco em layout, contraste e hierarquia visual.",
        },
        {
          type: "image_url",
          image_url: { url: image },
        },
      ],
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: mode === "quick" ? 700 : 1100,
      temperature: mode === "quick" ? 0.35 : 0.55,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("Resposta vazia da IA.");
    }

    const parsed = JSON.parse(extractJsonText(raw));
    const responsePayload = normalizeAssistantResponse(
      { ...parsed, provider: "openai", mode },
      mode,
      Date.now() - startedAt,
    );

    void logApiAction({
      action: "assistente-site",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: {
        mode,
        hasImage: Boolean(image),
        promptChars: prompt.length,
        focusAreasCount: focusAreas.length,
      },
    });

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error("assistente-site error", error);

    const fallback = buildFallbackResponse({
      prompt,
      hasImage: Boolean(image),
      focusAreas,
      mode,
      latencyMs: Date.now() - startedAt,
    });

    void logApiAction({
      action: "assistente-site",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: {
        mode,
        hasImage: Boolean(image),
        usedFallback: true,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return res.status(200).json(fallback);
  }
}
