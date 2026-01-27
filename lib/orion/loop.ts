import { adminDb } from "@/lib/firebaseAdmin";
import { addProjectEvent } from "@/lib/site/addProjectEvent";
import { autoProgress } from "@/lib/site/autoProgress";
import { type SiteProject } from "@/lib/types/siteBuilder";

const INTERNAL_BASE = process.env.INTERNAL_API_BASE_URL ?? "http://localhost:3000";

async function getProject(projectId: string): Promise<SiteProject | null> {
  const snap = await adminDb.collection("site_projects").doc(projectId).get();
  if (!snap.exists) return null;
  return snap.data() as SiteProject;
}

async function callEndpoint(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${INTERNAL_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MERSE_ADMIN_KEY ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao chamar ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function sealCompletion(projectId: string, score?: number) {
  await adminDb.collection("site_projects").doc(projectId).set(
    {
      status: "completed",
      progress: autoProgress("completed"),
      currentStep: "Site finalizado pelo Orion Loop",
      finalScore: typeof score === "number" ? score : undefined,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  await addProjectEvent(projectId, "Projeto concluído pelo Orion Loop.", "info", "completed");
}

export async function orionLoop(projectId: string) {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  const status = project.status;
  const score = project.finalScore ?? 0;
  const canIterate = (project.currentIteration ?? 0) < (project.maxIterations ?? 3);

  if (status === "completed") {
    return { projectId, status, action: "noop" as const };
  }

  if (status === "blueprint_ready") {
    await addProjectEvent(projectId, "Orion Loop iniciando geração de assets.", "info", "orion");
    await callEndpoint("/api/site/generate-assets", { projectId });
    return { projectId, status: "assets_generating", action: "generate-assets" as const };
  }

  if (status === "assets_ready" || status === "reviewing") {
    await addProjectEvent(projectId, "Orion Loop iniciando self-review.", "info", "orion");
    await callEndpoint("/api/site/self-review", { projectId });
    return { projectId, status: "reviewing", action: "self-review" as const };
  }

  if ((status === "review_done" || status === "assets_ready" || status === "reviewing") && score < 8.5 && canIterate) {
    await addProjectEvent(projectId, "Reprocessando assets após nota abaixo do limiar.", "warning", "orion");
    await callEndpoint("/api/site/generate-assets", { projectId });
    return { projectId, status: "assets_generating", action: "generate-assets" as const };
  }

  if (score >= 8.5 || status === "review_done") {
    await sealCompletion(projectId, score);
    return { projectId, status: "completed", action: "seal-completion" as const };
  }

  return { projectId, status, action: "noop" as const };
}
