import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebaseAdmin";
import { addProjectEvent } from "@/lib/site/addProjectEvent";

type ReviewResult = {
  score: number;
  improvements?: Array<{ target?: string; reason?: string; fix?: string }>;
  notes?: string;
};

type ErrorResponse = { error: string };

async function fetchHtmlFromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error("[self-review] falha ao baixar HTML:", error);
    return null;
  }
}

function clampText(input: string, max = 15000) {
  return input.length > max ? `${input.slice(0, max)}\n\n[trecho truncado]` : input;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ projectId: string; status: string; review: ReviewResult } | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  const { projectId } = req.body ?? {};
  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ error: "projectId é obrigatório." });
  }

  const snap = await adminDb.collection("site_projects").doc(projectId).get();
  if (!snap.exists) {
    return res.status(404).json({ error: "Projeto não encontrado." });
  }

  const data = snap.data() ?? {};
  const currentIteration = typeof data.currentIteration === "number" ? data.currentIteration : 0;
  const maxIterations = typeof data.maxIterations === "number" ? data.maxIterations : 3;
  const siteName = data.siteName ?? data.name ?? "Projeto Merse";
  const rawBrief = data.rawBrief ?? "";
  const pages = data.pages ?? null;

  const buildUrl: string | undefined = data.assets?.build?.index?.url;
  const buildBundle: string | undefined = data.buildBundle;

  const html = buildUrl ? await fetchHtmlFromUrl(buildUrl) : null;
  const siteBody = html ?? buildBundle ?? "";

  const contextPreview = clampText(
    JSON.stringify(
      {
        siteName,
        rawBrief,
        pages,
      },
      null,
      2,
    ),
    6000,
  );

  const siteContent = clampText(siteBody || "Site indisponível para revisão.", 20000);

  const reviewPrompt = `
Você é o avaliador-chefe de qualidade de sites da Merse.
Analise o site e dê notas de 0 a 10 para:
- Identidade visual
- Clareza da mensagem
- Imagens e coerência
- Conversão (CTA, clareza)
- Profissionalismo

Se a nota for baixa, indique melhorias específicas com campo "target", "reason" e "fix".

RESPOSTA EM JSON E APENAS JSON:
{
  "score": number,
  "improvements": [
    {"target": "home.hero.texto", "reason": "fraco", "fix": "nova copy aqui"}
  ]
}

Contexto:
${contextPreview}

HTML do site:
${siteContent}
`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let parsed: ReviewResult = { score: 0 };
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: reviewPrompt }],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    parsed = JSON.parse(content) as ReviewResult;
  } catch (error) {
    console.error("[self-review] falha ao obter revisão:", error);
    return res.status(500).json({ error: "Não foi possível gerar a revisão." });
  }

  const score = typeof parsed.score === "number" ? parsed.score : 0;
  const threshold = 8;
  const canIterate = currentIteration < maxIterations;
  const nextStatus = score < threshold && canIterate ? "reviewing" : "completed";
  const nextIteration = score < threshold && canIterate ? currentIteration + 1 : currentIteration;

  try {
    await adminDb.collection("site_projects").doc(projectId).set(
      {
        reviewSummary: parsed,
        finalScore: score,
        status: nextStatus,
        currentIteration: nextIteration,
        lastReviewAt: Date.now(),
        progress: nextStatus === "completed" ? 100 : 88,
        currentStep: nextStatus === "completed" ? "Site finalizado" : "Revisando e ajustando",
      },
      { merge: true },
    );
    await addProjectEvent(
      projectId,
      `Revisão automática concluída com nota ${score}.`,
      score < threshold ? "warning" : "info",
      "review_done",
    );
  } catch (error) {
    console.error("[self-review] falha ao salvar revisão:", error);
  }

  return res.status(200).json({ projectId, status: "review_done", review: parsed });
}
