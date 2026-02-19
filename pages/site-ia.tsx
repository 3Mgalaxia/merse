import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PiBrowsersFill, PiImageFill, PiSparkleFill } from "react-icons/pi";
import { useAuth } from "@/contexts/AuthContext";
import { type SitePage } from "@/lib/types/siteBuilder";
import { firebaseEnabled, firebaseFirestore } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { SiteBuildProgress } from "@/components/site/SiteBuildProgress";

type SiteMode = "site-generator" | "image-generator";

type TemplateEditResponse = {
  runId?: string;
  outputDir?: string;
  summary?: string;
  updatedFiles?: string[];
  previewCode?: string;
  downloadUrl?: string | null;
};

export default function SiteIa(): JSX.Element {
  const { user } = useAuth();
  const [mode, setMode] = useState<SiteMode>("site-generator");
  const [brief, setBrief] = useState("");
  const [features, setFeatures] = useState({
    preview: true,
    seo: false,
    auth: false,
    cms: false,
  });
  const [projectName, setProjectName] = useState("Galáctico");
  const [localPath, setLocalPath] = useState("/Users/matheusmiranda/Downloads/galactico-site");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [projectZip, setProjectZip] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [templateRunId, setTemplateRunId] = useState<string | null>(null);
  const [templateSummary, setTemplateSummary] = useState<string | null>(null);
  const [templateOutputDir, setTemplateOutputDir] = useState<string | null>(null);
  const [templateUpdatedFiles, setTemplateUpdatedFiles] = useState<string[]>([]);
  const [templateDownloadUrl, setTemplateDownloadUrl] = useState<string | null>(null);
  const [brandColors, setBrandColors] = useState<string>("azul, roxo");
  const [tone, setTone] = useState<string>("futurista");
  const [blueprintPages, setBlueprintPages] = useState<SitePage[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [projectProgress, setProjectProgress] = useState<number | null>(null);
  const [projectStep, setProjectStep] = useState<string | null>(null);

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openVSCode = () => {
    const trimmed = localPath.trim();
    if (!trimmed || typeof window === "undefined") return;
    window.location.href = `vscode://file/${trimmed}`;
    // opcional: tentar abrir a extensão Merse logo em seguida
    setTimeout(() => {
      window.location.href = "vscode:extension/merse.codex";
    }, 600);
  };

  const buildPrompt = () => {
    const modules = Object.entries(features)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");
    const engineLabel = mode === "site-generator" ? "Site que cria sites" : "Site que cria imagens";
    return [
      `Project name: ${projectName || "Projeto Merse"}.`,
      `Engine: ${engineLabel}.`,
      `Brief: ${brief || "Site Merse com identidade cósmica e CTA principal."}`,
      `Brand colors: ${brandColors || "não informadas"}.`,
      `Tone: ${tone || "futurista"}.`,
      modules ? `Modules: ${modules}.` : "Modules: padrão Merse (hero, seções, CTA, FAQ).",
      "Apply Merse aesthetic: glassmorphism, cosmic gradients, cinematic lighting.",
    ].join(" ");
  };

  useEffect(() => {
    if (!firebaseEnabled || !firebaseFirestore || !currentProjectId) return;
    const ref = doc(firebaseFirestore, "site_projects", currentProjectId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (data?.status) setProjectStatus(data.status as string);
        if (Array.isArray(data?.pages)) {
          setBlueprintPages(data.pages as SitePage[]);
        }
        if (data?.deployedUrl && typeof data.deployedUrl === "string") {
          setDeployedUrl(data.deployedUrl);
        }
        if (typeof data?.progress === "number") {
          setProjectProgress(data.progress);
        }
        if (typeof data?.currentStep === "string") {
          setProjectStep(data.currentStep);
        }
      },
      (error) => {
        console.warn("Falha ao escutar projeto:", error);
      },
    );
    return () => unsub();
  }, [currentProjectId]);

  const handlePrepareBlueprint = async () => {
    if (!user?.uid) {
      setStatus("Faça login para preparar o blueprint.");
      return;
    }
    setIsPreparing(true);
    setStatus("Gerando blueprint...");
    try {
      const res = await fetch("/api/site/prepare-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          name: projectName,
          brandColors: brandColors.split(",").map((c) => c.trim()).filter(Boolean),
          tone,
          brief,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o blueprint.");
      }

      setCurrentProjectId(data.projectId);
      setBlueprintPages(data.pages ?? []);
      setProjectStatus("blueprint_ready");
      setStatus("Blueprint pronto. Revise e continue para gerar o site.");
      // inicia geração automática do site após blueprint
      await handleGenerate(data.projectId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao preparar blueprint.");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!brief.trim()) {
      setStatus("Descreva o briefing para personalizar o merse-template.");
      return;
    }

    setIsPreparing(true);
    setStatus("Clonando merse-template e aplicando melhorias com OpenAI...");
    setPreviewHtml(null);
    setTemplateRunId(null);
    setTemplateSummary(null);
    setTemplateOutputDir(null);
    setTemplateUpdatedFiles([]);
    setTemplateDownloadUrl(null);

    try {
      const response = await fetch("/api/site/template-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(),
          projectName,
          mode,
          tone,
          brandColors,
          features,
        }),
      });
      const data = (await response.json()) as TemplateEditResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível editar o merse-template agora.");
      }

      const outputDir = typeof data.outputDir === "string" ? data.outputDir : "";
      const summary = typeof data.summary === "string" ? data.summary : "Template atualizado com sucesso.";
      const updatedFiles = Array.isArray(data.updatedFiles)
        ? data.updatedFiles.filter((file): file is string => typeof file === "string" && file.trim().length > 0)
        : [];

      if (outputDir) {
        setLocalPath(outputDir);
        setTemplateOutputDir(outputDir);
      }
      setTemplateSummary(summary);
      setTemplateUpdatedFiles(updatedFiles);
      setTemplateRunId(typeof data.runId === "string" ? data.runId : null);
      if (typeof data.downloadUrl === "string" && data.downloadUrl.trim()) {
        setTemplateDownloadUrl(data.downloadUrl.trim());
      } else if (typeof data.runId === "string" && data.runId.trim()) {
        setTemplateDownloadUrl(`/api/site/template-download?runId=${encodeURIComponent(data.runId.trim())}`);
      }
      if (typeof data.previewCode === "string" && data.previewCode.trim()) {
        setPreviewHtml(data.previewCode.trim());
      }

      setStatus("Template pronto. Revise o código no preview e abra a pasta no VS Code para continuar.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao personalizar o template.");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleGenerate = async (projectIdOverride?: string) => {
    const pid = projectIdOverride ?? currentProjectId;
    if (!pid) {
      setStatus("Prepare o blueprint antes de gerar o site.");
      return;
    }
    setStatus("Gerando site a partir do blueprint (OpenAI + Merse)...");
    setResultLink(null);
    setProjectZip(null);
    setPreviewHtml(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/site/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: pid,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar agora.");
      }
      if (data.projectId && typeof data.projectId === "string") {
        setCurrentProjectId(data.projectId);
        setProjectStatus("assets_ready");
      }
      if (data.downloadUrl) {
        setProjectZip(data.downloadUrl as string);
        setResultLink(data.downloadUrl as string);
      }
      setStatus("Geração iniciada. Acompanhe o progresso ao lado ou faça o download quando pronto.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar.";
      setStatus(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (!currentProjectId) {
      setStatus("Prepare o blueprint antes de iniciar a construção completa.");
      return;
    }
    setIsBuilding(true);
    setStatus("Construindo site completo (imagens + código)...");
    try {
      const res = await fetch("/api/site/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível iniciar a construção.");
      }
      setStatus("Construção iniciada. Acompanhe o progresso ao lado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao iniciar a construção.");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDeploy = async () => {
    if (!currentProjectId) {
      setStatus("Gere o site antes de publicar.");
      return;
    }
    setStatus("Publicando site em 1 clique...");
    try {
      const res = await fetch("/api/site/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível publicar agora.");
      }
      if (data.url) setDeployedUrl(data.url as string);
      setStatus("Site publicado. Confira o link!");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao publicar.");
    }
  };

  return (
    <>
      <Head>
        <title>Site IA • Merse</title>
      </Head>
      <main className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.24),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.22),transparent_60%),linear-gradient(180deg,#03030b,#000)]" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-24">
          <header className="rounded-3xl border border-white/10 bg-white/[0.05] px-8 py-10 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-blue-200/80">Site IA</p>
                <h1 className="text-3xl font-semibold text-white">Comande seu site com IA</h1>
                <p className="max-w-2xl text-sm text-white/70">
                Escolha se quer um site que gera sites ou um site que gera imagens. Descreva o briefing e marque os
                módulos essenciais antes de gerar.
              </p>
            </div>
            <Link
                href="/gerar"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:text-white"
              >
                Voltar
              </Link>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Tipo de site</p>
                  <h2 className="text-xl font-semibold text-white">Selecione o motor</h2>
                </div>
                <PiSparkleFill className="text-blue-300 text-xl" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("site-generator")}
                  className={`group flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                    mode === "site-generator"
                      ? "border-blue-400/60 bg-blue-500/10 text-white shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                      : "border-white/10 bg-black/30 text-white/70 hover:border-blue-400/40 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em]">
                    <PiBrowsersFill className="text-blue-300" /> Site que cria sites
                  </span>
                  <span className="text-xs text-white/60">
                    Gera novos sites e páginas com IA seguindo o padrão Merse.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("image-generator")}
                  className={`group flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                    mode === "image-generator"
                      ? "border-blue-400/60 bg-blue-500/10 text-white shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                      : "border-white/10 bg-black/30 text-white/70 hover:border-blue-400/40 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em]">
                    <PiImageFill className="text-blue-300" /> Site que cria imagens
                  </span>
                  <span className="text-xs text-white/60">
                    Portal com prompts e geração de imagens integrada ao Merse.
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Briefing do site</p>
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Nome do projeto (ex.: Galáctico)"
                  className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <textarea
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Descreva o site: público, objetivo, seções, tom visual, CTA principal."
                  className="min-h-[180px] w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="text-[11px] text-white/50">
                  Dica: para temas de inteligência artificial, cite cores (ex.: preto e azul), nome do projeto e se quer
                  usar a API Merse de geração de site.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Cores da marca</p>
                  <input
                    value={brandColors}
                    onChange={(event) => setBrandColors(event.target.value)}
                    placeholder="azul, roxo"
                    className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Tom do site</p>
                  <input
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    placeholder="futurista, luxo, minimalista..."
                    className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Características exclusivas</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { key: "preview", label: "Preview ao vivo" },
                    { key: "seo", label: "SEO técnico" },
                    { key: "auth", label: "Área logada" },
                    { key: "cms", label: "CMS Merse" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleFeature(item.key as keyof typeof features)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                        features[item.key as keyof typeof features]
                          ? "border-blue-400/60 bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                          : "border-white/10 bg-black/30 text-white/70 hover:border-blue-400/40 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                          features[item.key as keyof typeof features] ? "border-blue-300 bg-blue-500/50" : "border-white/30"
                        }`}
                      >
                        {features[item.key as keyof typeof features] ? "✓" : ""}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={isPreparing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/60 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-700 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_45px_rgba(59,130,246,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PiSparkleFill className="text-lg" />
                {isPreparing ? "Editando template..." : "Aplicar IA no merse-template"}
              </button>
              <button
                type="button"
                onClick={handlePrepareBlueprint}
                disabled={isPreparing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/45 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Usar fluxo legado (blueprint + assets)
              </button>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Como vamos gerar</p>
                <ul className="mt-3 space-y-2 text-white/70">
                  <li>1) Clonamos o `merse-template` para uma pasta de saída versionada.</li>
                  <li>2) A OpenAI analisa briefing, tom, cores e módulos selecionados.</li>
                  <li>3) Reescrevemos os arquivos centrais do template mantendo stack Next.js.</li>
                  <li>4) Mostramos preview do código gerado e lista de arquivos alterados.</li>
                  <li>5) Você abre direto no VS Code para continuar iterando com o Codex.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Abrir no VS Code</p>
                <div className="mt-3 space-y-3">
                  <input
                    value={localPath}
                    onChange={(event) => setLocalPath(event.target.value)}
                    placeholder="/Users/.../galactico-site"
                    className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={openVSCode}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/50 hover:text-white"
                  >
                    Abrir no VS Code + Extensão Merse
                  </button>
                  <p className="text-[11px] text-white/50">
                    Usamos o esquema vscode://file/... para abrir a pasta local. Depois, tentamos carregar a extensão Merse
                    (merse.codex) automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Preview</p>
                <h3 className="text-lg font-semibold text-white">Como ficou o layout</h3>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/60">
                {mode === "site-generator" ? "Site → Sites" : "Site → Imagens"}
              </span>
              </div>
              <div className="h-[360px] rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/70 via-black/60 to-black/90 p-4 text-sm text-white/60 shadow-inner">
                <p className="text-white/70">
                  Aqui aparecerá o preview gerado. Adicione seu briefing, cores e tom e clique em “Aplicar IA no
                  merse-template” para ver o código personalizado.
                </p>
                <ProgressBar status={projectStatus} progress={projectProgress} step={projectStep} />
                {status && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-white/80">
                    {status}
                    {(projectZip || currentProjectId) && (
                      <div className="mt-2 text-[11px]">
                        <a
                          href={
                            projectZip
                              ? projectZip
                              : currentProjectId
                              ? `/api/site/download?projectId=${currentProjectId}`
                              : "#"
                          }
                          className="underline decoration-dotted hover:text-white"
                        >
                          Download ZIP
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {templateOutputDir && (
                  <div className="mt-3 rounded-xl border border-blue-400/25 bg-blue-500/10 p-3 text-[12px] text-white/85">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-blue-200/80">
                      Template atualizado
                    </p>
                    {templateSummary ? <p className="mt-2 text-sm text-white/85">{templateSummary}</p> : null}
                    <p className="mt-2 text-white/80">
                      Pasta de saída: <code className="rounded bg-black/30 px-1 py-0.5">{templateOutputDir}</code>
                    </p>
                    {templateRunId ? (
                      <p className="mt-1 text-[11px] text-white/60">Execução: {templateRunId}</p>
                    ) : null}
                    {templateDownloadUrl ? (
                      <div className="mt-3">
                        <a
                          href={templateDownloadUrl}
                          className="inline-flex items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-400/25"
                        >
                          Baixar projeto (.zip)
                        </a>
                      </div>
                    ) : null}
                    {templateUpdatedFiles.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Arquivos editados</p>
                        <ul className="mt-1 space-y-1 text-white/80">
                          {templateUpdatedFiles.map((file) => (
                            <li key={file}>• {file}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
                {previewHtml && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
                    <p className="mb-2 uppercase tracking-[0.3em] text-white/50">Preview de código</p>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-white/70">
                      {previewHtml}
                    </pre>
                  </div>
                )}
                {blueprintPages.length > 0 && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-white/80">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="uppercase tracking-[0.3em] text-white/50">Blueprint</p>
                        <p className="text-sm text-white/80">
                          Projeto {projectName || "Sem nome"} • {blueprintPages.length} páginas
                        </p>
                      </div>
                      {currentProjectId && (
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/70">
                            Geração automática em andamento...
                          </span>
                          <button
                            type="button"
                            onClick={handleDeploy}
                            disabled={!currentProjectId || (projectStatus !== "assets_ready" && projectStatus !== "completed")}
                            className="rounded-full border border-sky-300/60 bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            🚀 Publicar site em 1 clique
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-2 max-h-40 overflow-auto pr-1">
                      {blueprintPages.map((page) => (
                        <div key={page.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                          <div className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="font-semibold text-white">{page.title}</span>
                            <span className="text-white/50">{page.slug}</span>
                          </div>
                          {page.seoDescription && (
                            <p className="mt-1 text-[12px] text-white/60 line-clamp-2">{page.seoDescription}</p>
                          )}
                          {page.sections?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              {page.sections.map((section) => (
                                <span
                                  key={section.id}
                                  className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white/80"
                                >
                                  {section.type}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 grid gap-3 text-xs text-white/60 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="uppercase tracking-[0.3em] text-white/50">Brief</p>
                    <p className="mt-1 text-white/80 line-clamp-3">{brief || "Aguardando descrição do site..."}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="uppercase tracking-[0.3em] text-white/50">Módulos</p>
                    <p className="mt-1 text-white/80">
                      {Object.entries(features)
                        .filter(([, v]) => v)
                        .map(([k]) => k)
                        .join(", ") || "Nenhum selecionado"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                  <p className="uppercase tracking-[0.3em] text-white/50">Nome do projeto</p>
                  <p className="mt-1 text-white/80">{projectName || "Sem nome"}</p>
                </div>
                {deployedUrl && (
                  <a
                    href={deployedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center text-sky-300 underline decoration-dotted hover:text-sky-200"
                  >
                    🌍 Ver site publicado
                  </a>
                )}
                <div className="mt-4">
                  <SiteBuildProgress projectId={currentProjectId} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function ProgressBar({ status, progress, step }: { status: string | null; progress?: number | null; step?: string | null }) {
  const map: Record<string, { pct: number; label: string }> = {
    draft: { pct: 5, label: "Briefing iniciado" },
    blueprint_pending: { pct: 25, label: "IA planejando o blueprint..." },
    blueprint_ready: { pct: 40, label: "Blueprint pronto. Revise e avance." },
    assets_generating: { pct: 65, label: "Gerando código e imagens..." },
    assets_ready: { pct: 75, label: "Versão inicial pronta." },
    reviewing: { pct: 88, label: "Revisando e melhorando layout..." },
    completed: { pct: 100, label: "Site finalizado." },
  };

  const fallback = { pct: 0, label: "Aguardando status..." };
  const data = status ? map[status] ?? fallback : fallback;
  const pct = progress != null ? Math.min(Math.max(Math.round(progress), 0), 100) : data.pct;
  const label = step || data.label;

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-white/60">
        <span className="uppercase tracking-[0.3em]">Status</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[12px] text-white/70">{label}</p>
    </div>
  );
}
