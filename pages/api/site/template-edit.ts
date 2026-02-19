import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import AdmZip from "adm-zip";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

type FeatureFlags = {
  preview?: boolean;
  seo?: boolean;
  auth?: boolean;
  cms?: boolean;
};

type RequestBody = {
  prompt?: unknown;
  projectName?: unknown;
  mode?: unknown;
  tone?: unknown;
  brandColors?: unknown;
  features?: unknown;
};

type SuccessResponse = {
  runId: string;
  outputDir: string;
  summary: string;
  updatedFiles: string[];
  previewCode: string;
  downloadUrl: string | null;
};

type ErrorResponse = { error: string; details?: string[] };

type ModelJson = {
  summary?: string;
  files?: Record<string, string>;
};

const TEMPLATE_ROOT = path.join(process.cwd(), "merse-template");
const OUTPUT_ROOT = path.join(process.cwd(), ".tmp-local-runtime", "site-ia-template");
const TEMPLATE_ZIP_ROOT = path.join("/tmp", "merse-site-ia-template-zips");

const TARGET_FILES = [
  "src/app/page.tsx",
  "src/components/page-shell.tsx",
  "src/app/globals.css",
] as const;

const COPY_IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".next-dev",
  ".next-build",
  "node_modules",
  "dist",
  "out",
]);

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function sanitizeSlug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "site-merse"
  );
}

function normalizeFeatures(raw: unknown): Required<FeatureFlags> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { preview: true, seo: false, auth: false, cms: false };
  }
  const value = raw as FeatureFlags;
  return {
    preview: Boolean(value.preview),
    seo: Boolean(value.seo),
    auth: Boolean(value.auth),
    cms: Boolean(value.cms),
  };
}

function extractJsonCandidate(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function assertSafeTarget(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error(`Caminho inválido: ${relativePath}`);
  }
  return normalized;
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyTemplateRecursive(srcDir: string, destDir: string) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && COPY_IGNORED_DIRS.has(entry.name)) {
      continue;
    }
    if (entry.isFile() && entry.name.startsWith(".env")) {
      continue;
    }

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await copyTemplateRecursive(srcPath, destPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
    }
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

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada no servidor." });
  }

  const payload = (req.body ?? {}) as RequestBody;
  const prompt = toText(payload.prompt);
  const projectName = toText(payload.projectName, "Projeto Merse");
  const mode = toText(payload.mode, "site-generator");
  const tone = toText(payload.tone, "futurista");
  const brandColors = toText(payload.brandColors, "azul, roxo");
  const features = normalizeFeatures(payload.features);

  if (!prompt) {
    return res.status(400).json({ error: "Descreva o briefing/prompt do site." });
  }

  const hasTemplate = await pathExists(TEMPLATE_ROOT);
  if (!hasTemplate) {
    return res.status(404).json({ error: "Pasta merse-template não encontrada na raiz do projeto." });
  }

  const runId = randomUUID();
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const outputDir = path.join(OUTPUT_ROOT, `${sanitizeSlug(projectName)}-${timestamp}`);

  try {
    await copyTemplateRecursive(TEMPLATE_ROOT, outputDir);

    const currentFiles = await Promise.all(
      TARGET_FILES.map(async (relativePath) => {
        const safe = assertSafeTarget(relativePath);
        const absolutePath = path.join(outputDir, safe);
        const content = await fs.readFile(absolutePath, "utf-8");
        return { relativePath: safe, content };
      }),
    );

    const filesSnapshot = currentFiles
      .map((file) => `### ${file.relativePath}\n\`\`\`tsx\n${file.content}\n\`\`\``)
      .join("\n\n");

    const briefContext = [
      `Projeto: ${projectName}`,
      `Modo: ${mode}`,
      `Tom: ${tone}`,
      `Cores da marca: ${brandColors}`,
      `Features ativas: preview=${features.preview}, seo=${features.seo}, auth=${features.auth}, cms=${features.cms}`,
      `Briefing do usuário: ${prompt}`,
    ].join("\n");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const completion = await openai.chat.completions.create({
      model: (process.env.OPENAI_CODEX_MODEL ?? "gpt-4.1").trim(),
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: [
            "Você é um engenheiro front-end sênior especializado em Next.js (App Router) e design premium.",
            "Sua tarefa é editar um template existente sem quebrar TypeScript.",
            "Retorne APENAS JSON válido (sem markdown).",
            "JSON obrigatório:",
            '{"summary":"string curto","files":{"src/app/page.tsx":"...","src/components/page-shell.tsx":"...","src/app/globals.css":"..."}}',
            "Mantenha os imports necessários e o projeto compilável.",
            "Não inclua explicações fora do JSON.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            "Aplique este briefing ao template e deixe o site claramente melhor em conversão, clareza e estética.",
            "",
            "CONTEXTO:",
            briefContext,
            "",
            "ARQUIVOS ATUAIS:",
            filesSnapshot,
          ].join("\n"),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenAI retornou resposta vazia ao editar o template.");
    }

    const jsonCandidate = extractJsonCandidate(content);
    let parsed: ModelJson;
    try {
      parsed = JSON.parse(jsonCandidate) as ModelJson;
    } catch (error) {
      throw new Error(
        `Não foi possível interpretar JSON da OpenAI. Resposta recebida: ${jsonCandidate.slice(0, 240)}...`,
      );
    }

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "Template ajustado com sucesso.";

    const files = parsed.files ?? {};
    const updatedFiles: string[] = [];

    for (const relativePath of TARGET_FILES) {
      const nextContent = files[relativePath];
      if (typeof nextContent !== "string" || nextContent.trim().length < 40) {
        continue;
      }
      const safe = assertSafeTarget(relativePath);
      const absolutePath = path.join(outputDir, safe);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, nextContent, "utf-8");
      updatedFiles.push(relativePath);
    }

    if (!updatedFiles.length) {
      throw new Error("A OpenAI não retornou conteúdo válido para os arquivos alvo.");
    }

    const previewCode =
      typeof files["src/app/page.tsx"] === "string"
        ? files["src/app/page.tsx"].slice(0, 9000)
        : await fs.readFile(path.join(outputDir, "src/app/page.tsx"), "utf-8");

    let downloadUrl: string | null = null;
    try {
      await fs.mkdir(TEMPLATE_ZIP_ROOT, { recursive: true });
      const zipPath = path.join(TEMPLATE_ZIP_ROOT, `${runId}.zip`);
      const zip = new AdmZip();
      zip.addLocalFolder(outputDir);
      zip.writeZip(zipPath);
      downloadUrl = `/api/site/template-download?runId=${runId}`;
    } catch (zipError) {
      console.warn("[site/template-edit] falha ao gerar zip:", zipError);
    }

    return res.status(200).json({
      runId,
      outputDir,
      summary,
      updatedFiles,
      previewCode,
      downloadUrl,
    });
  } catch (error) {
    console.error("[site/template-edit] erro:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Falha ao personalizar o merse-template.",
    });
  }
}
