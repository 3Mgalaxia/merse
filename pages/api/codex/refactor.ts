// pages/api/codex/refactor.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type Body = {
  kind?: "refactor" | "beautify" | "prompt";
  code?: string;
  extraPrompt?: string;
};

type Data = {
  result?: string;
  error?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const body = req.body as Body;
  const code = body.code?.trim();

  if (!code) {
    return res.status(400).json({ error: "Código vazio." });
  }

  const kind = body.kind ?? "refactor";
  const extraPrompt = body.extraPrompt?.trim();

  const baseInstruction =
    kind === "beautify"
      ? "Você é um formatador de código. Formate, organize e torne o código mais legível, SEM mudar o comportamento."
      : "Você é um assistente de refatoração. Melhore o código, simplifique, nomeie melhor, mas mantenha o mesmo comportamento.";

  const fullPrompt = [
    baseInstruction,
    "",
    extraPrompt ? `Contexto extra do usuário: ${extraPrompt}` : "",
    "",
    "Código original:",
    "```tsx",
    code,
    "```",
    "",
    "Responda APENAS com o código refatorado final, sem explicações.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Você é um assistente que melhora e refatora código.",
        },
        { role: "user", content: fullPrompt },
      ],
      temperature: 0.2,
    });

    const result = completion.choices[0]?.message?.content?.trim() || code;

    return res.status(200).json({ result });
  } catch (err) {
    console.error("Erro na IA da Merse-Codex:", err);
    return res
      .status(500)
      .json({ error: "Erro interno ao processar o código." });
  }
}
