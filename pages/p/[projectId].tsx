import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { firebaseFirestore } from "@/lib/firebase";
import type { ProjectDocument } from "@/lib/projects";

type ProjectRecord = ProjectDocument & { id: string };

export default function PublishedProjectPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || typeof projectId !== "string" || !firebaseFirestore) return;
    const db = firebaseFirestore;
    if (!db) return;

    const fetchProject = async () => {
      try {
        const ref = doc(db, "projects", projectId);
        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          setError("Projeto não encontrado ou ainda não publicado.");
          return;
        }

        const data = snapshot.data() as ProjectDocument;
        if (data.status !== "published") {
          setError("Projeto ainda em modo rascunho.");
        }

        setProject({ id: snapshot.id, ...data });
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar o projeto.");
      }
    };

    void fetchProject();
  }, [projectId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <Head>
          <title>Merse Builder • Erro</title>
        </Head>
        <p className="text-sm uppercase tracking-[0.4em] text-purple-200/80">Merse Builder</p>
        <h1 className="mt-4 text-3xl font-semibold">Ops!</h1>
        <p className="mt-2 max-w-md text-center text-white/70">{error}</p>
        <Link href="/builder" className="mt-6 rounded-full border border-white/30 px-6 py-2 text-xs uppercase tracking-[0.4em]">
          Voltar para o Builder
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Head>
          <title>Merse Builder • Carregando</title>
        </Head>
        Carregando blueprint...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{((project.options as Record<string, unknown>)?.siteName as string) ?? project.summary ?? "Projeto Merse"}</title>
        <meta name="description" content={project.prompt?.slice(0, 140) ?? "Projeto publicado via Merse Builder"} />
      </Head>
      <div className="min-h-screen bg-[#010109] text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {project.effect?.name ? (
            <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/40">
              Efeito ativo: {project.effect.name} · intensidade {project.effect.intensity ?? "default"}
            </p>
          ) : null}
          <header className="mb-6 rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Projeto publicado</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {((project.options as Record<string, unknown>)?.siteName as string) ?? project.summary}
            </h1>
            <p className="mt-2 text-sm text-white/70">{project.prompt}</p>
          </header>
          <div className="rounded-3xl border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
            <iframe className="h-[80vh] w-full border-0" srcDoc={project.html} title={project.summary} />
          </div>
          {project.assets?.models3d?.length ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Modelos 3D</p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {project.assets.models3d.map((asset) => (
                  <li key={asset.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.35em] text-white/50">
                    {asset.label} • {asset.status}
                    {asset.url ? (
                      <a href={asset.url} target="_blank" rel="noreferrer" className="rounded-full border border-purple-300 px-2 py-0.5 text-white">
                        baixar
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {project.assets?.images?.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {project.assets.images.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                  <img src={asset.url} alt={asset.label} className="h-48 w-full object-cover" />
                  <p className="px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60">{asset.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
