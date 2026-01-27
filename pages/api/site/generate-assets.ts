import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebaseAdmin";
import { addProjectEvent } from "@/lib/site/addProjectEvent";
import { type SitePage, type SiteStatus } from "@/lib/types/siteBuilder";
import { generateImageFromPayload } from "@/pages/api/generate-image";
import { isR2Enabled, uploadBufferToR2 } from "@/server/storage/r2";
import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { autoProgress } from "@/lib/site/autoProgress";

type ErrorResponse = { error: string };
type SuccessResponse = { projectId: string; status: string };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateImageForSection(prompt: string, provider: string) {
  const primaryProvider = (provider || "merse") as any;
  try {
    const result = await generateImageFromPayload({
      prompt,
      provider: primaryProvider,
      count: 1,
      aspectRatio: "16:9",
      stylization: 0.55,
    } as any);

    if (!result.imageUrl) {
      throw new Error("Falha ao gerar imagem");
    }
    return result.imageUrl;
  } catch (err) {
    console.warn("[generate-assets] provider falhou, tentando fallback openai:", err);
    const fallback = await generateImageFromPayload({
      prompt,
      provider: "openai",
      count: 1,
      aspectRatio: "16:9",
      stylization: 0.55,
    } as any);
    if (!fallback.imageUrl) {
      throw new Error("Falha ao gerar imagem após fallback");
    }
    return fallback.imageUrl;
  }
}

async function generateImagesInBatches(
  targets: Array<{ prompt: string; index: number }>,
  provider: string,
  onProgress?: (done: number, total: number) => Promise<void> | void,
) {
  const total = targets.length;
  const results: Array<string | null> = Array(total).fill(null);
  const concurrency = 3;
  let cursor = 0;

  async function worker() {
    while (cursor < total) {
      const current = cursor++;
      const target = targets[current];
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const url = await generateImageForSection(target.prompt, provider);
          results[current] = url;
          break;
        } catch (error) {
          lastError = error;
          if (attempt === 1) {
            console.warn("[generate-assets] Falha ao gerar imagem (tentativas esgotadas):", error);
          }
        }
      }
      if (onProgress) {
        await onProgress(results.filter(Boolean).length, total);
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(runners);
  return results;
}

function deriveSections(pages: SitePage[]) {
  const heroSection =
    pages.flatMap((p) => p.sections).find((s) => s.type === "hero") ?? pages[0]?.sections?.[0];
  const featureSections =
    pages.flatMap((p) => p.sections).filter((s) => s.type === "features" || s.type === "custom") ?? [];
  const contactSection = pages.flatMap((p) => p.sections).find((s) => s.type === "contact");
  return { heroSection, featureSections, contactSection };
}

function buildProjectFiles(pages: SitePage[], siteName: string) {
  const { heroSection, featureSections, contactSection } = deriveSections(pages);

  const heroCode = `\
import React from "react";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-white shadow-2xl">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-200/80">${heroSection?.title ?? siteName}</p>
          <h1 className="text-4xl font-semibold leading-tight text-white">${heroSection?.title ?? siteName}</h1>
          <p className="text-lg text-white/70 max-w-2xl">${heroSection?.description ?? heroSection?.copy ?? ""}</p>
          <div className="flex flex-wrap gap-3">
            ${heroSection?.ctaLabel ? `<a className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition" href="${heroSection?.ctaHref ?? "#"}">${heroSection?.ctaLabel}</a>` : ""}
          </div>
        </div>
        ${
          heroSection?.imageUrl
            ? `<div className="relative">
          <div className="absolute inset-0 blur-3xl bg-blue-500/30" />
          <img src="${heroSection.imageUrl}" alt="${heroSection?.title ?? siteName}" className="relative z-10 w-full rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.45)] object-cover" />
        </div>`
            : ""
        }
      </div>
    </section>
  );
}
`;

  const featuresCode = `\
import React from "react";

type Feature = { title?: string; description?: string; imageUrl?: string };

const features: Feature[] = ${JSON.stringify(
    featureSections.map((s) => ({
      title: s.title ?? s.id,
      description: s.description ?? s.copy ?? "",
      imageUrl: s.imageUrl,
    })),
    null,
    2,
  )};

export function Features() {
  if (!features.length) return null;
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Destaques</p>
          <h2 className="text-2xl font-semibold text-white">Experiências principais</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {features.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 opacity-70" />
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-white/60">{item.description}</p>
              </div>
            </div>
            {item.imageUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                <img src={item.imageUrl} alt={item.title ?? "Feature"} className="w-full object-cover" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
`;

  const contatoCode = `\
import React from "react";

export function Contato() {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-900/60 via-black to-black px-8 py-10 text-white shadow-2xl">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">${contactSection?.title ?? "Contato"}</p>
        <h3 className="text-2xl font-semibold text-white">${contactSection?.title ?? "Fale com a equipe"}</h3>
        <p className="text-sm text-white/70">
          ${contactSection?.description ?? contactSection?.copy ?? "Quer uma demo personalizada ou suporte? Envie sua mensagem."}
        </p>
        <a
          className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/60"
          href="${contactSection?.ctaHref ?? "#"}"
        >
          ${contactSection?.ctaLabel ?? "Entrar em contato"}
        </a>
      </div>
    </section>
  );
}
`;

  const pageCode = `\
import React from "react";
import "../../styles/global.css";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Contato } from "../components/Contato";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#03030b] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(244,114,182,0.18),transparent_60%),linear-gradient(180deg,#03030b,#000)]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-16">
        <Hero />
        <Features />
        <Contato />
      </div>
    </main>
  );
}
`;

  const layoutCode = `\
import "../styles/global.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "${siteName} · Merse",
  description: "Site criado pela Merse com IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
`;

  const globalsCss = `\
:root {
  color-scheme: dark;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #03030b;
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #03030b; color: #fff; }
a { color: inherit; text-decoration: none; }
`;

  return {
    "pages/app/layout.tsx": layoutCode,
    "pages/app/page.tsx": pageCode,
    "components/Hero.tsx": heroCode,
    "components/Features.tsx": featuresCode,
    "components/Contato.tsx": contatoCode,
    "styles/global.css": globalsCss,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  const { projectId, imageProvider } = req.body ?? {};
  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ error: "projectId é obrigatório." });
  }

  try {
    const projectRef = adminDb.collection("site_projects").doc(projectId);
    const snapshot = await projectRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const project = snapshot.data() ?? {};
    const pages = Array.isArray(project.pages) ? (project.pages as SitePage[]) : [];
    const siteName = project.siteName ?? project.name ?? "Projeto Merse";
    const brief = project.rawBrief ?? "";
    let provider = typeof imageProvider === "string" ? imageProvider : "merse";

    const merseModel = process.env.REPLICATE_MERSE_MODEL ?? "";
    if (!merseModel || merseModel.includes("site")) {
      // se o modelo Merse configurado não é de imagem, caia para openai
      provider = "openai";
      await addProjectEvent(
        projectId,
        "Fallback para OpenAI: modelo Merse de imagem não configurado ou aponta para gerador de site.",
        "warning",
        "images",
      );
    }

    // Status inicial
    await projectRef.set(
      {
        status: "assets_generating",
        progress: autoProgress("assets_generating" satisfies SiteStatus),
        currentStep: "Inicializando geração de assets...",
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    await addProjectEvent(projectId, "Iniciando geração de imagens e código.", "info", "start");

    // Geração de imagens em batch com retry
    const targets: Array<{ prompt: string; pageIndex: number; sectionIndex: number }> = [];
    pages.forEach((page, pageIndex) => {
      page.sections?.forEach((section, sectionIndex) => {
        if (section.imagePrompt && !section.imageUrl) {
          targets.push({
            prompt: `${section.imagePrompt}\nContexto do site ${siteName}. Brief: ${brief}`,
            pageIndex,
            sectionIndex,
          });
        }
      });
    });

    if (targets.length > 0) {
      await projectRef.set(
        {
          currentStep: "Gerando imagens com Merse AI...",
          progress: autoProgress("assets_generating" satisfies SiteStatus),
        },
        { merge: true },
      );
      await addProjectEvent(projectId, `Gerando ${targets.length} imagens das seções...`, "info", "images");

      const results = await generateImagesInBatches(
        targets.map((t, idx) => ({ prompt: t.prompt, index: idx })),
        provider,
        async (done, total) => {
          const base = autoProgress("assets_generating" satisfies SiteStatus);
          const pct = base + Math.floor((done / total) * 15); // avança progress enquanto gera imagens
          await projectRef.set({ progress: pct, currentStep: `Gerando imagens (${done}/${total})` }, { merge: true });
        },
      );

      results.forEach((url, idx) => {
        if (!url) return;
        const target = targets[idx]!;
        const section = pages[target.pageIndex]?.sections?.[target.sectionIndex];
        if (section) {
          (section as any).imageUrl = url;
        }
      });
    } else {
      await addProjectEvent(projectId, "Nenhuma imagem pendente para gerar.", "info", "images");
    }

    await projectRef.set(
      {
        pages,
        progress: 45,
        currentStep: "Imagens geradas. Preparando código...",
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    // Geração do código do site
    await addProjectEvent(projectId, "Iniciando geração do código do site.", "info", "code");

    const codePrompt = `
Você é um desenvolvedor sênior em Next.js + React + Tailwind para um produto premium.
Gere o código de uma landing page principal com base no JSON abaixo.
- Use seções e textos do JSON.
- Use as imagens já geradas (imageUrl).
- Estilo: visual galáctico, elegante, profissional.
- Use Tailwind no JSX.
- Organize em um único arquivo React para a página principal, chamado "GeneratedSite.tsx".
- Apenas código, sem explicações.

JSON:
${JSON.stringify(pages, null, 2)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "Você gera código de front-end profissional." },
        { role: "user", content: codePrompt },
      ],
      temperature: 0.4,
    });

    const generatedCode = completion.choices[0]?.message?.content ?? "";

    // Construir arquivos estruturados (Next.js app router)
    const files = buildProjectFiles(pages, siteName);

    // Gravar arquivos localmente em /tmp e opcionalmente em R2
    const assetsBuild: Record<string, { url: string | null; path: string | null }> = {};
    const projectFolder = path.join("/tmp", "merse-projects", projectId);
    const tmpBase = path.join(projectFolder, "bundle");
    await fs.mkdir(tmpBase, { recursive: true });
    for (const [relPath, content] of Object.entries(files)) {
      const dest = path.join(tmpBase, relPath);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, content, "utf-8");
      assetsBuild[relPath] = { url: null, path: dest };
      if (isR2Enabled()) {
        const key = `site_projects/${projectId}/bundle/${relPath}`;
        const url = await uploadBufferToR2({
          buffer: Buffer.from(content, "utf-8"),
          contentType: relPath.endsWith(".css") ? "text/css" : "text/plain",
          key,
        });
        assetsBuild[relPath] = { url, path: key };
      }
    }

    // Garantir placeholders se alguma imagem falhou
    pages.forEach((page) => {
      page.sections?.forEach((section) => {
        if (!section.imageUrl && section.imagePrompt) {
          section.imageUrl = "https://merse.app/placeholder/cosmic-default.png";
        }
      });
    });

    // Empacotar .zip local
    const zipPath = path.join("/tmp", "merse-projects", `${projectId}.zip`);
    try {
      const zip = new AdmZip();
      zip.addLocalFolder(projectFolder);
      zip.writeZip(zipPath);
    } catch (err) {
      console.warn("Falha ao compactar zip", err);
    }

    await projectRef.update({
      status: "assets_ready",
      currentStep: "Assets gerados localmente. Pronto para download.",
      progress: 85,
      updatedAt: Date.now(),
    });

    await addProjectEvent(projectId, "Código do site gerado com sucesso.", "info", "code");

    await projectRef.set(
      {
        progress: Math.max(autoProgress("assets_ready" satisfies SiteStatus), 90),
        currentStep: "Assets prontos. Aguardando revisão ou publicação.",
      },
      { merge: true },
    );

    return res.status(200).json({
      projectId,
      status: "assets_ready",
      downloadUrl: `/api/site/download?projectId=${projectId}`,
      message: "Projeto gerado com sucesso!",
    });
  } catch (error) {
    console.error("[generate-assets] Erro:", error);
    if (projectId) {
      try {
        await adminDb.collection("site_projects").doc(projectId).set(
          {
            status: "failed",
            currentStep: "Falha ao gerar assets.",
            progress: 0,
            updatedAt: Date.now(),
          },
          { merge: true },
        );
        await addProjectEvent(projectId, "Falha crítica na geração de assets.", "error", "error");
      } catch (persistError) {
        console.error("[generate-assets] Falha ao registrar erro no Firestore:", persistError);
      }
    }
    return res.status(500).json({ error: "Erro interno ao gerar assets." });
  }
}
