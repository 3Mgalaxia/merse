import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";

import { adminDb } from "@/lib/firebaseAdmin";

type ProjectKind = "site_project" | "builder_project";

type ProjectSummary = {
  id: string;
  kind: ProjectKind;
  name: string;
  status: string;
  previewUrl: string;
  deployedUrl?: string;
};

type SuccessResponse = {
  project: ProjectSummary;
  editableHtml: string;
  rawCode: string;
  rawLanguage: "html" | "tsx" | "txt";
  sourceType: "builder_html" | "site_index_html" | "site_page_tsx" | "site_bundle" | "site_pages_json" | "fallback";
};

type ErrorResponse = {
  error: string;
};

const MAX_CODE_LENGTH = 180_000;

function normalizeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCodeShellHtml({
  code,
  language,
  title,
  hint,
}: {
  code: string;
  language: string;
  title: string;
  hint: string;
}) {
  const safeCode = escapeHtml(code.slice(0, MAX_CODE_LENGTH));
  const safeHint = escapeHtml(hint);
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        font-family: "Space Grotesk", "Inter", system-ui, sans-serif;
        background: radial-gradient(circle at top, #101529, #06070e 58%, #040507 100%);
        color: #e2e8f0;
      }
      .shell {
        min-height: 100vh;
        display: grid;
        gap: 1rem;
        padding: 2rem;
      }
      .hero {
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(15,23,42,.55);
        border-radius: 18px;
        padding: 1rem 1.2rem;
      }
      .hero h1 {
        margin: 0;
        font-size: 1.1rem;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .hero p {
        margin: .5rem 0 0;
        color: rgba(226,232,240,.75);
        line-height: 1.5;
      }
      .code {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 18px;
        overflow: auto;
        background: rgba(2,6,23,.7);
        box-shadow: 0 20px 50px rgba(0,0,0,.45);
      }
      .code header {
        display: flex;
        justify-content: space-between;
        gap: .8rem;
        padding: .75rem 1rem;
        border-bottom: 1px solid rgba(255,255,255,.1);
        font-size: .72rem;
        letter-spacing: .15em;
        text-transform: uppercase;
        color: rgba(226,232,240,.65);
      }
      pre {
        margin: 0;
        padding: 1rem;
        font: 12px/1.55 "JetBrains Mono", "Fira Code", monospace;
        color: #e2e8f0;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <h1>Live Dev Visual</h1>
        <p>${safeHint}</p>
      </section>
      <section class="code">
        <header>
          <span>Arquivo carregado</span>
          <span>${escapeHtml(language)}</span>
        </header>
        <pre>${safeCode}</pre>
      </section>
    </main>
  </body>
</html>`;
}

function pageJsonToHtml(name: string, pages: unknown): string {
  const normalizedPages = Array.isArray(pages)
    ? pages.filter((page) => page && typeof page === "object")
    : [];

  const content = normalizedPages
    .map((page, pageIndex) => {
      const pageRecord = page as Record<string, unknown>;
      const title = normalizeString(pageRecord.title, `Página ${pageIndex + 1}`);
      const sections = Array.isArray(pageRecord.sections)
        ? pageRecord.sections.filter((section) => section && typeof section === "object")
        : [];

      const sectionsHtml = sections
        .map((section, sectionIndex) => {
          const sectionRecord = section as Record<string, unknown>;
          const sectionTitle = normalizeString(
            sectionRecord.title,
            normalizeString(sectionRecord.type, `Seção ${sectionIndex + 1}`),
          );
          const sectionCopy = normalizeString(
            sectionRecord.copy,
            normalizeString(sectionRecord.description, ""),
          );
          return `<article class="panel">
  <h3>${escapeHtml(sectionTitle)}</h3>
  <p>${escapeHtml(sectionCopy || "Conteúdo da seção em preparação.")}</p>
</article>`;
        })
        .join("\n");

      return `<section class="page-block">
  <header>
    <h2>${escapeHtml(title)}</h2>
  </header>
  <div class="grid">
    ${sectionsHtml || '<article class="panel"><h3>Sem seções</h3><p>Este blueprint ainda não definiu seções.</p></article>'}
  </div>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(name)}</title>
    <style>
      body { margin: 0; font-family: "Space Grotesk", "Inter", system-ui, sans-serif; background: #05060b; color: #e2e8f0; }
      main { max-width: 1080px; margin: 0 auto; padding: 2.2rem 1.1rem 3rem; display: grid; gap: 1rem; }
      .page-block { border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(15,23,42,.45); padding: 1rem; }
      .page-block h2 { margin: 0 0 .7rem; font-size: 1.12rem; }
      .grid { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); }
      .panel { border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: .8rem; background: rgba(2,6,23,.55); }
      .panel h3 { margin: 0 0 .35rem; font-size: .92rem; }
      .panel p { margin: 0; color: rgba(226,232,240,.75); line-height: 1.55; font-size: .86rem; }
    </style>
  </head>
  <body>
    <main>
      <section class="page-block">
        <h2>Blueprint carregado</h2>
        <p>Base inicial gerada do JSON de páginas do projeto.</p>
      </section>
      ${content || ""}
    </main>
  </body>
</html>`;
}

async function fetchTextFromUrl(url?: string | null): Promise<string> {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const response = await fetch(trimmed);
    if (!response.ok) return "";
    const text = await response.text();
    return text.slice(0, MAX_CODE_LENGTH);
  } catch {
    return "";
  }
}

function hasOwnerMismatch(uid: string, data: Record<string, unknown>): boolean {
  const ownerKeys = ["userId", "uid", "ownerId", "ownerUid"];
  const owners = ownerKeys
    .map((key) => data[key])
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());

  if (!owners.length) return false;
  return !owners.includes(uid);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const projectId = typeof req.body?.projectId === "string" ? req.body.projectId.trim() : "";
  const requestedKind =
    req.body?.kind === "site_project" || req.body?.kind === "builder_project"
      ? (req.body.kind as ProjectKind)
      : undefined;

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação ausente." });
  }

  if (!projectId) {
    return res.status(400).json({ error: "projectId é obrigatório." });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const lookupOrder: ProjectKind[] = requestedKind
      ? [requestedKind]
      : ["site_project", "builder_project"];

    let projectKind: ProjectKind | null = null;
    let projectData: Record<string, unknown> | null = null;

    for (const kind of lookupOrder) {
      const collectionName = kind === "site_project" ? "site_projects" : "projects";
      const snapshot = await adminDb.collection(collectionName).doc(projectId).get();
      if (!snapshot.exists) continue;

      const data = (snapshot.data() ?? {}) as Record<string, unknown>;
      if (hasOwnerMismatch(uid, data)) {
        return res.status(403).json({ error: "Você não possui acesso a este projeto." });
      }

      projectKind = kind;
      projectData = data;
      break;
    }

    if (!projectKind || !projectData) {
      return res.status(404).json({ error: "Projeto não encontrado." });
    }

    let editableHtml = "";
    let rawCode = "";
    let rawLanguage: "html" | "tsx" | "txt" = "txt";
    let sourceType: SuccessResponse["sourceType"] = "fallback";

    if (projectKind === "builder_project") {
      const html = normalizeString(projectData.html, "");
      if (!html) {
        return res.status(404).json({ error: "Projeto sem HTML disponível para edição." });
      }

      editableHtml = html;
      rawCode = html;
      rawLanguage = "html";
      sourceType = "builder_html";
    } else {
      const assets = (projectData.assets ?? {}) as Record<string, unknown>;
      const build = (assets.build ?? {}) as Record<string, unknown>;

      const indexUrl = (build.index as { url?: unknown } | undefined)?.url;
      const indexHtml = await fetchTextFromUrl(typeof indexUrl === "string" ? indexUrl : null);

      if (indexHtml && /<html|<!doctype/i.test(indexHtml)) {
        editableHtml = indexHtml;
        rawCode = indexHtml;
        rawLanguage = "html";
        sourceType = "site_index_html";
      } else {
        const pageUrl = (build["pages/app/page.tsx"] as { url?: unknown } | undefined)?.url;
        const pageTsx = await fetchTextFromUrl(typeof pageUrl === "string" ? pageUrl : null);

        if (pageTsx) {
          rawCode = pageTsx;
          rawLanguage = "tsx";
          sourceType = "site_page_tsx";
          editableHtml = buildCodeShellHtml({
            code: pageTsx,
            language: "TSX",
            title: normalizeString(projectData.siteName, "Projeto Merse"),
            hint:
              "Visualização baseada no arquivo TSX principal. Digite comandos no painel para gerar uma versão HTML editável ao lado.",
          });
        } else if (typeof build.bundle === "string" && build.bundle.trim()) {
          rawCode = build.bundle.slice(0, MAX_CODE_LENGTH);
          rawLanguage = "txt";
          sourceType = "site_bundle";
          editableHtml = buildCodeShellHtml({
            code: rawCode,
            language: "Bundle",
            title: normalizeString(projectData.siteName, "Projeto Merse"),
            hint:
              "Bundle carregado do projeto. Você pode iterar no painel para produzir uma versão HTML editável sem abrir o terminal.",
          });
        } else if (Array.isArray(projectData.pages) && projectData.pages.length > 0) {
          editableHtml = pageJsonToHtml(
            normalizeString(projectData.siteName, "Projeto Merse"),
            projectData.pages,
          );
          rawCode = JSON.stringify(projectData.pages, null, 2).slice(0, MAX_CODE_LENGTH);
          rawLanguage = "txt";
          sourceType = "site_pages_json";
        } else {
          editableHtml = buildCodeShellHtml({
            code: "Nenhum código renderizável encontrado no projeto.",
            language: "TXT",
            title: normalizeString(projectData.siteName, "Projeto Merse"),
            hint:
              "Esse projeto ainda não gerou assets de código. Execute a geração antes de editar em modo live.",
          });
          rawCode = "";
          rawLanguage = "txt";
          sourceType = "fallback";
        }
      }
    }

    const project: ProjectSummary = {
      id: projectId,
      kind: projectKind,
      name:
        normalizeString(projectData.siteName, "") ||
        normalizeString(projectData.name, "") ||
        normalizeString(projectData.summary, "Projeto Merse"),
      status: normalizeString(projectData.status, "draft"),
      previewUrl:
        projectKind === "site_project"
          ? `/sandbox/preview?projectId=${projectId}`
          : `/p/${projectId}`,
      deployedUrl:
        typeof projectData.deployedUrl === "string" && projectData.deployedUrl.trim()
          ? projectData.deployedUrl.trim()
          : undefined,
    };

    return res.status(200).json({
      project,
      editableHtml,
      rawCode,
      rawLanguage,
      sourceType,
    });
  } catch (error) {
    console.error("[codex/load-project] erro:", error);
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar o projeto.";
    return res.status(500).json({ error: message });
  }
}
