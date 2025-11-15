import type { NextApiRequest, NextApiResponse } from "next";

type SuccessResponse = {
  htmlAtualizado: string;
  logs?: string;
};

type ErrorResponse = { error: string };

const DEFAULT_CODEX_URL = "http://localhost:9000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const { html, comando } = req.body as { html?: string; comando?: string };

  if (typeof html !== "string" || typeof comando !== "string" || !comando.trim()) {
    return res
      .status(400)
      .json({ error: "Envie o HTML atual e o comando desejado para o Merse Codex." });
  }

  const baseUrl =
    process.env.MERSE_CODEX_URL ??
    process.env.NEXT_PUBLIC_MERSE_CODEX_URL ??
    DEFAULT_CODEX_URL;
  const apiKey = process.env.MERSE_CODEX_API_KEY ?? process.env.NEXT_PUBLIC_MERSE_CODEX_API_KEY;

  const targetUrl = new URL("/codex/edit-site", baseUrl).toString();

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ html, comando }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof data?.error === "string"
          ? data.error
          : "O Merse Codex não conseguiu processar essa edição.";
      throw new Error(message);
    }

    const updatedHtml =
      (data?.html_atualizado as string | undefined) ??
      (data?.htmlAtualizado as string | undefined) ??
      html;

    return res.status(200).json({
      htmlAtualizado: updatedHtml,
      logs: typeof data?.logs === "string" ? data.logs : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível falar com o Merse Codex.";
    console.error("[codex/edit] erro:", message);
    return res.status(500).json({ error: message });
  }
}
