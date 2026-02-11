import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { logApiAction } from "@/lib/logger";
import { applyRateLimit } from "@/lib/rateLimit";

type VisualProvider = "auto" | "openai" | "replicate";
type TextProvider = "openai" | "fallback";
type ImageProvider = "openai" | "replicate" | "none";

type ArchetypePayload = {
  id: string;
  label: string;
  description: string;
  skills: string[];
};

type DraftPersona = {
  name: string;
  age: string;
  pronouns: string;
  archetype: ArchetypePayload;
  personality: string;
  appearance: string;
  origin: string;
  abilities: string[];
  energy: number;
  traits: string;
  summary: string;
  tagline: string;
  loreHook: string;
  tags: string[];
  referenceImage: string;
  visualProvider: VisualProvider;
};

type PersonaPayload = {
  name: string;
  age: string;
  pronouns: string;
  personality: string;
  appearance: string;
  origin: string;
  abilities: string[];
  energy: number;
  traits: string;
  summary: string;
  tagline: string;
  loreHook: string;
  tags: string[];
};

type PersonaWithPrompt = PersonaPayload & {
  imagePrompt: string;
};

type PredictionStatus = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; details?: string };
};

type SuccessResponse = {
  persona: PersonaPayload;
  portraitUrl?: string;
  providers: {
    text: TextProvider;
    image: ImageProvider;
  };
  warnings: string[];
  latencyMs: number;
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

const REPLICATE_API_URL = "https://api.replicate.com/v1";
const replicateVersionCache = new Map<string, string>();

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "24mb",
    },
  },
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeList(value: unknown, maxItems: number, maxLen: number) {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    const text = sanitizeText(item, maxLen);
    if (!text) continue;
    unique.add(text);
    if (unique.size >= maxItems) break;
  }
  return Array.from(unique);
}

function normalizeImageInput(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "";
}

function normalizeVisualProvider(value: unknown): VisualProvider {
  if (typeof value !== "string") return "auto";
  const normalized = value.trim().toLowerCase();
  if (normalized === "openai") return "openai";
  if (normalized === "replicate") return "replicate";
  return "auto";
}

function normalizeEnergy(value: unknown) {
  const fallback = 65;
  const raw = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function normalizeArchetype(value: unknown): ArchetypePayload {
  const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    id: sanitizeText(payload.id, 80) || "explorer",
    label: sanitizeText(payload.label, 120) || "Explorador Cosmico",
    description: sanitizeText(payload.description, 220),
    skills: sanitizeList(payload.skills, 8, 80),
  };
}

function extractJsonText(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw.trim();
}

function buildImagePrompt(persona: PersonaPayload, archetype: ArchetypePayload, hasReference: boolean) {
  const referenceNote = hasReference
    ? "keep resemblance to the reference face and preserve identity"
    : "invent a distinctive but believable face";

  return [
    "Cinematic sci-fi character portrait, single person, upper body, centered composition.",
    `Character name: ${persona.name}. Archetype: ${archetype.label}.`,
    `Appearance: ${persona.appearance}. Personality: ${persona.personality}.`,
    `Origin: ${persona.origin}. Traits: ${persona.traits}.`,
    `Energy level: ${persona.energy}%.`,
    `${referenceNote}.`,
    "Premium detail, realistic skin, subtle holographic garments, volumetric light, no text, no watermark.",
  ]
    .join(" ")
    .slice(0, 1500);
}

function fallbackPersona(draft: DraftPersona): PersonaWithPrompt {
  const baseAbilities =
    draft.abilities.length > 0
      ? draft.abilities
      : draft.archetype.skills.length > 0
      ? draft.archetype.skills.slice(0, 3)
      : ["Criatividade estrategica", "Pensamento visual", "Narrativa de marca"];

  const normalized: PersonaPayload = {
    name: draft.name || "Nova Persona",
    age: draft.age || "27",
    pronouns: draft.pronouns || "Ela/Dela",
    personality: draft.personality || "Curiosa, confiante e orientada a impacto visual.",
    appearance: draft.appearance || "Visual futurista com detalhes holograficos e acabamento premium.",
    origin: draft.origin || "Merse Prime",
    abilities: baseAbilities.slice(0, 6),
    energy: draft.energy,
    traits: draft.traits || "Observadora, colaborativa, foco em resultados.",
    summary:
      draft.summary ||
      "Persona criada para narrativas visuais Merse com foco em presenca, clareza e diferencial estetico.",
    tagline: draft.tagline || "Transforma ideias em experiencias visuais memoraveis.",
    loreHook:
      draft.loreHook ||
      "Recebeu uma missao para liderar campanhas intergalacticas e conectar marcas a novos universos.",
    tags: draft.tags.length > 0 ? draft.tags.slice(0, 6) : ["merse", "persona", "futurista"],
  };

  return {
    ...normalized,
    imagePrompt: buildImagePrompt(normalized, draft.archetype, Boolean(draft.referenceImage)),
  };
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });
}

async function generatePersonaWithOpenAI(draft: DraftPersona): Promise<PersonaWithPrompt> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  const model = (process.env.OPENAI_CHARACTER_MODEL ?? "gpt-4o-mini").trim() || "gpt-4o-mini";

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [
        "Voce e designer de personagens da Merse.",
        "Recebera um rascunho e deve refinar para um personagem consistente e pronto para producao.",
        "Retorne APENAS JSON valido sem markdown com as chaves:",
        "name, age, pronouns, personality, appearance, origin, abilities, energy, traits, summary, tagline, loreHook, tags, imagePrompt.",
        "abilities deve ter entre 3 e 6 itens objetivos.",
        "tags deve ter entre 3 e 6 termos curtos em minusculo.",
        "imagePrompt deve estar em ingles e pronto para geracao de retrato.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Nome: ${draft.name || "(vazio)"}`,
        `Idade: ${draft.age || "(vazio)"}`,
        `Pronomes: ${draft.pronouns || "(vazio)"}`,
        `Arquetipo: ${draft.archetype.label} (${draft.archetype.description || "sem descricao"})`,
        `Habilidades base do arquetipo: ${
          draft.archetype.skills.length > 0 ? draft.archetype.skills.join(", ") : "nenhuma"
        }`,
        `Personalidade: ${draft.personality || "(vazio)"}`,
        `Aparencia: ${draft.appearance || "(vazio)"}`,
        `Origem: ${draft.origin || "(vazio)"}`,
        `Tracos: ${draft.traits || "(vazio)"}`,
        `Habilidades atuais: ${draft.abilities.length > 0 ? draft.abilities.join(", ") : "nenhuma"}`,
        `Energia: ${draft.energy}%`,
        `Resumo atual: ${draft.summary || "(vazio)"}`,
        `Tagline atual: ${draft.tagline || "(vazio)"}`,
        `Lore hook atual: ${draft.loreHook || "(vazio)"}`,
        `Tags atuais: ${draft.tags.length > 0 ? draft.tags.join(", ") : "(vazio)"}`,
        `Existe imagem de referencia: ${draft.referenceImage ? "sim" : "nao"}`,
      ].join("\n"),
    },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.75,
    max_tokens: 1200,
  });

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("Resposta vazia na geracao de persona.");
  }

  const parsed = JSON.parse(extractJsonText(raw)) as Record<string, unknown>;
  const base = fallbackPersona(draft);

  const abilities = sanitizeList(parsed.abilities, 6, 80);
  const tags = sanitizeList(parsed.tags, 6, 36).map((item) => item.toLowerCase());

  const normalized: PersonaPayload = {
    name: sanitizeText(parsed.name, 80) || base.name,
    age: sanitizeText(parsed.age, 24) || base.age,
    pronouns: sanitizeText(parsed.pronouns, 32) || base.pronouns,
    personality: sanitizeText(parsed.personality, 360) || base.personality,
    appearance: sanitizeText(parsed.appearance, 420) || base.appearance,
    origin: sanitizeText(parsed.origin, 180) || base.origin,
    abilities: abilities.length > 0 ? abilities : base.abilities,
    energy: normalizeEnergy(parsed.energy ?? draft.energy),
    traits: sanitizeText(parsed.traits, 320) || base.traits,
    summary: sanitizeText(parsed.summary, 420) || base.summary,
    tagline: sanitizeText(parsed.tagline, 180) || base.tagline,
    loreHook: sanitizeText(parsed.loreHook, 320) || base.loreHook,
    tags: tags.length > 0 ? tags : base.tags,
  };

  const imagePrompt =
    sanitizeText(parsed.imagePrompt, 1500) || buildImagePrompt(normalized, draft.archetype, Boolean(draft.referenceImage));

  return {
    ...normalized,
    imagePrompt,
  };
}

async function generatePortraitWithOpenAI(imagePrompt: string, referenceImage: string) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  const model = (process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1").trim() || "gpt-image-1";
  const payload: OpenAI.ImageGenerateParams = {
    model,
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
    ...(referenceImage ? { image: referenceImage } : {}),
  };

  const response = await client.images.generate(payload);
  const first = response.data?.[0];
  if (first?.url && !first.url.toLowerCase().startsWith("data:")) {
    return first.url;
  }
  if (first?.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }
  throw new Error("OpenAI nao retornou retrato valido.");
}

function getReplicateConfig() {
  const token =
    process.env.REPLICATE_MERSE_API_TOKEN ??
    process.env.REPLICATE_FLUX_API_TOKEN ??
    process.env.REPLICATE_API_TOKEN ??
    "";
  const model =
    (process.env.REPLICATE_MERSE_MODEL ?? process.env.REPLICATE_FLUX_MODEL ?? "3mgalaxia/merse-image-v1").trim();
  const version =
    (process.env.REPLICATE_MERSE_MODEL_VERSION ?? process.env.REPLICATE_FLUX_MODEL_VERSION ?? "").trim() || null;

  return {
    token: token.trim(),
    model,
    version,
  };
}

async function resolveReplicateVersion(token: string, model: string) {
  const response = await fetch(`${REPLICATE_API_URL}/models/${model}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const json = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : "Nao foi possivel descobrir a versao do modelo na Replicate.";
    throw new Error(message);
  }

  const latest = json?.latest_version?.id;
  if (typeof latest !== "string" || !latest.trim()) {
    throw new Error("Modelo da Replicate sem latest_version.");
  }
  return latest.trim();
}

async function ensureReplicateVersion(token: string, model: string, preferredVersion?: string | null) {
  if (preferredVersion && preferredVersion.trim()) {
    replicateVersionCache.set(model, preferredVersion.trim());
    return preferredVersion.trim();
  }
  const cached = replicateVersionCache.get(model);
  if (cached) return cached;

  const resolved = await resolveReplicateVersion(token, model);
  replicateVersionCache.set(model, resolved);
  return resolved;
}

async function createPrediction(token: string, payload: Record<string, unknown>) {
  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as PredictionStatus | null;
  if (!response.ok || !json) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : `Falha ao iniciar geracao na Replicate (status ${response.status}).`;
    const details = typeof json?.error?.details === "string" ? ` ${json.error.details}` : "";
    throw new Error(`${message}${details}`.trim());
  }

  if (!json.id) {
    throw new Error("Replicate nao retornou id da predicao.");
  }
  return json.id;
}

async function waitPrediction(token: string, predictionId: string) {
  const maxAttempts = 40;
  const delayMs = 2500;
  let latest: PredictionStatus = { id: predictionId, status: "starting" };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    latest = (await response.json().catch(() => ({}))) as PredictionStatus;

    if (!response.ok) {
      const message =
        typeof latest?.error?.message === "string"
          ? latest.error.message
          : "Falha ao consultar status na Replicate.";
      throw new Error(message);
    }

    const status = (latest.status ?? "").toLowerCase();
    if (status === "succeeded") return latest;
    if (status === "failed" || status === "canceled" || status === "cancelled") {
      const message =
        typeof latest?.error?.message === "string" ? latest.error.message : "A predicao na Replicate falhou.";
      const details = typeof latest?.error?.details === "string" ? ` ${latest.error.details}` : "";
      throw new Error(`${message}${details}`.trim());
    }
  }

  throw new Error("Tempo esgotado aguardando finalizacao da Replicate.");
}

function collectImage(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === "string") {
    if (
      output.startsWith("http://") ||
      output.startsWith("https://") ||
      output.startsWith("data:image/")
    ) {
      return output;
    }
    return null;
  }
  if (Array.isArray(output)) {
    for (const item of output) {
      const image = collectImage(item);
      if (image) return image;
    }
    return null;
  }
  if (typeof output === "object") {
    for (const value of Object.values(output as Record<string, unknown>)) {
      const image = collectImage(value);
      if (image) return image;
    }
  }
  return null;
}

async function runReplicateGeneration({
  token,
  model,
  version,
  prompt,
  referenceImage,
}: {
  token: string;
  model: string;
  version: string;
  prompt: string;
  referenceImage: string;
}) {
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: "1:1",
    num_outputs: 1,
    guidance: 3.2,
  };

  if (referenceImage) {
    input.image = referenceImage;
  }

  const predictionId = await createPrediction(token, {
    version,
    input,
  });
  const finalStatus = await waitPrediction(token, predictionId);
  const imageUrl = collectImage(finalStatus.output);
  if (!imageUrl) {
    throw new Error(`Modelo ${model} nao retornou uma imagem valida.`);
  }
  return imageUrl;
}

async function generatePortraitWithReplicate(imagePrompt: string, referenceImage: string) {
  const { token, model, version: envVersion } = getReplicateConfig();
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN nao configurada.");
  }
  if (!model) {
    throw new Error("Modelo da Replicate nao configurado.");
  }

  const version = await ensureReplicateVersion(token, model, envVersion);
  const prompt = `${imagePrompt} photorealistic portrait, cinematic detail, no text.`;

  try {
    return await runReplicateGeneration({
      token,
      model,
      version,
      prompt,
      referenceImage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (referenceImage && (message.includes("image") || message.includes("url"))) {
      return runReplicateGeneration({
        token,
        model,
        version,
        prompt,
        referenceImage: "",
      });
    }
    throw error;
  }
}

function normalizeDraft(body: Record<string, unknown>): DraftPersona {
  return {
    name: sanitizeText(body.name, 80),
    age: sanitizeText(body.age, 24),
    pronouns: sanitizeText(body.pronouns, 32),
    archetype: normalizeArchetype(body.archetype),
    personality: sanitizeText(body.personality, 360),
    appearance: sanitizeText(body.appearance, 420),
    origin: sanitizeText(body.origin, 180),
    abilities: sanitizeList(body.abilities, 8, 80),
    energy: normalizeEnergy(body.energy),
    traits: sanitizeText(body.traits, 320),
    summary: sanitizeText(body.summary, 420),
    tagline: sanitizeText(body.tagline, 180),
    loreHook: sanitizeText(body.loreHook, 320),
    tags: sanitizeList(body.tags, 6, 36).map((item) => item.toLowerCase()),
    referenceImage: normalizeImageInput(body.referenceImage),
    visualProvider: normalizeVisualProvider(body.visualProvider),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  const startedAt = Date.now();
  const userIdHeader = Array.isArray(req.headers["x-merse-uid"])
    ? req.headers["x-merse-uid"][0]
    : req.headers["x-merse-uid"];
  const userId = typeof userIdHeader === "string" && userIdHeader.trim() ? userIdHeader.trim() : undefined;
  const clientIp =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ||
    req.socket.remoteAddress ||
    "unknown";

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao suportado." });
  }

  const rate = applyRateLimit(`personagem-generate:${userId ?? clientIp}`, 5, 60_000);
  if (!rate.allowed) {
    const retryAfter = rate.retryAfter;
    await logApiAction({
      action: "personagem-generate",
      userId,
      status: 429,
      durationMs: Date.now() - startedAt,
      metadata: { reason: "rate_limited", retryAfter },
    });
    return res.status(429).json({
      error: "Muitas solicitacoes em pouco tempo. Aguarde alguns segundos.",
      details: [`retryAfter=${retryAfter}`],
    });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const draft = normalizeDraft(body);

  const hasAnyInput = Boolean(
    draft.name || draft.personality || draft.appearance || draft.origin || draft.traits || draft.summary,
  );
  if (!hasAnyInput) {
    return res.status(400).json({
      error: "Preencha ao menos nome, personalidade, aparencia, origem ou tracos para gerar a persona.",
    });
  }

  const warnings: string[] = [];
  let textProvider: TextProvider = "fallback";
  let imageProvider: ImageProvider = "none";
  let portraitUrl: string | undefined;

  try {
    let persona = fallbackPersona(draft);

    try {
      persona = await generatePersonaWithOpenAI(draft);
      textProvider = "openai";
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha ao refinar texto.";
      warnings.push(`Texto IA indisponivel: ${message}`);
    }

    if (draft.visualProvider !== "replicate") {
      try {
        portraitUrl = await generatePortraitWithOpenAI(persona.imagePrompt, draft.referenceImage);
        imageProvider = "openai";
      } catch (error) {
        const message = error instanceof Error ? error.message : "falha ao gerar retrato na OpenAI.";
        warnings.push(`OpenAI imagem: ${message}`);
      }
    }

    if (!portraitUrl && draft.visualProvider !== "openai") {
      try {
        portraitUrl = await generatePortraitWithReplicate(persona.imagePrompt, draft.referenceImage);
        imageProvider = "replicate";
      } catch (error) {
        const message = error instanceof Error ? error.message : "falha ao gerar retrato na Replicate.";
        warnings.push(`Replicate imagem: ${message}`);
      }
    }

    const { imagePrompt: _discarded, ...finalPersona } = persona;

    await logApiAction({
      action: "personagem-generate",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: {
        visualProvider: draft.visualProvider,
        textProvider,
        imageProvider,
        hasReferenceImage: Boolean(draft.referenceImage),
        hasPortrait: Boolean(portraitUrl),
        warnings: warnings.slice(0, 4),
      },
    });

    return res.status(200).json({
      persona: finalPersona,
      portraitUrl,
      providers: {
        text: textProvider,
        image: imageProvider,
      },
      warnings,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao gerar personagem.";
    await logApiAction({
      action: "personagem-generate",
      userId,
      status: 500,
      durationMs: Date.now() - startedAt,
      metadata: {
        visualProvider: draft.visualProvider,
        error: message,
      },
    });
    return res.status(500).json({
      error: message,
      details: warnings.length > 0 ? warnings : undefined,
    });
  }
}
