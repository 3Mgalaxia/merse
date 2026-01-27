import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { projectId } = req.body ?? {};
  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ error: "projectId é obrigatório" });
  }

  try {
    const ref = adminDb.collection("site_projects").doc(projectId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Projeto não encontrado" });

    const data = snap.data() as any;
    const name = (data?.name ?? projectId).toLowerCase().replace(/\s+/g, "-");
    const finalDomain = `${name}.merse.app.br`;

    await ref.set(
      {
        status: "deploying",
        currentStep: `Publicando em ${finalDomain}...`,
        progress: 95,
      },
      { merge: true },
    );

    // TODO: mapear arquivos do storage e enviar para provider (Vercel/S3/etc).
    // Placeholder: apenas marca como concluído.

    await ref.set(
      {
        status: "completed",
        deployedUrl: `https://${finalDomain}`,
        currentStep: "Site publicado com sucesso 🎉",
        progress: 100,
      },
      { merge: true },
    );

    return res.status(200).json({
      message: "Publicado com sucesso!",
      url: `https://${finalDomain}`,
    });
  } catch (error) {
    console.error("[deploy] erro:", error);
    return res.status(500).json({ error: "Erro ao publicar o site." });
  }
}
