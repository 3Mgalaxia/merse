import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type SuccessResponse = {
  videoUrl: string;
  cover?: string;
  duration: number;
  storyboard: string;
  provider: string;
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

type CorporateGoal = "launch" | "institutional" | "events" | "training";
type CorporateScenario = "galaxy" | "space" | "studio" | "urban";

type ProviderInput = {
  prompt: string;
  duration: number;
  referenceImage?: string;
};

type ProviderSettings = {
  key: string;
  label: string;
  model?: string;
  version?: string;
  token?: string;
  pollInterval: number;
  maxAttempts: number;
  buildInput: (payload: ProviderInput) => Record<string, unknown>;
};

type PredictionStatus = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; details?: string };
};

type BodyPayload = {
  company?: unknown;
  goal?: unknown;
  scenario?: unknown;
  duration?: unknown;
  scriptBrief?: unknown;
  logo?: unknown;
};

const REPLICATE_API_URL = "https://api.replicate.com/v1";
const replicateVersionCache = new Map<string, string>();

const GOAL_LABELS: Record<CorporateGoal, string> = {
  launch: "Lançamento de produto",
  institutional: "Institucional",
  events: "Eventos/Feiras",
  training: "Educação",
};

const GOAL_PROMPTS: Record<CorporateGoal, string> = {
  launch: "product launch with clear differentiation, features, and a direct call-to-action",
  institutional: "brand manifesto with credibility, mission, and social proof",
  events: "event invitation highlighting date, experience, and urgency",
  training: "educational flow with clear onboarding steps and confident guidance",
};

const SCENARIO_LABELS: Record<CorporateScenario, string> = {
  galaxy: "Neo Galaxy",
  space: "Orbit Workspace",
  studio: "Studio Vision",
  urban: "City Nova",
};

const SCENARIO_PROMPTS: Record<CorporateScenario, string> = {
  galaxy: "deep-space stage, luminous nebulae, elegant starfields, premium cosmic atmosphere",
  space: "floating orbital offices, holographic dashboards, collaborative futuristic environment",
  studio: "minimal corporate studio, controlled neutral light, polished surfaces, product focus",
  urban: "night megacity skyline, digital billboards, modern mobility, urban cinematic pulse",
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

function normalizeDuration(value: unknown) {
  const min = 30;
  const max = 120;
  const step = 5;
  const fallback = 45;
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  const base = Number.isFinite(numeric) ? numeric : fallback;
  const clamped = Math.min(Math.max(base, min), max);
  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
}

function normalizeGoal(value: unknown): CorporateGoal {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "institutional") return "institutional";
    if (trimmed === "events") return "events";
    if (trimmed === "training") return "training";
  }
  return "launch";
}

function normalizeScenario(value: unknown): CorporateScenario {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "space") return "space";
    if (trimmed === "studio") return "studio";
    if (trimmed === "urban") return "urban";
  }
  return "galaxy";
}

function normalizeReferenceImage(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return undefined;
}

function extractMessageText(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const chunk of content) {
    if (typeof chunk === "string") {
      parts.push(chunk);
      continue;
    }
    if (chunk && typeof chunk === "object" && "text" in chunk) {
      const text = (chunk as { text?: unknown }).text;
      if (typeof text === "string") {
        parts.push(text);
      }
    }
  }

  return parts.join("\n").trim();
}

function buildFallbackStoryboard({
  company,
  goalLabel,
  scenarioLabel,
  scriptBrief,
  duration,
}: {
  company: string;
  goalLabel: string;
  scenarioLabel: string;
  scriptBrief: string;
  duration: number;
}) {
  return [
    `Cena 1 (0-${Math.max(5, Math.round(duration * 0.2))}s): abertura da marca ${company} no cenário ${scenarioLabel}.`,
    `Cena 2: apresentação do contexto e dor principal do público-alvo.`,
    `Cena 3: demonstração da solução e diferenciais centrais para ${goalLabel.toLowerCase()}.`,
    `Cena 4: prova de valor com resultados, credenciais e confiança.`,
    `Cena 5: fechamento com CTA direto para conversão.`,
    `Resumo estratégico: ${scriptBrief}`,
  ].join("\n");
}

async function generateStoryboard({
  company,
  goalLabel,
  goalPrompt,
  scenarioLabel,
  scenarioPrompt,
  scriptBrief,
  duration,
  hasLogo,
}: {
  company: string;
  goalLabel: string;
  goalPrompt: string;
  scenarioLabel: string;
  scenarioPrompt: string;
  scriptBrief: string;
  duration: number;
  hasLogo: boolean;
}) {
  const fallback = buildFallbackStoryboard({
    company,
    goalLabel,
    scenarioLabel,
    scriptBrief,
    duration,
  });

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const completion = await openai.chat.completions.create({
      model: (process.env.OPENAI_CORPORATE_STORYBOARD_MODEL ?? "gpt-4o-mini").trim(),
      temperature: 0.8,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "Você é diretor criativo de filmes corporativos. Responda em pt-BR, com 5 cenas numeradas e CTA final. Sem markdown.",
        },
        {
          role: "user",
          content: [
            `Empresa: ${company}`,
            `Objetivo: ${goalLabel} (${goalPrompt})`,
            `Cenário visual: ${scenarioLabel} (${scenarioPrompt})`,
            `Duração total: ${duration} segundos`,
            `Briefing: ${scriptBrief}`,
            `Logo enviado: ${hasLogo ? "sim" : "não"}`,
            "Crie storyboard com narrativa clara, ritmo comercial e instruções de câmera.",
          ].join("\n"),
        },
      ],
    });

    const text = extractMessageText(completion.choices?.[0]?.message?.content);
    return text || fallback;
  } catch (error) {
    console.error("[generate-corporate-video] storyboard fallback:", error);
    return fallback;
  }
}

function buildCorporateVideoPrompt({
  company,
  goalPrompt,
  scenarioPrompt,
  scriptBrief,
  storyboard,
  duration,
  hasLogo,
}: {
  company: string;
  goalPrompt: string;
  scenarioPrompt: string;
  scriptBrief: string;
  storyboard: string;
  duration: number;
  hasLogo: boolean;
}) {
  const basePrompt = [
    `Corporate brand film for ${company}.`,
    `Business objective: ${goalPrompt}.`,
    `Visual world: ${scenarioPrompt}.`,
    `Target length: ${duration} seconds.`,
    `Creative brief: ${scriptBrief}.`,
    hasLogo
      ? "Integrate the company logo in elegant transitions and end-card."
      : "Use typographic branding placeholders with premium corporate style.",
    "Cinematic shots, smooth camera motion, controlled pacing, realistic lighting, polished motion graphics.",
    "Galaxy-inspired aesthetics with professional tone, credible executives, and clear value proposition.",
    `Storyboard guidance: ${storyboard.replace(/\s+/g, " ").slice(0, 1800)}.`,
  ];

  return basePrompt.join(" ");
}

function buildProviderSettings(): ProviderSettings[] {
  return [
    {
      key: "corporate",
      label: "Corporate Primary",
      model: process.env.REPLICATE_CORPORATE_VIDEO_MODEL,
      version: process.env.REPLICATE_CORPORATE_VIDEO_MODEL_VERSION,
      token: process.env.REPLICATE_CORPORATE_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 45,
      buildInput: ({ prompt, duration, referenceImage }) => ({
        prompt: `${prompt} High-end corporate campaign, premium finish.`,
        aspect_ratio: "16:9",
        duration,
        video_length: duration,
        resolution: "1080p",
        image: referenceImage || undefined,
      }),
    },
    {
      key: "merse",
      label: "Merse AI",
      model: process.env.REPLICATE_MERSE_VIDEO_MODEL ?? process.env.REPLICATE_MERSE_MODEL,
      version: process.env.REPLICATE_MERSE_VIDEO_MODEL_VERSION ?? process.env.REPLICATE_MERSE_MODEL_VERSION,
      token: process.env.REPLICATE_MERSE_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 40,
      buildInput: ({ prompt, duration, referenceImage }) => ({
        prompt: `${prompt} Official Merse identity, cosmic particles, brand-grade transitions.`,
        aspect_ratio: "16:9",
        duration,
        image: referenceImage || undefined,
      }),
    },
    {
      key: "veo",
      label: "Veo",
      model: process.env.REPLICATE_VEO_MODEL ?? "google/veo-3",
      version: process.env.REPLICATE_VEO_MODEL_VERSION,
      token: process.env.REPLICATE_VEO_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 3000,
      maxAttempts: 45,
      buildInput: ({ prompt, duration, referenceImage }) => ({
        prompt: `${prompt} Cinematic realism, consistent motion and polished edits.`,
        aspect_ratio: "16:9",
        duration,
        video_length: duration,
        resolution: "1080p",
        image: referenceImage || undefined,
      }),
    },
    {
      key: "wan",
      label: "Wan",
      model: process.env.REPLICATE_WAN_VIDEO_MODEL ?? "wan-video/wan-2.6-t2v",
      version: process.env.REPLICATE_WAN_VIDEO_MODEL_VERSION,
      token: process.env.REPLICATE_WAN_VIDEO_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 40,
      buildInput: ({ prompt, duration, referenceImage }) => ({
        prompt: `${prompt} Stable camera path, elegant transitions, branded narrative arc.`,
        aspect_ratio: "16:9",
        duration,
        image: referenceImage || undefined,
      }),
    },
    {
      key: "kling",
      label: "Kling",
      model: process.env.REPLICATE_KLING_MODEL ?? "kwaivgi/kling-v2.5-turbo-pro",
      version: process.env.REPLICATE_KLING_MODEL_VERSION,
      token: process.env.REPLICATE_KLING_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 40,
      buildInput: ({ prompt, duration, referenceImage }) => ({
        prompt: `${prompt} Smooth movement, high detail, cinematic corporate look.`,
        aspect_ratio: "16:9",
        duration,
        image: referenceImage || undefined,
      }),
    },
    {
      key: "sora",
      label: "Sora",
      model: process.env.REPLICATE_SORA_MODEL ?? "openai/sora",
      version: process.env.REPLICATE_SORA_MODEL_VERSION,
      token: process.env.REPLICATE_API_TOKEN,
      pollInterval: 3000,
      maxAttempts: 45,
      buildInput: ({ prompt, duration, referenceImage }) => ({
        prompt: `${prompt} Coherent physics, narrative pacing and premium corporate composition.`,
        aspect_ratio: "16:9",
        duration,
        image: referenceImage || undefined,
      }),
    },
  ];
}

async function resolveReplicateVersion(token: string, model: string) {
  const response = await fetch(`${REPLICATE_API_URL}/models/${model}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "Não foi possível descobrir a versão do modelo na Replicate.";
    throw new Error(message);
  }

  const version = json?.latest_version?.id;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error(`Modelo ${model} sem latest_version.`);
  }

  return version.trim();
}

async function ensureReplicateVersion(token: string, model: string, version?: string) {
  if (typeof version === "string" && version.trim()) {
    const trimmed = version.trim();
    replicateVersionCache.set(model, trimmed);
    return trimmed;
  }

  const cached = replicateVersionCache.get(model);
  if (cached) {
    return cached;
  }

  const discovered = await resolveReplicateVersion(token, model);
  replicateVersionCache.set(model, discovered);
  return discovered;
}

async function runReplicatePrediction({
  token,
  version,
  input,
  pollInterval,
  maxAttempts,
}: {
  token: string;
  version: string;
  input: Record<string, unknown>;
  pollInterval: number;
  maxAttempts: number;
}) {
  const startResponse = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ version, input }),
  });

  const startData = (await startResponse.json().catch(() => null)) as PredictionStatus | null;

  if (!startResponse.ok || !startData) {
    const message =
      typeof startData?.error?.message === "string"
        ? startData.error.message
        : `Falha ao iniciar predição (status ${startResponse.status}).`;
    throw new Error(message);
  }

  const predictionId = startData.id;
  if (!predictionId) {
    throw new Error("A Replicate não retornou o id da predição.");
  }

  let current = startData;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!["starting", "processing", "pending"].includes(current.status ?? "")) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    current = (await statusResponse.json().catch(() => ({}))) as PredictionStatus;

    if (!statusResponse.ok) {
      const message =
        typeof current?.error?.message === "string"
          ? current.error.message
          : "Falha ao consultar status da predição.";
      throw new Error(message);
    }

    if (current.status === "failed" || current.status === "canceled") {
      const message =
        typeof current?.error?.message === "string"
          ? current.error.message
          : "A geração falhou na Replicate.";
      const details =
        typeof current?.error?.details === "string" ? ` ${current.error.details}` : "";
      throw new Error(`${message}${details}`);
    }
  }

  if (current.status !== "succeeded") {
    throw new Error("Tempo esgotado aguardando a geração finalizar.");
  }

  return current;
}

function walkPayload(
  payload: unknown,
  visitor: (value: unknown, key?: string) => void,
  seen: Set<unknown>,
  key?: string,
) {
  if (payload === null || payload === undefined) return;

  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    visitor(payload, key);
    return;
  }

  if (typeof payload !== "object" || seen.has(payload)) return;
  seen.add(payload);

  if (Array.isArray(payload)) {
    payload.forEach((item) => walkPayload(item, visitor, seen, key));
    return;
  }

  for (const [childKey, childValue] of Object.entries(payload)) {
    walkPayload(childValue, visitor, seen, childKey);
  }
}

function collectMedia(payload: unknown) {
  const videos: string[] = [];
  const covers: string[] = [];
  let duration: number | undefined;

  walkPayload(
    payload,
    (value, key) => {
      if (typeof value === "string") {
        if (value.startsWith("http")) {
          const normalizedKey = key?.toLowerCase() ?? "";
          if (/\.(mp4|mov|webm|gif)$/i.test(value) || normalizedKey.includes("video")) {
            videos.push(value);
          } else if (
            normalizedKey.includes("cover") ||
            normalizedKey.includes("thumb") ||
            normalizedKey.includes("poster")
          ) {
            covers.push(value);
          }
        } else if (value.startsWith("data:") && value.includes("video")) {
          videos.push(value);
        }
      } else if (typeof value === "number" && Number.isFinite(value)) {
        const normalizedKey = key?.toLowerCase() ?? "";
        if (
          ["duration", "video_duration", "length", "seconds"].includes(normalizedKey) &&
          duration === undefined
        ) {
          duration = value;
        }
      }
    },
    new Set(),
  );

  return { videos, covers, duration };
}

async function generateVideoWithFallback(payload: ProviderInput) {
  const providers = buildProviderSettings();
  const failures: string[] = [];

  for (const provider of providers) {
    const model = provider.model?.trim();
    const token = provider.token?.trim();
    if (!model) continue;
    if (!token) {
      failures.push(`${provider.label}: token ausente no .env.local`);
      continue;
    }

    try {
      const version = await ensureReplicateVersion(token, model, provider.version);
      const prediction = await runReplicatePrediction({
        token,
        version,
        input: provider.buildInput(payload),
        pollInterval: provider.pollInterval,
        maxAttempts: provider.maxAttempts,
      });

      const { videos, covers, duration } = collectMedia(prediction.output);
      if (!videos.length) {
        throw new Error("sem URL de vídeo no output");
      }

      return {
        videoUrl: videos[0],
        cover: covers[0],
        duration: duration ?? payload.duration,
        provider: provider.key,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      failures.push(`${provider.label}: ${message}`);
      console.error(`[generate-corporate-video] provider ${provider.label} failed:`, error);
    }
  }

  const details = failures.slice(0, 6).join(" | ");
  throw new Error(
    details
      ? `Nenhum provedor de vídeo respondeu com sucesso. ${details}`
      : "Nenhum provedor de vídeo respondeu com sucesso.",
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const body = (req.body ?? {}) as BodyPayload;
  const company = sanitizeText(body.company, 80);
  const scriptBrief = sanitizeText(body.scriptBrief, 1200);

  if (!company) {
    return res.status(400).json({ error: "Informe o nome da empresa." });
  }

  if (!scriptBrief) {
    return res.status(400).json({ error: "Informe o briefing para gerar o vídeo corporativo." });
  }

  const goal = normalizeGoal(body.goal);
  const scenario = normalizeScenario(body.scenario);
  const duration = normalizeDuration(body.duration);
  const referenceImage = normalizeReferenceImage(body.logo);

  const goalLabel = GOAL_LABELS[goal];
  const goalPrompt = GOAL_PROMPTS[goal];
  const scenarioLabel = SCENARIO_LABELS[scenario];
  const scenarioPrompt = SCENARIO_PROMPTS[scenario];

  try {
    const storyboard = await generateStoryboard({
      company,
      goalLabel,
      goalPrompt,
      scenarioLabel,
      scenarioPrompt,
      scriptBrief,
      duration,
      hasLogo: Boolean(referenceImage),
    });

    const prompt = buildCorporateVideoPrompt({
      company,
      goalPrompt,
      scenarioPrompt,
      scriptBrief,
      storyboard,
      duration,
      hasLogo: Boolean(referenceImage),
    });

    const generated = await generateVideoWithFallback({
      prompt,
      duration,
      referenceImage,
    });

    return res.status(200).json({
      videoUrl: generated.videoUrl,
      cover: generated.cover,
      duration: generated.duration,
      storyboard,
      provider: generated.provider,
    });
  } catch (error) {
    console.error("[generate-corporate-video] error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o vídeo corporativo agora.";
    return res.status(500).json({
      error: message,
    });
  }
}
