import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { autoProgress } from "@/lib/site/autoProgress";

type SectionType = "hero" | "features" | "gallery" | "pricing" | "contact" | "custom";

type BlueprintSection = {
  id: string;
  type: SectionType;
  title?: string;
  description?: string;
  copy?: string;
  imagePrompt?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type BlueprintPage = {
  id: string;
  slug: string;
  title: string;
  seoDescription?: string;
  sections: BlueprintSection[];
};

type BlueprintFeatures = {
  preview: boolean;
  seo: boolean;
  auth: boolean;
  cms: boolean;
};

type SuccessResponse = {
  project_id: string;
  status: "blueprint_ready";
  blueprint: {
    project_name: string;
    brief: string;
    brand_colors: string[];
    tone: string;
    audience: string;
    cta: string;
    features: BlueprintFeatures;
    pages: BlueprintPage[];
  };
  pages: BlueprintPage[];
  source: "openai" | "fallback";
};

type ErrorResponse = {
  error: string;
  details?: string[];
};

const SECTION_TYPES: SectionType[] = [
  "hero",
  "features",
  "gallery",
  "pricing",
  "contact",
  "custom",
];

function asObject(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function sanitizeText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
      .slice(0, 10);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  return [];
}

function safeParseJson(value: unknown) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeSectionType(value: unknown): SectionType {
  if (typeof value !== "string") return "custom";
  const normalized = value.trim().toLowerCase() as SectionType;
  return SECTION_TYPES.includes(normalized) ? normalized : "custom";
}

function normalizeSection(value: unknown, pageSlug: string, index: number): BlueprintSection {
  const raw = asObject(value);
  const type = normalizeSectionType(raw.type);
  const idCandidate = sanitizeText(raw.id, "", 48);
  const id = idCandidate || `${type}-${index + 1}`;

  return {
    id,
    type,
    title: sanitizeText(raw.title, "", 120) || undefined,
    description: sanitizeText(raw.description, "", 220) || undefined,
    copy: sanitizeText(raw.copy, "", 900) || undefined,
    imagePrompt: sanitizeText(raw.imagePrompt, "", 320) || undefined,
    ctaLabel: sanitizeText(raw.ctaLabel, "", 60) || undefined,
    ctaHref: sanitizeText(raw.ctaHref, "", 120) || (pageSlug === "/" ? "#contato" : "/"),
  };
}

function normalizeSlug(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizePage(value: unknown, index: number): BlueprintPage {
  const raw = asObject(value);
  const slug = normalizeSlug(raw.slug, index === 0 ? "/" : `/pagina-${index + 1}`);
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = sectionsRaw.slice(0, 8).map((section, i) => normalizeSection(section, slug, i));

  return {
    id: sanitizeText(raw.id, "", 50) || (index === 0 ? "home" : `page-${index + 1}`),
    slug,
    title: sanitizeText(raw.title, index === 0 ? "Home" : `Página ${index + 1}`, 120),
    seoDescription: sanitizeText(raw.seoDescription, "", 180) || undefined,
    sections,
  };
}

function toneToProjectTone(inputTone: string): "luxo" | "futurista" | "minimalista" | "corporativo" | "personalizado" {
  const normalized = inputTone.toLowerCase();
  if (normalized.includes("lux")) return "luxo";
  if (normalized.includes("mini")) return "minimalista";
  if (normalized.includes("corp")) return "corporativo";
  if (normalized.includes("futur")) return "futurista";
  return "personalizado";
}

function buildDefaultPages({
  projectName,
  brief,
  cta,
  features,
  requestedPages,
}: {
  projectName: string;
  brief: string;
  cta: string;
  features: BlueprintFeatures;
  requestedPages: BlueprintPage[];
}) {
  if (requestedPages.length > 0) {
    return requestedPages.map((page, index) => ({
      ...page,
      sections:
        page.sections.length > 0
          ? page.sections
          : [
              {
                id: `hero-${index + 1}`,
                type: "hero" as const,
                title: page.title,
                description: brief,
                copy: "Estrutura inicial gerada automaticamente com base no briefing.",
                imagePrompt: `Hero visual para ${projectName} com identidade ${page.title}.`,
                ctaLabel: cta,
                ctaHref: "#contato",
              },
            ],
    }));
  }

  const baseSections: BlueprintSection[] = [
    {
      id: "hero",
      type: "hero",
      title: `${projectName}`,
      description: brief,
      copy: "Narrativa principal com foco em proposta de valor e clareza visual.",
      imagePrompt: `Visual hero cinematográfico para ${projectName}, com estética moderna e contraste premium.`,
      ctaLabel: cta,
      ctaHref: "#contato",
    },
    {
      id: "features",
      type: "features",
      title: "Destaques",
      description: "Blocos de valor para explicar diferenciais.",
      copy: "Seção modular pronta para benefícios, números e confiança.",
      ctaLabel: cta,
      ctaHref: "#contato",
    },
    {
      id: "contact",
      type: "contact",
      title: "Contato",
      description: "Canal direto para conversão.",
      copy: "Formulário e CTA final para fechamento.",
      ctaLabel: cta,
      ctaHref: "#contato",
    },
  ];

  if (features.cms) {
    baseSections.splice(2, 0, {
      id: "conteudos",
      type: "custom",
      title: "Conteúdos",
      description: "Seção preparada para gestão de conteúdo.",
      copy: "Estrutura de listagem para blog, notícias ou atualizações.",
      ctaLabel: "Ver conteúdos",
      ctaHref: "/blog",
    });
  }

  if (features.auth) {
    baseSections.splice(2, 0, {
      id: "acesso",
      type: "pricing",
      title: "Planos e Acesso",
      description: "Área para cadastro/login e oferta principal.",
      copy: "Seção pensada para conversão com trilha de onboarding.",
      ctaLabel: "Criar conta",
      ctaHref: "#acesso",
    });
  }

  return [
    {
      id: "home",
      slug: "/",
      title: `${projectName} — Home`,
      seoDescription: `Blueprint inicial de ${projectName}.`,
      sections: baseSections,
    },
  ];
}

function buildPrompt(payload: {
  projectName: string;
  brief: string;
  tone: string;
  brandColors: string[];
  audience: string;
  cta: string;
  features: BlueprintFeatures;
  requestedPages: BlueprintPage[];
}) {
  return [
    "Você é um arquiteto de websites especializado em blueprint.",
    "Responda somente JSON válido.",
    "Gere objeto com chave pages (array).",
    "Cada página: id, slug, title, seoDescription, sections.",
    "Cada section: id, type(hero|features|gallery|pricing|contact|custom), title, description, copy, imagePrompt, ctaLabel, ctaHref.",
    "No máximo 6 páginas e 8 seções por página.",
    "Use português do Brasil.",
    "",
    `Projeto: ${payload.projectName}`,
    `Briefing: ${payload.brief}`,
    `Tom: ${payload.tone}`,
    `Público-alvo: ${payload.audience}`,
    `CTA principal: ${payload.cta}`,
    `Cores da marca: ${payload.brandColors.join(", ") || "não informado"}`,
    `Features: ${JSON.stringify(payload.features)}`,
    payload.requestedPages.length
      ? `Páginas solicitadas (base): ${JSON.stringify(payload.requestedPages)}`
      : "Páginas solicitadas: gerar a arquitetura ideal a partir do briefing.",
  ].join("\n");
}

async function generatePagesWithOpenAI(input: {
  projectName: string;
  brief: string;
  tone: string;
  brandColors: string[];
  audience: string;
  cta: string;
  features: BlueprintFeatures;
  requestedPages: BlueprintPage[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const completion = await openai.chat.completions.create({
    model: (process.env.OPENAI_BLUEPRINT_MODEL ?? "gpt-4o-mini").trim(),
    response_format: { type: "json_object" },
    temperature: 0.55,
    max_tokens: 1800,
    messages: [
      {
        role: "system",
        content:
          "Você gera blueprint de site. Não inclua explicações, apenas JSON com estrutura de páginas.",
      },
      { role: "user", content: buildPrompt(input) },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("Resposta vazia da OpenAI.");
  }

  const parsed = safeParseJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI retornou JSON inválido.");
  }

  const pagesCandidate = asObject(parsed).pages;
  if (!Array.isArray(pagesCandidate) || pagesCandidate.length === 0) {
    throw new Error("OpenAI não retornou pages.");
  }

  return pagesCandidate.slice(0, 6).map((page, index) => normalizePage(page, index));
}

async function persistProjectIfPossible(params: {
  projectId: string;
  userId?: string;
  projectName: string;
  brandColors: string[];
  tone: string;
  brief: string;
  pages: BlueprintPage[];
  maxIterations: number;
  features: BlueprintFeatures;
  audience: string;
  cta: string;
}) {
  if (!params.userId) return;

  try {
    const { adminDb } = await import("@/lib/firebaseAdmin");
    await adminDb
      .collection("site_projects")
      .doc(params.projectId)
      .set(
        {
          id: params.projectId,
          userId: params.userId,
          name: params.projectName,
          brandColors: params.brandColors,
          tone: toneToProjectTone(params.tone),
          rawBrief: params.brief,
          pages: params.pages,
          status: "blueprint_ready",
          progress: autoProgress("blueprint_ready"),
          currentIteration: 0,
          maxIterations: params.maxIterations,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          blueprintMeta: {
            audience: params.audience,
            cta: params.cta,
            features: params.features,
          },
        },
        { merge: true },
      );
  } catch (error) {
    console.warn("[site-blueprint/create] persistência opcional ignorada:", error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const body = asObject(req.body);
  const errors: string[] = [];

  const projectName = sanitizeText(
    body.project_name ?? body.name,
    "Projeto Merse",
    100,
  );
  const brief = sanitizeText(body.brief, "", 1800);
  const tone = sanitizeText(body.tone, "futurista", 80);
  const audience = sanitizeText(body.audience, "Visitantes do site", 120);
  const cta = sanitizeText(body.cta, "Falar com a equipe", 70);

  if (!brief) {
    errors.push("Informe o campo brief.");
  }

  const brandColors = toStringArray(body.brand_colors ?? body.brandColors);
  const normalizedBrandColors = brandColors.length ? brandColors : ["azul", "roxo"];

  const featuresInput = safeParseJson(body.features_json) ?? body.features_json ?? {};
  if (body.features_json && !featuresInput) {
    errors.push("features_json inválido: envie JSON válido.");
  }
  const featuresRaw = asObject(featuresInput);
  const features: BlueprintFeatures = {
    preview: toBoolean(featuresRaw.preview, true),
    seo: toBoolean(featuresRaw.seo, true),
    auth: toBoolean(featuresRaw.auth, false),
    cms: toBoolean(featuresRaw.cms, false),
  };

  const pagesInput = safeParseJson(body.pages_json) ?? body.pages_json ?? [];
  if (body.pages_json && !pagesInput) {
    errors.push("pages_json inválido: envie JSON válido.");
  }

  const requestedPages = Array.isArray(pagesInput)
    ? pagesInput.slice(0, 6).map((entry, index) => normalizePage(entry, index))
    : [];

  if (errors.length) {
    return res.status(400).json({ error: "Payload inválido.", details: errors });
  }

  const userId =
    typeof body.userId === "string" && body.userId.trim().length > 0
      ? body.userId.trim()
      : undefined;
  const maxIterationsRaw =
    typeof body.maxIterations === "number" && Number.isFinite(body.maxIterations)
      ? body.maxIterations
      : Number(body.maxIterations ?? NaN);
  const maxIterations = Number.isFinite(maxIterationsRaw)
    ? Math.min(6, Math.max(1, Math.round(maxIterationsRaw)))
    : 3;

  const projectId =
    sanitizeText(body.project_id ?? body.projectId, "", 80) ||
    `site_${randomUUID().replace(/-/g, "").slice(0, 10)}`;

  let source: "openai" | "fallback" = "fallback";
  let pages: BlueprintPage[] = [];

  try {
    pages = await generatePagesWithOpenAI({
      projectName,
      brief,
      tone,
      brandColors: normalizedBrandColors,
      audience,
      cta,
      features,
      requestedPages,
    });
    source = "openai";
  } catch (error) {
    console.warn("[site-blueprint/create] fallback blueprint:", error);
    pages = buildDefaultPages({
      projectName,
      brief,
      cta,
      features,
      requestedPages,
    });
    source = "fallback";
  }

  await persistProjectIfPossible({
    projectId,
    userId,
    projectName,
    brandColors: normalizedBrandColors,
    tone,
    brief,
    pages,
    maxIterations,
    features,
    audience,
    cta,
  });

  return res.status(200).json({
    project_id: projectId,
    status: "blueprint_ready",
    blueprint: {
      project_name: projectName,
      brief,
      brand_colors: normalizedBrandColors,
      tone,
      audience,
      cta,
      features,
      pages,
    },
    pages,
    source,
  });
}
