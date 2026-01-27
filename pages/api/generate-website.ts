import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { randomUUID } from "crypto";
import { injectEffectStyles } from "@/lib/effects";
import { injectPaletteStyles, buildImagePrompt, PaletteColors, injectAnimationHtml } from "@/lib/siteEnhancers";
import { applyRateLimit } from "@/lib/rateLimit";
import { logApiAction } from "@/lib/logger";
import { adminDb } from "@/lib/firebaseAdmin";
import { isR2Enabled, uploadBufferToR2 } from "@/server/storage/r2";
import { addProjectEvent } from "@/lib/site/addProjectEvent";

type WebsiteCodePayload = {
  summary: string;
  highlights: string[];
  html: string;
  imageUrl?: string;
  effect?: EffectBrief | null;
  animation?: Pick<AnimationBrief, "id" | "label"> | null;
};

type LayoutBrief = {
  id?: string;
  label?: string;
  description?: string;
  objective?: string;
  highlights?: string[];
};

type PaletteBrief = {
  id?: string;
  label?: string;
  preview?: string;
};

type EffectBrief = {
  id?: string;
  name?: string;
  intensity?: number;
};

type AnimationBrief = {
  id?: string;
  label?: string;
  description?: string;
  html?: string;
};

type SuccessResponse = { website: WebsiteCodePayload; projectId: string };
type ErrorResponse = { error: string; details?: unknown };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  baseURL: process.env.OPENAI_BASE_URL,
});

const IMAGE_MODEL = (process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1").trim();

async function generateHeroImage(prompt: string) {
  try {
    const response = await openai.images.generate({
      model: IMAGE_MODEL || "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });

    const generated = response.data?.[0];
    const url = generated?.url ?? (generated?.b64_json ? `data:image/png;base64,${generated.b64_json}` : null);
    return url ?? null;
  } catch (error) {
    console.error("Falha ao gerar imagem do site:", error);
    return null;
  }
}

async function bufferFromImageUrl(imageUrl: string): Promise<Buffer | null> {
  try {
    if (imageUrl.startsWith("data:")) {
      const base64 = imageUrl.split(",")[1];
      if (!base64) return null;
      return Buffer.from(base64, "base64");
    }
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const array = await response.arrayBuffer();
    return Buffer.from(array);
  } catch (error) {
    console.error("Falha ao baixar imagem para R2:", error);
    return null;
  }
}

async function uploadHtmlToR2(html: string, projectId: string) {
  if (!isR2Enabled()) return { url: null, key: null };
  const key = `projects/${projectId}/build/index.html`;
  const url = await uploadBufferToR2({
    buffer: Buffer.from(html, "utf-8"),
    contentType: "text/html; charset=utf-8",
    key,
  });
  return { url, key };
}

async function uploadHeroToR2(imageUrl: string, projectId: string) {
  if (!isR2Enabled()) return { url: imageUrl, key: null };
  const buffer = await bufferFromImageUrl(imageUrl);
  if (!buffer) return { url: imageUrl, key: null };
  const key = `projects/${projectId}/images/hero.png`;
  const url = await uploadBufferToR2({
    buffer,
    contentType: "image/png",
    key,
  });
  return { url: url ?? imageUrl, key };
}

function injectHeroSection(html: string, imageUrl: string, siteName: string) {
  if (!imageUrl) return html;

  const heroMarkup = `
    <section class="merse-generated-hero">
      <div class="merse-hero-media" role="img" aria-label="Visual gerado automaticamente para ${siteName}">
        <img src="${imageUrl}" alt="Visual conceitual do site ${siteName}" loading="lazy" />
        <div class="merse-hero-gradient"></div>
      </div>
      <div class="merse-hero-caption">
        <p>Visual gerado pela Merse a partir do briefing.</p>
      </div>
    </section>
  `;

  const heroStyles = `
    <style>
      .merse-generated-hero {
        position: relative;
        border-radius: 32px;
        overflow: hidden;
        margin: 2rem auto;
        max-width: 1200px;
        box-shadow: 0 30px 120px rgba(84, 0, 255, 0.35);
      }
      .merse-hero-media {
        position: relative;
        min-height: 360px;
        background: radial-gradient(circle at top, rgba(168,85,247,0.3), rgba(2,2,8,0.9));
      }
      .merse-hero-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        filter: saturate(1.05);
      }
      .merse-hero-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(2,2,8,0.15), rgba(2,2,8,0.85));
      }
      .merse-hero-caption {
        position: absolute;
        bottom: 1.5rem;
        left: 2rem;
        right: 2rem;
        color: white;
        font-size: 0.85rem;
        letter-spacing: 0.35em;
        text-transform: uppercase;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      @media (max-width: 768px) {
        .merse-hero-caption {
          flex-direction: column;
          gap: 0.5rem;
          letter-spacing: 0.25em;
        }
      }
    </style>
  `;

  let output = html;
  if (html.includes("</head>")) {
    output = html.replace("</head>", `${heroStyles}</head>`);
  } else {
    output = heroStyles + output;
  }

  const bodyOpenMatch = output.match(/<body[^>]*>/i);
  if (bodyOpenMatch && bodyOpenMatch[0]) {
    return output.replace(bodyOpenMatch[0], `${bodyOpenMatch[0]}${heroMarkup}`);
  }

  return `${heroMarkup}${output}`;
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

  const rateKey = `generate-website:${userId ?? clientIp}`;
  const rate = applyRateLimit(rateKey, 10, 60_000);
  if (!rate.allowed) {
    const retryAfter = rate.retryAfter;
    await logApiAction({
      action: "generate-website",
      userId,
      status: 429,
      durationMs: Date.now() - startedAt,
      metadata: { reason: "rate_limited", retryAfter },
    });
    return res.status(429).json({
      error: "Muitas solicitações. Aguarde alguns segundos antes de tentar novamente.",
      details: { retryAfter },
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Chave da OpenAI não configurada no servidor." });
  }

  const {
    siteName,
    goal,
    menu,
    layout,
    palette,
    modules,
    notes,
    heroMood,
    rawBrief,
    effect,
    animation,
    structureOnly = false,
    paletteColors,
    paletteDescription,
    projectId: incomingProjectId,
    blueprint,
  } = req.body;

  if (!siteName || typeof siteName !== "string") {
    return res.status(400).json({ error: "Informe o nome do site." });
  }

  const projectId =
    typeof incomingProjectId === "string" && incomingProjectId.trim().length > 0
      ? incomingProjectId.trim()
      : adminDb.collection("site_projects").doc().id;

  try {
    await adminDb.collection("site_projects").doc(projectId).set(
      {
        id: projectId,
        siteName,
        rawBrief: typeof rawBrief === "string" ? rawBrief : goal ?? "",
        status: "assets_generating",
        progress: 35,
        currentStep: "Gerando HTML e assets",
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    await addProjectEvent(projectId, "Iniciando geração de código e assets", "info", "assets_generating");
  } catch (error) {
    console.error("Não foi possível registrar início do projeto no Firestore:", error);
  }

  try {
    const paletteColorConfig = (paletteColors ?? {}) as PaletteColors;

    const layoutInfo: LayoutBrief =
      layout && typeof layout === "object"
        ? layout
        : {
            id: layout,
            label: layout,
          };

    const paletteInfo: PaletteBrief =
      palette && typeof palette === "object"
        ? palette
        : { id: palette, label: palette, preview: "" };

    const animationInfo: AnimationBrief | null =
      animation && typeof animation === "object"
        ? {
            id: typeof animation.id === "string" ? animation.id : undefined,
            label: typeof animation.label === "string" ? animation.label : undefined,
            description: typeof animation.description === "string" ? animation.description : undefined,
            html: typeof animation.html === "string" ? animation.html : undefined,
          }
        : null;

    const normalizedModules = Array.isArray(modules)
      ? modules.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    const additionalBrief = [
      layoutInfo?.label ? `Layout escolhido: ${layoutInfo.label} — ${layoutInfo.description ?? "sem descrição."}` : null,
      layoutInfo?.objective ? `Objetivo principal: ${layoutInfo.objective}.` : null,
      Array.isArray(layoutInfo?.highlights) && layoutInfo.highlights.length
        ? `Pontos-chave:\n${layoutInfo.highlights.map((item: string) => `- ${item}`).join("\n")}`
        : null,
      normalizedModules.length ? `Módulos solicitados: ${normalizedModules.join(", ")}.` : null,
      paletteInfo?.label
        ? `Paleta sugerida: ${paletteInfo.label}${
            paletteInfo.preview ? ` (${paletteInfo.preview})` : ""
          }.`
        : null,
      typeof heroMood === "string" && heroMood.trim()
        ? `Mood desejado para o hero: ${heroMood.trim()}.`
        : null,
      paletteColorConfig?.primary || paletteColorConfig?.secondary || paletteColorConfig?.accent
        ? `Cores definidas manualmente: ${[
            paletteColorConfig?.primary,
            paletteColorConfig?.secondary,
            paletteColorConfig?.accent,
          ]
            .filter(Boolean)
            .join(", ")}.`
        : null,
      typeof paletteDescription === "string" && paletteDescription.trim()
        ? `Descrição das cores predominantes: ${paletteDescription.trim()}.`
        : null,
      typeof notes === "string" && notes.trim() ? `Observações extras: ${notes.trim()}.` : null,
      effect?.id ? `Efeito visual: ${effect.name ?? effect.id} (intensidade ${effect.intensity ?? "default"}).` : null,
      animationInfo?.label ? `Animação de fundo escolhida: ${animationInfo.label}.` : null,
      typeof rawBrief === "string" && rawBrief.trim()
        ? `Briefing livre enviado pelo usuário:\n${rawBrief.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const promptContext = JSON.stringify(
      {
        siteName,
        goal,
        menu,
        layout: layoutInfo,
        palette: paletteInfo,
        modules: normalizedModules,
        notes,
        heroMood,
        rawBrief,
        effect,
        animation: animationInfo
          ? { id: animationInfo.id, label: animationInfo.label, description: animationInfo.description }
          : null,
      },
      null,
      2
    );

    const promptLines = [
      "Você é um engenheiro front-end da Merse. Gere apenas um JSON com a estrutura:",
      "{",
      '  "summary": "Resumo em 2-3 frases sobre o conceito do site",',
      '  "highlights": ["Ponto forte 1", "Ponto forte 2", "..."],',
      '  "html": "<!DOCTYPE html>... (documento completo em HTML5 com CSS inline e identidade Merse)"',
      "}",
      "",
      "Regras:",
      '- "html" deve conter <!DOCTYPE html>, <html>, <head> (com <style> e, se desejar, @import do Google Fonts) e <body>.',
      "- Utilize estilos inline ou em um único bloco <style> para manter a identidade Merse (fundos escuros, gradientes roxo/azul, tipografia moderna, animações leves).",
      "- Estruture o corpo respeitando o briefing do layout escolhido: hero, narrativa das seções, CTA final coerente.",
      '- Se receber "modules", os blocos devem aparecer na ordem sugerida, com títulos e textos compatíveis.',
      "- A paleta indicada deve guiar as cores principais, com variações em hover/gradientes.",
      "- Use apenas HTML + CSS (sem JavaScript externo) e garanta comportamento responsivo com Flex/Grid.",
      "- Limite o código HTML a aproximadamente 160 linhas para evitar respostas extensas demais.",
      "- Retorne somente o JSON final, sem comentários ou texto adicional.",
      "",
      "Dados do projeto:",
      promptContext,
    ];

    if (blueprint && typeof blueprint === "object") {
      try {
        const blueprintPreview = JSON.stringify(blueprint, null, 2).slice(0, 4500);
        promptLines.push("", "Blueprint sugerido (use como referência, pode refinar):", blueprintPreview);
      } catch {
        // se não conseguir stringificar, ignora
      }
    }

    if (additionalBrief) {
      promptLines.push("", "Briefing detalhado:", additionalBrief);
    }

    const prompt = promptLines.join("\n");

    // 🚀 Compatível com openai@6.7.0 (usando chat.completions)
    const envModel =
      typeof process.env.OPENAI_BLUEPRINT_MODEL === "string"
        ? process.env.OPENAI_BLUEPRINT_MODEL.trim()
        : "";
    const fallbackModel = "gpt-4o-mini";
    const safeModel =
      envModel.length > 0 && /^[a-z0-9._-]+$/i.test(envModel) ? envModel : fallbackModel;

    if (envModel.length > 0 && safeModel === fallbackModel) {
      console.warn(
        `OPENAI_BLUEPRINT_MODEL="${envModel}" é inválido. Revertendo para modelo padrão ${fallbackModel}.`,
      );
    }

    const completion = await openai.chat.completions.create({
      model: safeModel,
      messages: [
        { role: "system", content: "Você gera HTML/CSS completos seguindo a identidade visual da Merse." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
      max_tokens: 2000,
    });

    const output = completion.choices[0]?.message?.content ?? "";

    const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let jsonText = fencedMatch ? fencedMatch[1].trim() : null;

    if (!jsonText) {
      const start = output.indexOf("{");
      const end = output.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        jsonText = output.slice(start, end + 1);
      }
    }

    if (!jsonText) {
      throw new Error("Resposta da OpenAI não contém JSON válido.");
    }

    let website: WebsiteCodePayload | null = null;
    try {
      website = JSON.parse(jsonText) as WebsiteCodePayload;
    } catch (parseError) {
      console.error("Falha ao interpretar JSON:", jsonText);
      throw parseError;
    }

    if (website?.html) {
      website.html = injectPaletteStyles(website.html, paletteColorConfig);

      if (!structureOnly) {
      const imagePrompt = buildImagePrompt({
        siteName,
        goal,
        layout: layoutInfo,
        palette: paletteInfo,
        heroMood,
        notes,
        rawBrief,
        paletteDescription,
      });

        const heroImageUrl = await generateHeroImage(imagePrompt);

        if (heroImageUrl) {
          website.imageUrl = heroImageUrl;
          website.html = injectHeroSection(website.html, heroImageUrl, siteName);
        }
      }

      if (effect?.id) {
        website.effect = effect;
        website.html = injectEffectStyles(website.html, effect.id, effect.intensity);
      }

      if (animationInfo?.id && animationInfo.html) {
        website.animation = {
          id: animationInfo.id,
          label: animationInfo.label ?? animationInfo.id,
        };
        website.html = injectAnimationHtml(website.html, animationInfo.id, animationInfo.html);
      } else if (animationInfo?.id) {
        website.animation = {
          id: animationInfo.id,
          label: animationInfo.label ?? animationInfo.id,
        };
      }
    }

    // Salva assets em storage seguindo a estrutura recomendada
    let savedHero = { url: website?.imageUrl ?? null, key: null as string | null };
    let savedHtml = { url: null as string | null, key: null as string | null };

    if (website?.imageUrl) {
      const uploadedHero = await uploadHeroToR2(website.imageUrl, projectId);
      savedHero = uploadedHero;
      website.imageUrl = uploadedHero.url ?? website.imageUrl;
    }

    if (website?.html) {
      const uploadedHtml = await uploadHtmlToR2(website.html, projectId);
      savedHtml = uploadedHtml;
    }

    try {
      await adminDb.collection("site_projects").doc(projectId).set(
        {
          id: projectId,
          siteName,
          rawBrief: typeof rawBrief === "string" ? rawBrief : goal ?? "",
          status: "assets_ready",
          progress: 75,
          currentStep: "Assets prontos",
          updatedAt: Date.now(),
          assets: {
            images: {
              hero: savedHero.url
                ? {
                    url: savedHero.url,
                    path: savedHero.key,
                  }
                : null,
            },
            build: {
              index: savedHtml.url
                ? {
                    url: savedHtml.url,
                    path: savedHtml.key,
                  }
                : null,
            },
          },
          lastRun: {
            structureOnly: Boolean(structureOnly),
            hasImage: Boolean(website?.imageUrl),
            modules: normalizedModules,
          },
        },
        { merge: true },
      );
      await addProjectEvent(projectId, "Assets salvos no storage", "info", "assets_ready");
    } catch (error) {
      console.error("Falha ao salvar assets do projeto no Firestore:", error);
    }

    await logApiAction({
      action: "generate-website",
      userId,
      status: 200,
      durationMs: Date.now() - startedAt,
      metadata: {
        siteName,
        modules: normalizedModules.length,
        hasImage: Boolean(website.imageUrl),
        effectId: effect?.id ?? null,
        animationId: animationInfo?.id ?? null,
        structureOnly: Boolean(structureOnly),
      },
    });

    return res.status(200).json({ website, projectId });
  } catch (error) {
    console.error("Erro ao gerar código com OpenAI:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o código agora. Tente novamente.";

    await logApiAction({
      action: "generate-website",
      userId,
      status: 500,
      durationMs: Date.now() - startedAt,
      metadata: { error: message },
    });
    return res.status(500).json({ error: message });
  }
}
