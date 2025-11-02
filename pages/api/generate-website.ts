import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

type WebsiteCodePayload = {
  summary: string;
  highlights: string[];
  html: string;
};

type LayoutBrief = {
  id?: string;
  label?: string;
  description?: string;
  objective?: string;
  highlights?: string[];
  referenceImage?: string;
};

type PaletteBrief = {
  id?: string;
  label?: string;
  preview?: string;
};

type SuccessResponse = { website: WebsiteCodePayload };
type ErrorResponse = { error: string };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  baseURL: process.env.OPENAI_BASE_URL,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Chave da OpenAI não configurada no servidor." });
  }

  const { siteName, goal, menu, layout, palette, modules, notes, heroMood } = req.body;

  if (!siteName || typeof siteName !== "string") {
    return res.status(400).json({ error: "Informe o nome do site." });
  }

  try {
    const layoutInfo: LayoutBrief =
      layout && typeof layout === "object"
        ? layout
        : {
            id: layout,
            label: layout,
          };

    const paletteInfo: PaletteBrief =
      palette && typeof palette === "object"
        ? palette
        : { id: palette, label: palette, preview: "" };

    const normalizedModules = Array.isArray(modules)
      ? modules.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    const additionalBrief = [
      layoutInfo?.label ? `Layout escolhido: ${layoutInfo.label} — ${layoutInfo.description ?? "sem descrição."}` : null,
      layoutInfo?.objective ? `Objetivo principal: ${layoutInfo.objective}.` : null,
      Array.isArray(layoutInfo?.highlights) && layoutInfo.highlights.length
        ? `Pontos-chave:\n${layoutInfo.highlights.map((item: string) => `- ${item}`).join("\n")}`
        : null,
      layoutInfo?.referenceImage ? `Referência visual hospedada na Merse: ${layoutInfo.referenceImage}` : null,
      normalizedModules.length ? `Módulos solicitados: ${normalizedModules.join(", ")}.` : null,
      paletteInfo?.label
        ? `Paleta sugerida: ${paletteInfo.label}${
            paletteInfo.preview ? ` (${paletteInfo.preview})` : ""
          }.`
        : null,
      typeof heroMood === "string" && heroMood.trim()
        ? `Mood desejado para o hero: ${heroMood.trim()}.`
        : null,
      typeof notes === "string" && notes.trim() ? `Observações extras: ${notes.trim()}.` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const promptContext = JSON.stringify(
      {
        siteName,
        goal,
        menu,
        layout: layoutInfo,
        palette: paletteInfo,
        modules: normalizedModules,
        notes,
        heroMood,
      },
      null,
      2
    );

    const promptLines = [
      "Você é um engenheiro front-end da Merse. Gere apenas um JSON com a estrutura:",
      "{",
      '  "summary": "Resumo em 2-3 frases sobre o conceito do site",',
      '  "highlights": ["Ponto forte 1", "Ponto forte 2", "..."],',
      '  "html": "<!DOCTYPE html>... (documento completo em HTML5 com CSS inline e identidade Merse)"',
      "}",
      "",
      "Regras:",
      '- "html" deve conter <!DOCTYPE html>, <html>, <head> (com <style> e, se desejar, @import do Google Fonts) e <body>.',
      "- Utilize estilos inline ou em um único bloco <style> para manter a identidade Merse (fundos escuros, gradientes roxo/azul, tipografia moderna, animações leves).",
      "- Estruture o corpo respeitando o briefing do layout escolhido: hero, narrativa das seções, CTA final coerente.",
      '- Se receber "modules", os blocos devem aparecer na ordem sugerida, com títulos e textos compatíveis.',
      "- A paleta indicada deve guiar as cores principais, com variações em hover/gradientes.",
      "- Use apenas HTML + CSS (sem JavaScript externo) e garanta comportamento responsivo com Flex/Grid.",
      "- Limite o código HTML a aproximadamente 160 linhas para evitar respostas extensas demais.",
      "- Retorne somente o JSON final, sem comentários ou texto adicional.",
      "",
      "Dados do projeto:",
      promptContext,
    ];

    if (additionalBrief) {
      promptLines.push("", "Briefing detalhado:", additionalBrief);
    }

    const prompt = promptLines.join("\n");

    // 🚀 Compatível com openai@6.7.0 (usando chat.completions)
    const envModel =
      typeof process.env.OPENAI_BLUEPRINT_MODEL === "string"
        ? process.env.OPENAI_BLUEPRINT_MODEL.trim()
        : "";
    const fallbackModel = "gpt-4o-mini";
    const safeModel =
      envModel.length > 0 && /^[a-z0-9._-]+$/i.test(envModel) ? envModel : fallbackModel;

    if (envModel.length > 0 && safeModel === fallbackModel) {
      console.warn(
        `OPENAI_BLUEPRINT_MODEL="${envModel}" é inválido. Revertendo para modelo padrão ${fallbackModel}.`,
      );
    }

    const completion = await openai.chat.completions.create({
      model: safeModel,
      messages: [
        { role: "system", content: "Você gera HTML/CSS completos seguindo a identidade visual da Merse." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
      max_tokens: 2000,
    });

    const output = completion.choices[0]?.message?.content ?? "";

    const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let jsonText = fencedMatch ? fencedMatch[1].trim() : null;

    if (!jsonText) {
      const start = output.indexOf("{");
      const end = output.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        jsonText = output.slice(start, end + 1);
      }
    }

    if (!jsonText) {
      throw new Error("Resposta da OpenAI não contém JSON válido.");
    }

    let website: WebsiteCodePayload | null = null;
    try {
      website = JSON.parse(jsonText) as WebsiteCodePayload;
    } catch (parseError) {
      console.error("Falha ao interpretar JSON:", jsonText);
      throw parseError;
    }

    return res.status(200).json({ website });
  } catch (error) {
    console.error("Erro ao gerar código com OpenAI:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o código agora. Tente novamente.";
    return res.status(500).json({ error: message });
  }
}
