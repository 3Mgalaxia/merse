import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);

type SuccessResponse = {
  videoUrl: string;
  cover?: string;
  duration: number;
  storyboard: string;
  provider: string;
  merged?: boolean;
  mergeError?: string;
  segmentCount?: number;
  segments?: Array<{
    index: number;
    duration: number;
    videoUrl: string;
    cover?: string;
    provider: string;
  }>;
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

type ProviderKey = "corporate" | "merse" | "veo" | "wan" | "kling" | "sora";

type ProviderSettings = {
  key: ProviderKey;
  label: string;
  model?: string;
  version?: string;
  token?: string;
  pollInterval: number;
  maxAttempts: number;
  durationRange: {
    min: number;
    max: number;
    fallback: number;
  };
  allowedDurations?: number[];
  buildInput: (payload: ProviderInput) => Record<string, unknown>;
};

type ResolvedProviderSettings = Omit<ProviderSettings, "model" | "token"> & {
  model: string;
  token: string;
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
  provider?: unknown;
};

type WanCampaignCache = {
  version: 1;
  key: string;
  createdAt: number;
  updatedAt: number;
  segmentDurations: number[];
  segmentPrompts: string[];
  segments: Array<{
    index: number;
    duration: number;
    videoUrl: string;
    cover?: string;
    provider: string;
  }>;
  pendingPredictions?: Array<{
    index: number;
    duration: number;
    provider: string;
    predictionId: string;
    inputHash: string;
    updatedAt: number;
  }>;
  mergedUrl?: string;
};

class PredictionTimeoutError extends Error {
  predictionId: string;
  inputHash?: string;

  constructor(
    predictionId: string,
    message = "Tempo esgotado aguardando a geração finalizar.",
    inputHash?: string,
  ) {
    super(message);
    this.name = "PredictionTimeoutError";
    this.predictionId = predictionId;
    this.inputHash = inputHash;
  }
}

function isPredictionTimeoutError(error: unknown): error is PredictionTimeoutError {
  return error instanceof PredictionTimeoutError;
}

const REPLICATE_API_URL = "https://api.replicate.com/v1";
const replicateVersionCache = new Map<string, string>();
const WAN_CACHE_DIR = path.join(process.cwd(), ".tmp-local-runtime", "wan-campaign-cache");

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

function normalizeProvider(value: unknown): ProviderKey | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "corporate") return "corporate";
  if (normalized === "merse") return "merse";
  if (normalized === "veo") return "veo";
  if (normalized === "wan") return "wan";
  if (normalized === "kling") return "kling";
  if (normalized === "sora") return "sora";
  return undefined;
}

function hashString(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function hashPredictionInput(input: Record<string, unknown>) {
  return hashString(JSON.stringify(input));
}

function buildCampaignCacheKey(params: {
  company: string;
  goal: CorporateGoal;
  scenario: CorporateScenario;
  duration: number;
  scriptBrief: string;
  logo?: string;
}) {
  const { company, goal, scenario, duration, scriptBrief, logo } = params;
  const logoHash = logo ? hashString(logo).slice(0, 12) : "no-logo";
  return hashString(
    JSON.stringify({
      company: company.toLowerCase(),
      goal,
      scenario,
      duration,
      scriptBrief: scriptBrief.trim().toLowerCase(),
      logoHash,
      model: "wan-video/wan-2.6-t2v",
      version: 1,
    }),
  );
}

function getCampaignCachePath(key: string) {
  return path.join(WAN_CACHE_DIR, `${key}.json`);
}

async function loadCampaignCache(key: string): Promise<WanCampaignCache | null> {
  try {
    const filePath = getCampaignCachePath(key);
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as WanCampaignCache;
    if (!parsed || parsed.version !== 1 || parsed.key !== key) return null;
    return {
      ...parsed,
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
      segmentDurations: Array.isArray(parsed.segmentDurations) ? parsed.segmentDurations : [],
      segmentPrompts: Array.isArray(parsed.segmentPrompts) ? parsed.segmentPrompts : [],
      pendingPredictions: Array.isArray(parsed.pendingPredictions)
        ? parsed.pendingPredictions.filter(
            (entry) =>
              entry &&
              Number.isFinite(entry.index) &&
              typeof entry.predictionId === "string" &&
              typeof entry.inputHash === "string",
          )
        : [],
    };
  } catch {
    return null;
  }
}

async function saveCampaignCache(cache: WanCampaignCache) {
  await fs.mkdir(WAN_CACHE_DIR, { recursive: true });
  await fs.writeFile(getCampaignCachePath(cache.key), JSON.stringify(cache, null, 2), "utf-8");
}

function splitDurationIntoSegments(totalDuration: number, targetPerSegment = 15) {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return [15];
  const roundedTotal = Math.max(5, Math.round(totalDuration));
  const segments: number[] = [];
  let remaining = roundedTotal;

  while (remaining > 0) {
    if (remaining >= targetPerSegment) {
      segments.push(targetPerSegment);
      remaining -= targetPerSegment;
      continue;
    }
    if (remaining >= 10) {
      segments.push(10);
      remaining -= 10;
      continue;
    }
    if (remaining >= 5) {
      segments.push(5);
      remaining -= 5;
      continue;
    }

    // Defensive fallback for non-step values (1..4 seconds leftover).
    if (!segments.length) {
      segments.push(5);
      remaining = 0;
      continue;
    }

    const last = segments.pop() ?? 5;
    const adjusted = last + remaining;
    if (adjusted <= 15 && [5, 10, 15].includes(adjusted)) {
      segments.push(adjusted);
    } else if (adjusted <= 10) {
      segments.push(5, 5);
    } else {
      segments.push(10, 5);
    }
    remaining = 0;
  }

  return segments;
}

function clampDurationForProvider(provider: ResolvedProviderSettings, requestedDuration: number) {
  const base = Math.max(provider.durationRange.min, Math.min(requestedDuration, provider.durationRange.max));
  if (Array.isArray(provider.allowedDurations) && provider.allowedDurations.length > 0) {
    const allowed = Array.from(
      new Set(provider.allowedDurations.filter((entry) => Number.isFinite(entry))),
    ).sort((a, b) => a - b);
    if (allowed.length) {
      return allowed.reduce((closest, current) => {
        return Math.abs(current - base) < Math.abs(closest - base) ? current : closest;
      }, allowed[0]);
    }
  }
  return base;
}

function providerSupportsDuration(provider: ResolvedProviderSettings, requestedDuration: number) {
  if (Array.isArray(provider.allowedDurations) && provider.allowedDurations.length > 0) {
    return provider.allowedDurations.includes(requestedDuration);
  }
  return (
    requestedDuration >= provider.durationRange.min &&
    requestedDuration <= provider.durationRange.max
  );
}

function getSegmentTheme(total: number, index: number) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  if (isFirst) {
    return "Tema 1: abertura da marca, atmosfera premium e posicionamento visual forte.";
  }
  if (isLast) {
    return "Tema 3: fechamento com prova de valor, confiança e CTA final.";
  }
  return "Tema 2: produto/serviço em ação, benefícios claros e narrativa de transformação.";
}

function buildSegmentPrompt(
  basePrompt: string,
  params: { index: number; total: number; duration: number; totalDuration: number },
) {
  const { index, total, duration, totalDuration } = params;
  const position = index + 1;
  const theme = getSegmentTheme(total, index);

  const continuityLine =
    position === 1
      ? "Start strong with cinematic establishing shots and brand identity."
      : position === total
      ? "Continue seamlessly and end with clear CTA and polished brand end-card."
      : "Continue seamlessly from previous segment with consistent camera, lighting and cast.";

  return [
    basePrompt,
    `Segment ${position}/${total}.`,
    theme,
    `Segment length: ${duration} seconds. Full campaign length: ${totalDuration} seconds.`,
    continuityLine,
    "No hard reset between segments. Keep narrative progression coherent.",
  ].join(" ");
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

function parsePromptListFromModel(raw: string, expectedLength: number) {
  const base = raw.trim();
  if (!base) return null;

  const fenced = base.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? base;
  try {
    const parsed = JSON.parse(fenced) as unknown;
    if (!Array.isArray(parsed)) return null;
    const normalized = parsed
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
    if (normalized.length !== expectedLength) return null;
    return normalized;
  } catch {
    return null;
  }
}

async function generateSegmentPrompts({
  company,
  goalLabel,
  scenarioLabel,
  scriptBrief,
  storyboard,
  basePrompt,
  segmentDurations,
}: {
  company: string;
  goalLabel: string;
  scenarioLabel: string;
  scriptBrief: string;
  storyboard: string;
  basePrompt: string;
  segmentDurations: number[];
}) {
  const fallback = segmentDurations.map((duration, index) =>
    buildSegmentPrompt(basePrompt, {
      index,
      total: segmentDurations.length,
      duration,
      totalDuration: segmentDurations.reduce((sum, value) => sum + value, 0),
    }),
  );

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const segmentLayout = segmentDurations.map((value, index) => `segmento ${index + 1}: ${value}s`).join(" | ");
    const response = await openai.chat.completions.create({
      model: (process.env.OPENAI_CORPORATE_SEGMENT_MODEL ?? "gpt-4o-mini").trim(),
      temperature: 0.75,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "Você é roteirista de prompts para Wan 2.6 T2V. Responda SOMENTE com JSON array de strings, sem markdown.",
        },
        {
          role: "user",
          content: [
            `Empresa: ${company}`,
            `Objetivo: ${goalLabel}`,
            `Cenário: ${scenarioLabel}`,
            `Brief: ${scriptBrief}`,
            `Storyboard: ${storyboard}`,
            `Durações: ${segmentLayout}`,
            "Crie um prompt por segmento, com continuidade narrativa entre eles.",
            "Estrutura desejada: abertura, desenvolvimento, fechamento/CTA.",
            "Cada prompt deve citar explicitamente a duração daquele segmento.",
            "Retorne apenas JSON array com o mesmo número de segmentos.",
          ].join("\n"),
        },
      ],
    });

    const text = extractMessageText(response.choices?.[0]?.message?.content);
    const parsed = parsePromptListFromModel(text, segmentDurations.length);
    if (!parsed) return fallback;
    return parsed;
  } catch (error) {
    console.error("[generate-corporate-video] segment prompts fallback:", error);
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
      durationRange: { min: 4, max: 10, fallback: 10 },
      allowedDurations: [5, 10],
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
      model:
        process.env.REPLICATE_MERSE_VIDEO_MODEL ??
        process.env.REPLICATE_MERSE_MODEL ??
        "mersee/merse-ai-1-0",
      version: process.env.REPLICATE_MERSE_VIDEO_MODEL_VERSION ?? process.env.REPLICATE_MERSE_MODEL_VERSION,
      token: process.env.REPLICATE_MERSE_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 2500,
      maxAttempts: 40,
      durationRange: { min: 4, max: 20, fallback: 12 },
      allowedDurations: [5, 10, 15, 20],
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
      pollInterval: 2500,
      maxAttempts: 30,
      durationRange: { min: 4, max: 8, fallback: 6 },
      allowedDurations: [4, 6, 8],
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
      pollInterval: 2000,
      maxAttempts: 240,
      durationRange: { min: 4, max: 16, fallback: 10 },
      allowedDurations: [5, 10, 15],
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
      durationRange: { min: 4, max: 16, fallback: 10 },
      allowedDurations: [5, 10],
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
      token: process.env.REPLICATE_SORA_API_TOKEN ?? process.env.REPLICATE_API_TOKEN,
      pollInterval: 3000,
      maxAttempts: 45,
      durationRange: { min: 6, max: 10, fallback: 10 },
      allowedDurations: [5, 10],
      buildInput: ({ prompt, duration, referenceImage }) => ({
        prompt: `${prompt} Coherent physics, narrative pacing and premium corporate composition.`,
        aspect_ratio: "16:9",
        duration,
        image: referenceImage || undefined,
      }),
    },
  ];
}

function resolveAvailableProviders(preferredProvider?: ProviderKey) {
  const providers = buildProviderSettings();
  const unavailable: string[] = [];
  const available: ResolvedProviderSettings[] = [];

  for (const provider of providers) {
    const model = provider.model?.trim();
    const token = provider.token?.trim();
    if (!model) continue;
    if (!token) {
      unavailable.push(`${provider.label}: token ausente no .env.local`);
      continue;
    }

    available.push({
      ...provider,
      model,
      token,
    });
  }

  if (preferredProvider) {
    const preferredIndex = available.findIndex((provider) => provider.key === preferredProvider);
    if (preferredIndex > 0) {
      const [preferred] = available.splice(preferredIndex, 1);
      available.unshift(preferred);
    }
  }

  return { available, unavailable };
}

function shouldRetry422(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes("status 422") ||
    normalized.includes("unprocessable") ||
    normalized.includes("invalid input")
  );
}

function buildRetryInputsFrom422(input: Record<string, unknown>) {
  const retries: Record<string, unknown>[] = [];

  if ("image" in input && input.image) {
    const withoutImage = { ...input };
    delete withoutImage.image;
    retries.push(withoutImage);
  }

  const minimal: Record<string, unknown> = {};
  if (typeof input.prompt === "string") minimal.prompt = input.prompt;
  if (typeof input.aspect_ratio === "string") minimal.aspect_ratio = input.aspect_ratio;

  const durationCandidate =
    typeof input.duration === "number" && Number.isFinite(input.duration)
      ? input.duration
      : typeof input.video_length === "number" && Number.isFinite(input.video_length)
      ? input.video_length
      : undefined;
  if (typeof durationCandidate === "number") {
    minimal.duration = durationCandidate;
    minimal.video_length = durationCandidate;
  }

  if (typeof input.resolution === "string" && input.resolution.trim()) {
    minimal.resolution = input.resolution;
  }

  if (Object.keys(minimal).length >= 2) {
    retries.push(minimal);
  }

  const unique: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const retryInput of retries) {
    const serialized = JSON.stringify(retryInput);
    if (seen.has(serialized)) continue;
    seen.add(serialized);
    unique.push(retryInput);
  }

  return unique;
}

async function downloadVideoFile(url: string, filePath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar segmento (${response.status} ${response.statusText}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

async function mergeVideosWithFfmpeg(videoUrls: string[]) {
  if (videoUrls.length <= 1) {
    return {
      merged: false,
      mergedUrl: videoUrls[0] ?? "",
      mergeError: videoUrls.length ? undefined : "Sem vídeos para mesclar.",
    };
  }

  const mergeId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `mersee-corporate-${mergeId}`);
  const publicDir = path.join(process.cwd(), "public", "generated-corporate");
  const outputName = `corporate-${Date.now()}-${mergeId.slice(0, 8)}.mp4`;
  const outputPath = path.join(publicDir, outputName);
  const listPath = path.join(tempDir, "segments.txt");

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(publicDir, { recursive: true });

    const localSegments: string[] = [];
    for (let index = 0; index < videoUrls.length; index += 1) {
      const segmentPath = path.join(tempDir, `segment-${index + 1}.mp4`);
      // eslint-disable-next-line no-await-in-loop
      await downloadVideoFile(videoUrls[index], segmentPath);
      localSegments.push(segmentPath);
    }

    const listContent = localSegments.map((segment) => `file '${segment.replace(/'/g, "'\\''")}'`).join("\n");
    await fs.writeFile(listPath, `${listContent}\n`, "utf-8");

    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c",
        "copy",
        outputPath,
      ]);
    } catch {
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    }

    return {
      merged: true,
      mergedUrl: `/generated-corporate/${outputName}`,
      mergeError: undefined as string | undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao concatenar vídeos.";
    return {
      merged: false,
      mergedUrl: videoUrls[0] ?? "",
      mergeError: message,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => void 0);
  }
}

async function mergedOutputExists(mergedUrl?: string) {
  if (!mergedUrl || !mergedUrl.startsWith("/generated-corporate/")) return false;
  const absolute = path.join(process.cwd(), "public", mergedUrl.replace(/^\//, ""));
  try {
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

function upsertCachedSegment(
  current: WanCampaignCache["segments"],
  next: WanCampaignCache["segments"][number],
) {
  const existing = current.findIndex((entry) => entry.index === next.index);
  if (existing < 0) {
    return [...current, next].sort((a, b) => a.index - b.index);
  }
  const updated = [...current];
  updated[existing] = next;
  return updated.sort((a, b) => a.index - b.index);
}

function upsertPendingPrediction(
  current: NonNullable<WanCampaignCache["pendingPredictions"]>,
  next: NonNullable<WanCampaignCache["pendingPredictions"]>[number],
) {
  const existing = current.findIndex((entry) => entry.index === next.index);
  if (existing < 0) {
    return [...current, next].sort((a, b) => a.index - b.index);
  }
  const updated = [...current];
  updated[existing] = next;
  return updated.sort((a, b) => a.index - b.index);
}

function removePendingPrediction(
  current: NonNullable<WanCampaignCache["pendingPredictions"]>,
  index: number,
) {
  return current.filter((entry) => entry.index !== index);
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
  existingPredictionId,
}: {
  token: string;
  version: string;
  input: Record<string, unknown>;
  pollInterval: number;
  maxAttempts: number;
  existingPredictionId?: string;
}) {
  const fetchPredictionStatus = async (predictionId: string) => {
    const statusResponse = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const statusData = (await statusResponse.json().catch(() => ({}))) as PredictionStatus;
    if (!statusResponse.ok) {
      if (statusResponse.status === 404) {
        throw new Error(`Predição ${predictionId} não encontrada na Replicate.`);
      }
      const message =
        typeof statusData?.error?.message === "string"
          ? statusData.error.message
          : typeof (statusData as { detail?: unknown }).detail === "string"
          ? ((statusData as { detail?: string }).detail ?? "").trim()
          : "Falha ao consultar status da predição.";
      throw new Error(message);
    }
    return statusData;
  };

  let predictionId = existingPredictionId?.trim();
  let current: PredictionStatus;

  if (predictionId) {
    current = await fetchPredictionStatus(predictionId);
  } else {
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
          : typeof (startData as { detail?: unknown } | null)?.detail === "string"
          ? ((startData as { detail?: string }).detail ?? "").trim()
          : typeof (startData as { error?: unknown } | null)?.error === "string"
          ? ((startData as { error?: string }).error ?? "").trim()
          : `Falha ao iniciar predição (status ${startResponse.status}).`;
      const details =
        typeof startData?.error?.details === "string" && startData.error.details.trim()
          ? ` ${startData.error.details.trim()}`
          : (startData as { error?: unknown } | null)?.error &&
            typeof (startData as { error?: unknown }).error === "object"
          ? ` ${JSON.stringify((startData as { error?: unknown }).error)}`
          : "";
      console.error("[generate-corporate-video] prediction creation failed payload:", startData);
      throw new Error(`${message}${details}`);
    }

    predictionId = startData.id;
    if (!predictionId) {
      throw new Error("A Replicate não retornou o id da predição.");
    }

    current = startData;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!["starting", "processing", "pending"].includes(current.status ?? "")) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    current = await fetchPredictionStatus(predictionId);

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
    throw new PredictionTimeoutError(predictionId, "Tempo esgotado aguardando a geração finalizar.");
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

async function generateWanSegmentWithResume({
  provider,
  payload,
  existingPredictionId,
}: {
  provider: ResolvedProviderSettings;
  payload: ProviderInput;
  existingPredictionId?: string;
}) {
  const providerDuration = clampDurationForProvider(provider, payload.duration);
  const version = await ensureReplicateVersion(provider.token, provider.model, provider.version);
  const baseInput = provider.buildInput({
    ...payload,
    duration: providerDuration,
  });

  const runWithInput = async (input: Record<string, unknown>, predictionId?: string) => {
    let prediction: PredictionStatus;
    try {
      prediction = await runReplicatePrediction({
        token: provider.token,
        version,
        input,
        pollInterval: provider.pollInterval,
        maxAttempts: provider.maxAttempts,
        existingPredictionId: predictionId,
      });
    } catch (error) {
      if (isPredictionTimeoutError(error)) {
        throw new PredictionTimeoutError(error.predictionId, error.message, hashPredictionInput(input));
      }
      throw error;
    }

    const { videos, covers, duration: outputDuration } = collectMedia(prediction.output);
    if (!videos.length) {
      throw new Error("sem URL de vídeo no output");
    }

    return {
      videoUrl: videos[0],
      cover: covers[0],
      duration: outputDuration ?? providerDuration,
      provider: provider.key,
      inputHash: hashPredictionInput(input),
    };
  };

  if (existingPredictionId) {
    try {
      return await runWithInput(baseInput, existingPredictionId);
    } catch (error) {
      if (isPredictionTimeoutError(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const shouldStartFresh =
        message.includes("não encontrada") ||
        message.includes("not found") ||
        message.includes("404");
      if (!shouldStartFresh) {
        throw error;
      }
    }
  }

  try {
    return await runWithInput(baseInput);
  } catch (initialError) {
    if (isPredictionTimeoutError(initialError)) {
      throw initialError;
    }

    const initialMessage =
      initialError instanceof Error ? initialError.message : "erro desconhecido";
    if (!shouldRetry422(initialMessage)) {
      throw initialError;
    }

    const retryInputs = buildRetryInputsFrom422(baseInput);
    let lastRetryError: unknown = initialError;
    for (const retryInput of retryInputs) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await runWithInput(retryInput);
      } catch (retryError) {
        if (isPredictionTimeoutError(retryError)) {
          throw retryError;
        }
        lastRetryError = retryError;
      }
    }

    throw lastRetryError;
  }
}

async function generateVideoInSegments(params: {
  prompt: string;
  duration: number;
  referenceImage?: string;
  segmentDurations?: number[];
  segmentPrompts?: string[];
  cacheKey: string;
}) {
  const { prompt, duration, referenceImage, segmentPrompts, cacheKey } = params;
  const { available, unavailable } = resolveAvailableProviders("wan");
  const wanProvider = available.find((provider) => provider.key === "wan");
  if (!wanProvider) {
    const reason = unavailable.join(" | ");
    throw new Error(
      reason
        ? `Wan indisponível no .env.local. ${reason}`
        : "Wan indisponível no .env.local.",
    );
  }

  const segmentDurations =
    params.segmentDurations && params.segmentDurations.length
      ? params.segmentDurations
      : splitDurationIntoSegments(duration, 15);

  let cache =
    (await loadCampaignCache(cacheKey)) ??
    ({
      version: 1,
      key: cacheKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      segmentDurations,
      segmentPrompts: segmentPrompts ?? [],
      segments: [],
      pendingPredictions: [],
    } satisfies WanCampaignCache);

  if (cache.segmentDurations.join(",") !== segmentDurations.join(",")) {
    cache = {
      version: 1,
      key: cacheKey,
      createdAt: cache.createdAt || Date.now(),
      updatedAt: Date.now(),
      segmentDurations,
      segmentPrompts: segmentPrompts ?? [],
      segments: [],
      pendingPredictions: [],
    };
    await saveCampaignCache(cache);
  }

  const segments: Array<{
    index: number;
    duration: number;
    videoUrl: string;
    cover?: string;
    provider: string;
  }> = [];

  for (let index = 0; index < segmentDurations.length; index += 1) {
    const segmentIndex = index + 1;
    const cachedSegment = cache.segments.find((segment) => segment.index === index + 1 && Boolean(segment.videoUrl));
    if (cachedSegment) {
      segments.push(cachedSegment);
      cache.pendingPredictions = removePendingPrediction(cache.pendingPredictions ?? [], segmentIndex);
      continue;
    }

    const segmentDuration = segmentDurations[index];
    const segmentPrompt =
      segmentPrompts?.[index]?.trim() ||
      buildSegmentPrompt(prompt, {
        index,
        total: segmentDurations.length,
        duration: segmentDuration,
        totalDuration: duration,
      });
    const inputHash = hashPredictionInput(
      wanProvider.buildInput({
        prompt: segmentPrompt,
        duration: clampDurationForProvider(wanProvider, segmentDuration),
        referenceImage,
      }),
    );
    const currentPending = (cache.pendingPredictions ?? []).find(
      (entry) => entry.index === segmentIndex && entry.inputHash === inputHash,
    );

    let generated: Awaited<ReturnType<typeof generateWanSegmentWithResume>>;
    try {
      // eslint-disable-next-line no-await-in-loop
      generated = await generateWanSegmentWithResume(
        {
          provider: wanProvider,
          existingPredictionId: currentPending?.predictionId,
          payload: {
            prompt: segmentPrompt,
            duration: segmentDuration,
            referenceImage,
          },
        },
      );
    } catch (error) {
      if (isPredictionTimeoutError(error)) {
        const nextPending = {
          index: segmentIndex,
          duration: segmentDuration,
          provider: "wan",
          predictionId: error.predictionId,
          inputHash: error.inputHash ?? inputHash,
          updatedAt: Date.now(),
        };
        cache.pendingPredictions = upsertPendingPrediction(cache.pendingPredictions ?? [], nextPending);
        cache.updatedAt = Date.now();
        await saveCampaignCache(cache);
        throw new Error(
          `Wan: segmento ${segmentIndex}/${segmentDurations.length} ainda em processamento. Reenvie para retomar o mesmo job sem custo duplicado.`,
        );
      }
      const message = error instanceof Error ? error.message : "Falha ao gerar segmento.";
      throw new Error(`Wan: ${message}`);
    }

    const finalizedSegment = {
      index: segmentIndex,
      duration: generated.duration ?? segmentDuration,
      videoUrl: generated.videoUrl,
      cover: generated.cover,
      provider: generated.provider,
    };
    segments.push(finalizedSegment);
    cache.segments = upsertCachedSegment(cache.segments, finalizedSegment);
    cache.pendingPredictions = removePendingPrediction(cache.pendingPredictions ?? [], segmentIndex);
    cache.updatedAt = Date.now();
    await saveCampaignCache(cache);
  }

  const providerSummary = Array.from(new Set(segments.map((segment) => segment.provider))).join(",");
  let merged =
    cache.mergedUrl && (await mergedOutputExists(cache.mergedUrl))
      ? { merged: true, mergedUrl: cache.mergedUrl, mergeError: undefined as string | undefined }
      : await mergeVideosWithFfmpeg(segments.map((segment) => segment.videoUrl));

  if (merged.merged && merged.mergedUrl) {
    cache.mergedUrl = merged.mergedUrl;
    cache.pendingPredictions = [];
    cache.updatedAt = Date.now();
    await saveCampaignCache(cache);
  }

  return {
    videoUrl: merged.mergedUrl || segments[0]?.videoUrl || "",
    cover: segments[0]?.cover,
    duration: segments.reduce((sum, segment) => sum + segment.duration, 0),
    provider: providerSummary || "unknown",
    merged: merged.merged,
    mergeError: merged.mergeError,
    segments,
    segmentCount: segments.length,
  };
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
  const cacheKey = buildCampaignCacheKey({
    company,
    goal,
    scenario,
    duration,
    scriptBrief,
    logo: referenceImage,
  });

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

    const segmentDurations = splitDurationIntoSegments(duration, 15);
    const existingCache = await loadCampaignCache(cacheKey);
    const canReusePrompts =
      Boolean(existingCache) &&
      (existingCache?.segmentDurations.join(",") ?? "") === segmentDurations.join(",") &&
      Array.isArray(existingCache?.segmentPrompts) &&
      existingCache!.segmentPrompts.length === segmentDurations.length;

    const segmentPrompts = canReusePrompts
      ? existingCache!.segmentPrompts
      : await generateSegmentPrompts({
          company,
          goalLabel,
          scenarioLabel,
          scriptBrief,
          storyboard,
          basePrompt: prompt,
          segmentDurations,
        });

    if (!canReusePrompts) {
      const nextCache: WanCampaignCache = {
        version: 1,
        key: cacheKey,
        createdAt: existingCache?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        segmentDurations,
        segmentPrompts,
        segments:
          existingCache && (existingCache.segmentDurations.join(",") ?? "") === segmentDurations.join(",")
            ? existingCache.segments
            : [],
        pendingPredictions:
          existingCache && (existingCache.segmentDurations.join(",") ?? "") === segmentDurations.join(",")
            ? existingCache.pendingPredictions ?? []
            : [],
        mergedUrl:
          existingCache && (existingCache.segmentDurations.join(",") ?? "") === segmentDurations.join(",")
            ? existingCache.mergedUrl
            : undefined,
      };
      await saveCampaignCache(nextCache);
    }

    const generated = await generateVideoInSegments({
      prompt,
      duration,
      referenceImage,
      segmentDurations,
      segmentPrompts,
      cacheKey,
    });

    return res.status(200).json({
      videoUrl: generated.videoUrl,
      cover: generated.cover,
      duration: generated.duration,
      storyboard,
      provider: generated.provider,
      merged: generated.merged,
      mergeError: generated.mergeError,
      segments: generated.segments,
      segmentCount: generated.segmentCount,
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
