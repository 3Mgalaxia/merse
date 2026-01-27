import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebaseAdmin";

type Payload = {
  messages: { role: string; content: string }[];
  userId?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  const { messages, userId }: Payload = req.body ?? {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Mensagens ausentes." });
  }

  const userText = messages.filter((m) => m.role !== "merse").map((m) => m.content).join(" ");
  const prompt = `Crie uma imagem única, cinematográfica e contemplativa no estilo Merse, baseada nesta conversa do usuário: ${userText}. Foque em atmosfera emocional, luz futurista e composição elegante.`;

  const openai = new OpenAI({ apiKey });

  try {
    // Geração da imagem
    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    const url = imageResponse.data?.[0]?.url;
    if (!b64 && !url) {
      throw new Error("Falha ao gerar imagem.");
    }
    const imageDataUrl = b64 ? `data:image/png;base64,${b64}` : url!;
    const createdAt = new Date().toISOString();
    const doc = {
      title: "Primeira Criação",
      description: userText.slice(0, 180),
      imageDataUrl,
      createdAt,
      story: userText,
    };

    // Persistir conversa + imagem (opcional, melhor effort)
    try {
      await adminDb.collection("firstCreations").add({
        ...doc,
        messages,
        userId: userId ?? null,
        createdAt,
      });
    } catch (dbError) {
      // não bloquear retorno se Firestore falhar
      console.warn("Falha ao salvar no Firestore:", dbError);
    }

    return res.status(200).json(doc);
  } catch (error) {
    console.error("primeira-imagem error", error);
    return res.status(500).json({ error: (error as Error).message ?? "Erro ao gerar imagem" });
  }
}
