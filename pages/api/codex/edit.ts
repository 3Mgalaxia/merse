import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type SuccessResponse = {
  htmlAtualizado: string;
  provider: "merse-codex" | "openai";
  mode: "edit" | "refactor" | "beautify";
  providersTried: string[];
  fallbackUsed: boolean;
  logs?: string;
};

type ErrorResponse = { error: string; details?: string[] };

type ProviderHint = "auto" | "merse" | "openai";
type CodexMode = "edit" | "refactor" | "beautify";
type ProviderAttempt = "merse" | "openai";

const DEFAULT_CODEX_URL = "http://localhost:9000";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const MAX_HTML_LENGTH = 160_000;

function normalizeProviderHint(value: unknown): ProviderHint {
  if (typeof value !== "string") return "auto";
  const normalized = value.trim().toLowerCase();
  if (normalized === "merse") return "merse";
  if (normalized === "openai") return "openai";
  return "auto";
}

function normalizeMode(value: unknown, command: string): CodexMode {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "refactor") return "refactor";
    if (normalized === "beautify") return "beautify";
    if (normalized === "edit") return "edit";
  }

  const low = command.trim().toLowerCase();

  if (/(beautify|formatar|formatacao|formatação|organizar|indentar)/.test(low)) {
    return "beautify";
  }

  if (/(refator|refactor|reestrutur|melhorar estrutura|limpar codigo|limpar código)/.test(low)) {
    return "refactor";
  }

  return "edit";
}

function normalizeOpenAIContent(raw: string) {
  const directFence = raw.match(/```(?:html|xml|htm)?\s*([\s\S]*?)```/i);
  const candidate = directFence?.[1] ?? raw;
  let normalized = candidate.trim();

  const documentStart = normalized.search(/<!doctype|<html/i);
  if (documentStart > 0) {
    normalized = normalized.slice(documentStart);
  }

  const htmlCloseIndex = normalized.toLowerCase().lastIndexOf("</html>");
  if (htmlCloseIndex > -1) {
    normalized = normalized.slice(0, htmlCloseIndex + "</html>".length);
  }

  return normalized.trim();
}

function pickHtmlPayload(payload: unknown, fallbackHtml: string) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const candidate =
    (typeof record.html_atualizado === "string" && record.html_atualizado) ||
    (typeof record.htmlAtualizado === "string" && record.htmlAtualizado) ||
    (typeof record.updated_html === "string" && record.updated_html) ||
    (typeof record.updatedHtml === "string" && record.updatedHtml) ||
    (typeof record.html === "string" && record.html) ||
    fallbackHtml;

  return candidate.trim() ? candidate : fallbackHtml;
}

async function runMerseCodex({
  html,
  comando,
  mode,
}: {
  html: string;
  comando: string;
  mode: CodexMode;
}) {
  const baseUrl =
    process.env.MERSE_CODEX_URL ??
    process.env.NEXT_PUBLIC_MERSE_CODEX_URL ??
    DEFAULT_CODEX_URL;
  const apiKey = process.env.MERSE_CODEX_API_KEY ?? process.env.NEXT_PUBLIC_MERSE_CODEX_API_KEY;
  const targetUrl = new URL("/codex/edit-site", baseUrl).toString();

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ html, comando, mode }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "O Merse Codex não conseguiu processar essa edição.";
    throw new Error(message);
  }

  return {
    htmlAtualizado: pickHtmlPayload(data, html),
    logs: typeof data?.logs === "string" ? data.logs : undefined,
  };
}

async function runOpenAICodex({
  html,
  comando,
  mode,
}: {
  html: string;
  comando: string;
  mode: CodexMode;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ausente para fallback do Codex.");
  }

  const model = process.env.OPENAI_CODEX_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const modeInstruction =
    mode === "beautify"
      ? "Faça apenas limpeza visual/formatação do HTML e CSS embutido, sem mudar comportamento."
      : mode === "refactor"
        ? "Refatore o HTML/CSS para melhor legibilidade e organização, sem mudar comportamento."
        : "Aplique o comando solicitado alterando o layout e estilo conforme pedido.";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "Você é o Merse Codex, especialista em editar HTML completo.",
          "Saída obrigatória: retorne APENAS HTML final completo, sem explicações.",
          "Preserve metadados essenciais e garanta HTML válido.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Modo: ${mode}.`,
          modeInstruction,
          `Comando do usuário (português): ${comando}`,
          "",
          "HTML atual:",
          "```html",
          html,
          "```",
        ].join("\n"),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI retornou resposta vazia para o Codex.");
  }

  const normalized = normalizeOpenAIContent(content);
  if (!normalized || !normalized.includes("<")) {
    throw new Error("OpenAI não retornou HTML válido para o Codex.");
  }

  return normalized;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const { html, comando, provider, mode } = req.body as {
    html?: string;
    comando?: string;
    provider?: ProviderHint;
    mode?: CodexMode;
  };

  if (typeof html !== "string" || typeof comando !== "string" || !comando.trim()) {
    return res
      .status(400)
      .json({ error: "Envie o HTML atual e o comando desejado para o Merse Codex." });
  }

  if (html.length > MAX_HTML_LENGTH) {
    return res.status(400).json({
      error: `HTML muito grande para o Codex (${MAX_HTML_LENGTH.toLocaleString("pt-BR")} caracteres).`,
    });
  }

  const providerHint = normalizeProviderHint(provider);
  const resolvedMode = normalizeMode(mode, comando);
  const providerQueue: ProviderAttempt[] =
    providerHint === "merse"
      ? ["merse"]
      : providerHint === "openai"
        ? ["openai"]
        : ["merse", "openai"];

  const providerErrors: string[] = [];
  const providersTried: string[] = [];

  for (const candidate of providerQueue) {
    providersTried.push(candidate);

    try {
      if (candidate === "merse") {
        const result = await runMerseCodex({ html, comando, mode: resolvedMode });
        return res.status(200).json({
          htmlAtualizado: result.htmlAtualizado,
          provider: "merse-codex",
          mode: resolvedMode,
          providersTried,
          fallbackUsed: providersTried.length > 1,
          logs: result.logs,
        });
      }

      const htmlAtualizado = await runOpenAICodex({ html, comando, mode: resolvedMode });
      return res.status(200).json({
        htmlAtualizado,
        provider: "openai",
        mode: resolvedMode,
        providersTried,
        fallbackUsed: providersTried.length > 1,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Falha desconhecida no provedor ${candidate}.`;
      providerErrors.push(`${candidate}: ${message}`);
      console.error(`[codex/edit] ${candidate} falhou:`, message);

      if (providerHint !== "auto") {
        break;
      }
    }
  }

  const [firstError] = providerErrors;
  return res.status(500).json({
    error: firstError ?? "Não foi possível falar com o Merse Codex.",
    details: providerErrors.slice(1, 4),
  });
}
