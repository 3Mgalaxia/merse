import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";

import { adminDb } from "@/lib/firebaseAdmin";

type ProjectKind = "site_project" | "builder_project";

type ProjectItem = {
  id: string;
  kind: ProjectKind;
  name: string;
  status: string;
  updatedAt: number;
  previewUrl: string;
  deployedUrl?: string;
  hasEditableCode: boolean;
  sourceHint: string;
};

type SuccessResponse = {
  projects: ProjectItem[];
};

type ErrorResponse = {
  error: string;
};

function resolveTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
  if (value && typeof value === "object" && "toMillis" in value) {
    const millis = (value as { toMillis?: () => number }).toMillis?.();
    if (typeof millis === "number" && Number.isFinite(millis)) return millis;
  }
  return Date.now();
}

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function hasSiteEditableCode(data: Record<string, unknown>): boolean {
  const assets = (data.assets ?? {}) as Record<string, unknown>;
  const build = (assets.build ?? {}) as Record<string, unknown>;

  const indexEntry = build.index as { url?: unknown } | undefined;
  if (typeof indexEntry?.url === "string" && indexEntry.url.trim()) return true;

  const pageEntry = build["pages/app/page.tsx"] as { url?: unknown } | undefined;
  if (typeof pageEntry?.url === "string" && pageEntry.url.trim()) return true;

  if (typeof build.bundle === "string" && build.bundle.trim()) return true;
  if (Array.isArray(data.pages) && data.pages.length > 0) return true;
  if (typeof data.html === "string" && data.html.trim()) return true;

  return false;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!token.trim()) {
    return res.status(401).json({ error: "Token de autenticação ausente." });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const [siteProjectsSnap, builderProjectsSnap] = await Promise.all([
      adminDb.collection("site_projects").where("userId", "==", uid).limit(40).get(),
      adminDb.collection("projects").where("uid", "==", uid).limit(40).get(),
    ]);

    const items: ProjectItem[] = [];

    siteProjectsSnap.forEach((docSnap) => {
      const data = (docSnap.data() ?? {}) as Record<string, unknown>;
      const id = docSnap.id;
      const name =
        normalizeName(data.siteName, "Projeto sem nome") ||
        normalizeName(data.name, "Projeto sem nome");

      items.push({
        id,
        kind: "site_project",
        name,
        status: normalizeName(data.status, "draft"),
        updatedAt: resolveTimestamp(data.updatedAt ?? data.createdAt),
        previewUrl: `/sandbox/preview?projectId=${id}`,
        deployedUrl:
          typeof data.deployedUrl === "string" && data.deployedUrl.trim()
            ? data.deployedUrl.trim()
            : undefined,
        hasEditableCode: hasSiteEditableCode(data),
        sourceHint: "site_projects",
      });
    });

    builderProjectsSnap.forEach((docSnap) => {
      const data = (docSnap.data() ?? {}) as Record<string, unknown>;
      const options = (data.options ?? {}) as Record<string, unknown>;
      const id = docSnap.id;
      const name =
        normalizeName(options.siteName, "Projeto Builder") ||
        normalizeName(data.summary, "Projeto Builder");

      items.push({
        id,
        kind: "builder_project",
        name,
        status: normalizeName(data.status, "draft"),
        updatedAt: resolveTimestamp(data.updatedAt ?? data.createdAt),
        previewUrl: `/p/${id}`,
        hasEditableCode: typeof data.html === "string" && data.html.trim().length > 0,
        sourceHint: "projects",
      });
    });

    items.sort((a, b) => b.updatedAt - a.updatedAt);

    return res.status(200).json({ projects: items });
  } catch (error) {
    console.error("[codex/list-projects] erro:", error);
    const message =
      error instanceof Error ? error.message : "Não foi possível listar os projetos.";
    return res.status(500).json({ error: message });
  }
}
