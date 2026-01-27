import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type RequestBody = {
  prompt?: string;
  image?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  const { prompt, image }: RequestBody = req.body ?? {};
  if (!prompt && !image) {
    return res.status(400).json({ error: "Envie um contexto ou uma imagem." });
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "Você é uma diretora de arte da Merse. Dê sugestões práticas e objetivas para melhorar um site: hierarquia, contraste, tipografia, ritmo visual, CTA, responsividade. Responda em bullet points curtos, em português.",
    },
  ];

  if (prompt) {
    messages.push({ role: "user", content: prompt });
  }

  if (image) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: "Analise esta screenshot do site e sugira melhorias visuais e de UX." },
        { type: "image_url", image_url: { url: image } },
      ],
    });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 320,
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return res.status(500).json({ error: "Resposta vazia da IA." });

    const lines = raw
      .split("\n")
      .map((line) => line.replace(/^[-•\s]+/, "").trim())
      .filter(Boolean);

    return res.status(200).json({
      headline: "Sugestões do estúdio Merse",
      suggestions: lines.slice(0, 8),
      callouts: ["Hierarquia", "Contraste", "CTA", "Mobile-first"],
    });
  } catch (error) {
    console.error("assistente-site error", error);
    return res.status(500).json({ error: "Não foi possível gerar sugestões agora." });
  }
}
