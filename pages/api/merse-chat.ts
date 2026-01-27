import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type ChatMessage = { role: "user" | "assistant" | "merse" | "system"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  const { messages } = req.body as { messages?: ChatMessage[] };
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Mensagens ausentes." });
  }

  const openai = new OpenAI({ apiKey });

  const mapped = messages.map((msg) => {
    if (msg.role === "merse") return { role: "assistant", content: msg.content };
    if (msg.role === "user") return { role: "user", content: msg.content };
    if (msg.role === "system") return { role: "system", content: msg.content };
    return { role: "assistant", content: msg.content };
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Você é a Merse, uma IA curiosa e acolhedora. Faça perguntas curtas e inspiradoras para extrair detalhes visuais (luz, clima, sentimento) e emocionar o usuário. Responda em português, em 1-2 frases.",
        },
        ...mapped.slice(-8),
      ],
      max_tokens: 120,
      temperature: 0.8,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(500).json({ error: "Resposta vazia da IA." });
    }
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("merse-chat error", error);
    return res.status(500).json({ error: "Não foi possível responder agora." });
  }
}
