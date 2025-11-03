import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type ErrorResponse = { error: string };
type SuccessResponse = { reply: string };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
  organization: process.env.OPENAI_ORG_ID,
  baseURL: process.env.OPENAI_BASE_URL,
});

type PayloadMessage = {
  role: "user" | "assistant";
  content: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Chave da OpenAI não configurada no servidor." });
  }

  const { messages } = req.body as { messages?: PayloadMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Envie ao menos uma mensagem para o assistente." });
  }

  const sanitized = messages
    .filter((message): message is PayloadMessage => {
      return (
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
      );
    })
    .slice(-12); // limita histórico para evitar payloads enormes

  const prompt = [
    "Você é o Merse Prompt Navigator, especialista em gerar prompts de imagem e vídeo com estética futurista.",
    "Refine a solicitação do usuário e ofereça sugestões claras de parâmetros (estilo, luz, ângulo, atmosfera, tecnologia).",
    "Retorne respostas em português, estruturando com títulos curtos e bullets quando fizer sentido.",
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_PROMPT_MODEL ?? "gpt-4o-mini",
      temperature: 0.65,
      max_tokens: 600,
      messages: [
        { role: "system", content: prompt },
        ...sanitized.map((message) => ({ role: message.role, content: message.content })),
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("Resposta vazia da OpenAI.");
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Erro no prompt chat:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a resposta do assistente agora.";
    return res.status(500).json({ error: message });
  }
}
