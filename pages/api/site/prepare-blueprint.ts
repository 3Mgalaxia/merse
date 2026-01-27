import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebaseAdmin";
import { type SitePage, type SiteProject, type SiteStatus } from "@/lib/types/siteBuilder";
import { autoProgress } from "@/lib/site/autoProgress";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, name, brandColors, tone, brief, maxIterations = 3 } = req.body ?? {};

    if (!userId || !name || !brief) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    // 1) Cria doc inicial no Firestore
    const projectRef = adminDb.collection("site_projects").doc();
    const projectId = projectRef.id;

    const baseProject: SiteProject = {
      id: projectId,
      userId,
      name,
      brandColors: Array.isArray(brandColors) ? brandColors : [],
      tone: tone ?? "futurista",
      rawBrief: brief,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "blueprint_pending",
      currentIteration: 0,
      maxIterations: typeof maxIterations === "number" ? maxIterations : 3,
    };

    await projectRef.set({
      ...baseProject,
      progress: autoProgress("blueprint_pending" satisfies SiteStatus),
    });

    // 2) Chama OpenAI para gerar blueprint
    const systemPrompt = `
Você é um arquiteto de websites de nível mundial, experto em UX, UI, copywriting e conversão.
Sua tarefa é transformar um briefing em um blueprint JSON de um site completo.

Regras:
- Use estrutura pensada para performance, estética e conversão.
- Use no máximo 4 páginas para projetos pequenos, 1 landing page quando fizer sentido.
- Sempre responda APENAS um JSON válido, sem comentários ou texto extra.
- Inclua páginas, seções e prompts de imagens.
`;

    const userPrompt = `
BRIEFING DO SITE:

Nome do projeto: ${name}
Briefing: ${brief}
Cores da marca: ${Array.isArray(brandColors) ? brandColors.join(", ") : "não especificado"}
Tom do site: ${tone || "futurista"}

Gere um JSON no seguinte formato:

{
  "pages": [
    {
      "id": "home",
      "slug": "/",
      "title": "Título da página",
      "seoDescription": "Descrição para SEO",
      "sections": [
        {
          "id": "hero",
          "type": "hero",
          "title": "Título herói",
          "description": "Subtítulo persuasivo",
          "copy": "Texto mais longo da seção",
          "imagePrompt": "Prompt detalhado para gerar a imagem principal do herói",
          "ctaLabel": "Texto do botão",
          "ctaHref": "#contato"
        }
      ]
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA ao gerar blueprint.");
    }

    const parsed = JSON.parse(content) as { pages?: SitePage[] };

    // 3) Atualiza projeto com blueprint
    await projectRef.update({
      pages: parsed.pages ?? [],
      status: "blueprint_ready",
      progress: autoProgress("blueprint_ready" satisfies SiteStatus),
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      projectId,
      status: "blueprint_ready",
      pages: parsed.pages ?? [],
    });
  } catch (err) {
    console.error("[prepare-blueprint] error", err);
    return res.status(500).json({ error: "Erro ao gerar blueprint." });
  }
}
