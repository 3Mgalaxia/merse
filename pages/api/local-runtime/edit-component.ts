import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

import {
  getRuntimeComponentHint,
  getRuntimeSession,
  sanitizeRelativePath,
  setRuntimeComponentHint,
} from "@/lib/local-runtime/store";

type SuccessResponse = {
  ok: true;
  filePath: string;
  message: string;
};

type ErrorResponse = {
  error: string;
};

const MAX_FILE_SIZE = 220_000;
const MAX_ATTACHMENT_BYTES = 120_000;
const MAX_COMPONENT_BLOCK_SIZE = 72_000;
const MAX_SCAN_FILES = 900;
const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", ".turbo", "dist", "build"]);
const ALLOWED_EXT = new Set([".tsx", ".jsx", ".ts", ".js"]);
const GENERIC_COMPONENT_NAMES = new Set(["component", "componente", "element", "elemento", "unknown"]);
const GENERIC_SELECTOR_HINTS = new Set([
  "element",
  "div",
  "span",
  "section",
  "main",
  "article",
  "header",
  "footer",
  "nav",
  "button",
  "input",
  "img",
  "a",
  "p",
]);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

function extractCode(raw: string) {
  const fenceMatch = raw.match(/```(?:tsx|ts|jsx|js)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch?.[1] ?? raw;
  return candidate.trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGenericComponentName(componentName: string) {
  const normalized = componentName.trim().toLowerCase();
  if (!normalized) return true;
  return GENERIC_COMPONENT_NAMES.has(normalized);
}

function parseSelectorHint(selectorHint: string) {
  const raw = selectorHint.trim();
  const normalizedRaw = raw.toLowerCase();
  const idToken = raw.match(/#([a-zA-Z0-9_-]+)/)?.[1] ?? "";
  const classTokens = Array.from(raw.matchAll(/\.([a-zA-Z0-9_-]+)/g))
    .map((match) => match[1])
    .filter(Boolean);

  const uniqueClassTokens = Array.from(new Set(classTokens));
  const hasUsefulValue =
    Boolean(idToken) ||
    uniqueClassTokens.length > 0 ||
    Boolean(raw && !GENERIC_SELECTOR_HINTS.has(normalizedRaw) && normalizedRaw.length > 3);

  return {
    raw,
    normalizedRaw,
    idToken,
    classTokens: uniqueClassTokens,
    hasUsefulValue,
  };
}

function findMatchingBraceIndex(source: string, openBraceIndex: number) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inSingle) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === "'") inSingle = false;
      continue;
    }

    if (inDouble) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === '"') inDouble = false;
      continue;
    }

    if (inTemplate) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === "`") {
        inTemplate = false;
        continue;
      }
    } else {
      if (char === "/" && next === "/") {
        inLineComment = true;
        index += 1;
        continue;
      }

      if (char === "/" && next === "*") {
        inBlockComment = true;
        index += 1;
        continue;
      }

      if (char === "'") {
        inSingle = true;
        continue;
      }

      if (char === '"') {
        inDouble = true;
        continue;
      }

      if (char === "`") {
        inTemplate = true;
        continue;
      }
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

type ComponentBlock = {
  start: number;
  end: number;
  code: string;
};

function findComponentBlock(source: string, componentName: string): ComponentBlock | null {
  const safeName = escapeRegExp(componentName.trim());
  if (!safeName) return null;

  const patterns = [
    new RegExp(`(?:export\\s+default\\s+)?function\\s+${safeName}\\s*\\(`),
    new RegExp(`(?:export\\s+)?const\\s+${safeName}\\s*(?::[^=]+)?=`),
    new RegExp(`(?:export\\s+)?class\\s+${safeName}\\s+`),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (!match || typeof match.index !== "number") continue;

    const blockStart = match.index;
    const openBraceIndex = source.indexOf("{", blockStart);
    if (openBraceIndex < 0) continue;

    const closeBraceIndex = findMatchingBraceIndex(source, openBraceIndex);
    if (closeBraceIndex < 0) continue;

    let blockEnd = closeBraceIndex + 1;
    const tail = source.slice(blockEnd);
    const semicolonMatch = tail.match(/^\s*;/);
    if (semicolonMatch) {
      blockEnd += semicolonMatch[0].length;
    }

    const code = source.slice(blockStart, blockEnd);
    if (!code.trim()) continue;

    return {
      start: blockStart,
      end: blockEnd,
      code,
    };
  }

  return null;
}

async function completeWithModel(
  openai: OpenAI,
  params: {
    model: string;
    fallbackModel?: string;
    maxTokens: number;
    messages: Array<{ role: "system" | "user"; content: string }>;
  },
) {
  const { model, fallbackModel, maxTokens, messages } = params;

  try {
    return await openai.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages,
    });
  } catch (error) {
    if (fallbackModel && fallbackModel !== model) {
      return await openai.chat.completions.create({
        model: fallbackModel,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages,
      });
    }
    throw error;
  }
}

function isTextAttachment(name: string, mimeType: string) {
  const normalizedName = name.toLowerCase();
  const normalizedMime = mimeType.toLowerCase();
  if (normalizedMime.startsWith("text/")) return true;
  if (normalizedMime.includes("json") || normalizedMime.includes("xml") || normalizedMime.includes("javascript")) return true;

  return [".txt", ".md", ".json", ".yaml", ".yml", ".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".svg"].some((ext) =>
    normalizedName.endsWith(ext),
  );
}

function buildAttachmentContext(params: {
  attachmentName: string;
  attachmentMimeType: string;
  attachmentSize: number;
  attachmentBase64: string;
}) {
  const { attachmentName, attachmentMimeType, attachmentSize, attachmentBase64 } = params;
  if (!attachmentBase64) return "";

  const bytes = Buffer.from(attachmentBase64, "base64");
  if (!bytes.length) return "";

  const clipped = bytes.byteLength > MAX_ATTACHMENT_BYTES ? bytes.subarray(0, MAX_ATTACHMENT_BYTES) : bytes;
  const header = [
    "Arquivo de referência enviado junto ao prompt:",
    `nome: ${attachmentName || "arquivo-anexo"}`,
    `tipo: ${attachmentMimeType || "application/octet-stream"}`,
    `tamanho: ${attachmentSize || bytes.byteLength} bytes`,
  ].join("\n");

  if (isTextAttachment(attachmentName, attachmentMimeType)) {
    const textSnippet = clipped.toString("utf-8").slice(0, 10_000);
    return [header, "Trecho textual do arquivo:", "```", textSnippet, "```"].join("\n");
  }

  return [header, "Observação: arquivo binário/imagem anexado como referência visual."].join("\n");
}

async function walkCodeFiles(rootDir: string, currentRelative = ""): Promise<string[]> {
  const absoluteDir = path.join(rootDir, currentRelative);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of entries) {
    if (collected.length >= MAX_SCAN_FILES) break;
    const relPath = path.posix.join(currentRelative, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const nested = await walkCodeFiles(rootDir, relPath);
      collected.push(...nested);
      if (collected.length >= MAX_SCAN_FILES) break;
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;
    collected.push(relPath);
  }

  return collected;
}

function scoreFileForComponent(componentName: string, filePath: string, source: string) {
  const normalizedName = componentName.toLowerCase();
  const normalizedPath = filePath.toLowerCase();
  const safeName = escapeRegExp(componentName);

  let score = 0;

  if (normalizedPath.endsWith(`/${normalizedName}.tsx`) || normalizedPath.endsWith(`/${normalizedName}.jsx`)) {
    score += 220;
  }
  if (normalizedPath.includes(normalizedName)) {
    score += 70;
  }
  if (new RegExp(`\\bfunction\\s+${safeName}\\b`).test(source)) {
    score += 160;
  }
  if (new RegExp(`\\bconst\\s+${safeName}\\b`).test(source)) {
    score += 120;
  }
  if (new RegExp(`<${safeName}[\\s>]`).test(source)) {
    score += 90;
  }
  if (source.toLowerCase().includes(normalizedName)) {
    score += 25;
  }

  return score;
}

function normalizeRoutePath(rawRoutePath: string) {
  const clean = rawRoutePath.split("?")[0].split("#")[0].trim();
  if (!clean) return "/";
  if (clean === "/") return "/";
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function buildRouteCandidates(routePath: string) {
  const route = normalizeRoutePath(routePath);
  const routePart = route === "/" ? "index" : route.replace(/^\/+/, "");
  const extensions = [".tsx", ".ts", ".jsx", ".js", ".mdx"];
  const candidates: string[] = [];

  if (route === "/") {
    for (const ext of extensions) {
      candidates.push(`pages/index${ext}`);
      candidates.push(`src/pages/index${ext}`);
      candidates.push(`app/page${ext}`);
      candidates.push(`src/app/page${ext}`);
    }
    return candidates;
  }

  for (const ext of extensions) {
    candidates.push(`pages/${routePart}${ext}`);
    candidates.push(`pages/${routePart}/index${ext}`);
    candidates.push(`src/pages/${routePart}${ext}`);
    candidates.push(`src/pages/${routePart}/index${ext}`);
    candidates.push(`app/${routePart}/page${ext}`);
    candidates.push(`src/app/${routePart}/page${ext}`);
  }

  return candidates;
}

function scoreFileForHints(params: {
  filePath: string;
  source: string;
  selectorHint: string;
  textPreview: string;
  routePath: string;
}) {
  const { filePath, source, selectorHint, textPreview, routePath } = params;
  const normalizedPath = filePath.toLowerCase();
  const normalizedSource = source.toLowerCase();
  let score = 0;

  const normalizedRoute = normalizeRoutePath(routePath);
  if (normalizedRoute === "/") {
    if (/(^|\/)(pages\/index|app\/page|src\/pages\/index|src\/app\/page)\.(tsx|ts|jsx|js|mdx)$/i.test(normalizedPath)) {
      score += 80;
    }
  } else {
    const pathHint = normalizedRoute.replace(/^\/+/, "");
    const escapedPathHint = escapeRegExp(pathHint);
    if (
      new RegExp(`(^|/)pages/${escapedPathHint}(?:/|\\.|$)`, "i").test(normalizedPath) ||
      new RegExp(`(^|/)app/${escapedPathHint}(?:/|\\.|$)`, "i").test(normalizedPath) ||
      new RegExp(`(^|/)src/pages/${escapedPathHint}(?:/|\\.|$)`, "i").test(normalizedPath) ||
      new RegExp(`(^|/)src/app/${escapedPathHint}(?:/|\\.|$)`, "i").test(normalizedPath)
    ) {
      score += 80;
    }
    if (normalizedPath.includes(pathHint.toLowerCase())) {
      score += 30;
    }
  }

  const parsedSelector = parseSelectorHint(selectorHint);
  if (parsedSelector.idToken) {
    if (new RegExp(`id\\s*=\\s*["'\`]${escapeRegExp(parsedSelector.idToken)}["'\`]`, "i").test(source)) score += 120;
    if (normalizedSource.includes(parsedSelector.idToken.toLowerCase())) score += 35;
  }

  for (const classToken of parsedSelector.classTokens.slice(0, 4)) {
    if (new RegExp(`class(?:name)?\\s*=\\s*["'\`][^"'\`]*\\b${escapeRegExp(classToken)}\\b`, "i").test(source)) {
      score += 80;
    }
    if (normalizedSource.includes(classToken.toLowerCase())) score += 24;
  }

  const text = textPreview.trim().toLowerCase();
  if (text.length >= 3) {
    if (normalizedSource.includes(text)) {
      score += 90;
    } else {
      const words = text
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3)
        .slice(0, 5);
      let hits = 0;
      for (const word of words) {
        if (normalizedSource.includes(word)) hits += 1;
      }
      score += hits * 18;
    }
  }

  return score;
}

async function resolveTargetFilePath(params: {
  sessionId: string;
  rootDir: string;
  rawFilePath: string;
  componentName: string;
  selectorHint: string;
  textPreview: string;
  routePath: string;
}) {
  const { sessionId, rootDir, rawFilePath, componentName, selectorHint, textPreview, routePath } = params;

  if (rawFilePath) {
    const safePath = sanitizeRelativePath(rawFilePath);
    if (!safePath) return null;

    const absolutePath = path.join(rootDir, safePath);
    const resolvedRoot = path.resolve(rootDir);
    const resolvedPath = path.resolve(absolutePath);
    if (!resolvedPath.startsWith(resolvedRoot)) return null;

    try {
      await fs.access(resolvedPath);
      return safePath;
    } catch {
      return null;
    }
  }

  const cleanComponent = componentName.trim();
  const hasComponentContext = !isGenericComponentName(cleanComponent);
  const parsedSelector = parseSelectorHint(selectorHint);
  const normalizedTextPreview = textPreview.trim();
  const hasTextContext = normalizedTextPreview.length >= 3;
  const hasContextHints = parsedSelector.hasUsefulValue || hasTextContext;

  if (hasComponentContext) {
    const cachedHint = getRuntimeComponentHint(sessionId, cleanComponent);
    if (cachedHint) {
      const resolvedHint = sanitizeRelativePath(cachedHint);
      if (resolvedHint) {
        try {
          await fs.access(path.join(rootDir, resolvedHint));
          return resolvedHint;
        } catch {
          // ignore invalid stale hint
        }
      }
    }
  }

  const routeCandidates = buildRouteCandidates(routePath);
  let firstExistingRouteCandidate = "";
  for (const candidate of routeCandidates) {
    // eslint-disable-next-line no-await-in-loop
    const safeCandidate = sanitizeRelativePath(candidate);
    if (!safeCandidate) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await fs.access(path.join(rootDir, safeCandidate));
      if (!firstExistingRouteCandidate) {
        firstExistingRouteCandidate = safeCandidate;
      }
      if (!hasContextHints && !hasComponentContext) {
        return safeCandidate;
      }
    } catch {
      // ignore missing route candidate
    }
  }

  const files = await walkCodeFiles(rootDir);
  let bestPath = "";
  let bestScore = 0;

  for (const filePath of files) {
    // eslint-disable-next-line no-await-in-loop
    const source = await fs.readFile(path.join(rootDir, filePath), "utf-8").catch(() => "");
    if (!source) continue;

    let score = 0;
    if (hasComponentContext) {
      score += scoreFileForComponent(cleanComponent, filePath, source.slice(0, 40_000));
    }

    score += scoreFileForHints({
      filePath,
      source: source.slice(0, 60_000),
      selectorHint,
      textPreview,
      routePath,
    });

    if (score > bestScore) {
      bestScore = score;
      bestPath = filePath;
    }
  }

  if (!bestPath || bestScore <= 0) {
    return firstExistingRouteCandidate || null;
  }
  if (hasComponentContext) {
    setRuntimeComponentHint(sessionId, cleanComponent, bestPath);
  }
  return bestPath;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
  const rawFilePath = typeof req.body?.filePath === "string" ? req.body.filePath.trim() : "";
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const componentName =
    typeof req.body?.componentName === "string" && req.body.componentName.trim()
      ? req.body.componentName.trim()
      : "Componente";
  const attachmentName =
    typeof req.body?.attachmentName === "string" && req.body.attachmentName.trim()
      ? req.body.attachmentName.trim()
      : "";
  const attachmentMimeType =
    typeof req.body?.attachmentMimeType === "string" && req.body.attachmentMimeType.trim()
      ? req.body.attachmentMimeType.trim()
      : "";
  const attachmentSize = Number.isFinite(Number(req.body?.attachmentSize)) ? Number(req.body?.attachmentSize) : 0;
  const attachmentBase64 =
    typeof req.body?.attachmentBase64 === "string" && req.body.attachmentBase64.trim()
      ? req.body.attachmentBase64.trim()
      : "";
  const selectorHint =
    typeof req.body?.selectorHint === "string" && req.body.selectorHint.trim() ? req.body.selectorHint.trim() : "";
  const textPreview =
    typeof req.body?.textPreview === "string" && req.body.textPreview.trim() ? req.body.textPreview.trim() : "";
  const routePath = typeof req.body?.routePath === "string" && req.body.routePath.trim() ? req.body.routePath.trim() : "/";

  if (!sessionId || !prompt) {
    return res.status(400).json({ error: "sessionId e prompt são obrigatórios." });
  }

  const session = getRuntimeSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada." });
  }

  const safePath = await resolveTargetFilePath({
    sessionId,
    rootDir: session.rootDir,
    rawFilePath,
    componentName,
    selectorHint,
    textPreview,
    routePath,
  });
  if (!safePath) {
    return res.status(400).json({
      error:
        "Não foi possível resolver o arquivo alvo. Selecione um componente no preview e envie um prompt com contexto.",
    });
  }

  const absolutePath = path.join(session.rootDir, safePath);
  const root = path.resolve(session.rootDir);
  const resolved = path.resolve(absolutePath);
  if (!resolved.startsWith(root)) {
    return res.status(400).json({ error: "filePath fora da raiz da sessão." });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY não encontrada no .env.local para editar código por prompt.",
    });
  }

  try {
    const startedAt = Date.now();
    const source = await fs.readFile(resolved, "utf-8");
    if (!source.trim()) {
      return res.status(400).json({ error: "Arquivo selecionado está vazio." });
    }

    if (source.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "Arquivo muito grande para edição automática." });
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const model = process.env.OPENAI_CODEX_MODEL?.trim() || "gpt-4.1-mini";
    const fastModel = process.env.OPENAI_CODEX_FAST_MODEL?.trim() || "gpt-4.1-nano";

    const attachmentContext = buildAttachmentContext({
      attachmentName,
      attachmentMimeType,
      attachmentSize,
      attachmentBase64,
    });

    const block = findComponentBlock(source, componentName);
    let updatedFile = "";

    if (block && block.code.length <= MAX_COMPONENT_BLOCK_SIZE) {
      const completion = await completeWithModel(openai, {
        model: fastModel,
        fallbackModel: model,
        maxTokens: 3200,
        messages: [
          {
            role: "system",
            content:
              "Você é o Merse Runtime Codex. Edite somente o bloco de componente recebido. Retorne somente o bloco final completo do componente, sem explicações.",
          },
          {
            role: "user",
            content: [
              `Arquivo alvo: ${safePath}`,
              `Componente alvo: ${componentName}`,
              `Tarefa: ${prompt}`,
              "",
              attachmentContext ? `${attachmentContext}\n` : "",
              "Bloco atual do componente:",
              "```tsx",
              block.code,
              "```",
            ].join("\n"),
          },
        ],
      });

      const blockOutput = completion.choices[0]?.message?.content ?? "";
      const updatedBlock = extractCode(blockOutput);

      if (updatedBlock && updatedBlock.length > 20) {
        updatedFile = `${source.slice(0, block.start)}${updatedBlock}\n${source.slice(block.end)}`.trimEnd();
      }
    }

    if (!updatedFile) {
      const completion = await completeWithModel(openai, {
        model,
        fallbackModel: fastModel,
        maxTokens: 8000,
        messages: [
          {
            role: "system",
            content:
              "Você é o Merse Runtime Codex. Edite o arquivo de componente mantendo o código funcional. Responda apenas com o conteúdo final completo do arquivo, sem explicações.",
          },
          {
            role: "user",
            content: [
              `Arquivo alvo: ${safePath}`,
              `Componente alvo: ${componentName}`,
              `Tarefa: ${prompt}`,
              "",
              attachmentContext ? `${attachmentContext}\n` : "",
              "Código atual:",
              "```tsx",
              source,
              "```",
            ].join("\n"),
          },
        ],
      });

      const output = completion.choices[0]?.message?.content ?? "";
      const updated = extractCode(output);
      if (!updated || !updated.includes("<") || updated.length < 20) {
        return res.status(500).json({ error: "A IA não retornou código válido para o arquivo." });
      }
      updatedFile = updated;
    }

    await fs.writeFile(resolved, `${updatedFile}\n`, "utf-8");

    setRuntimeComponentHint(sessionId, componentName, safePath);

    const elapsedMs = Date.now() - startedAt;
    console.log(`[local-runtime/edit-component] OpenAI aplicado em ${elapsedMs}ms -> ${safePath}`);
    console.log(`[local-runtime] componente atualizado via prompt: ${componentName} -> ${safePath}`);

    return res.status(200).json({
      ok: true,
      filePath: safePath,
      message: "Componente atualizado com sucesso.",
    });
  } catch (error) {
    console.error("[local-runtime/edit-component] erro:", error);
    const message = error instanceof Error ? error.message : "Falha ao editar componente.";
    return res.status(500).json({ error: message });
  }
}
