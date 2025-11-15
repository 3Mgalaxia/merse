import { FormEvent, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

import { useAuth } from "@/contexts/AuthContext";
import { useEnergy } from "@/contexts/EnergyContext";
import {
  createProjectDocument,
  ProjectDocument,
  ProjectEffect,
  ProjectModelAsset,
  updateProjectDocument,
  appendModelAsset,
  replaceModelAssets,
  appendImageAsset,
} from "@/lib/projects";
import { applyCreditCharges, CREDIT_COSTS, CreditCharge } from "@/lib/credits";
import { EFFECT_LIBRARY, EffectDefinition } from "@/lib/effects";
import { firebaseFirestore } from "@/lib/firebase";

type FlowKey = "site" | "model" | "effect";
type LayoutMode = "code" | "image" | "3d";

type ProjectRecord = ProjectDocument & { id: string };

const ACTION_COST = CREDIT_COSTS;

const clampEffectIntensity = (effect: EffectDefinition, value: number) =>
  Math.min(Math.max(value, effect.minIntensity), effect.maxIntensity);

const MERSE_PALETTE_REFERENCE = [
  { title: "Neon Galaxy", colors: "ROXO • AZUL • MAGENTA" },
  { title: "Aurora Boreal", colors: "VERDE • CIANO • LILÁS" },
  { title: "Void Minimal", colors: "PRETO • CINZA PROFUNDO • BRANCO" },
  { title: "Sunset Nova", colors: "LARANJA • ROSA • ROXO" },
];

const LAYOUT_MODES: { id: LayoutMode; label: string; description: string }[] = [
  { id: "code", label: "Somente código", description: "Gera apenas a estrutura HTML/CSS." },
  { id: "image", label: "Com imagem IA", description: "Após gerar a base, cria hero via OpenAI." },
  { id: "3d", label: "Com elemento 3D", description: "Envia um elemento para a Meshy e anexa ao projeto." },
];

const THEMES = [
  { id: "cosmic", label: "Cosmic Pulse" },
  { id: "neon", label: "Neon Plasma" },
  { id: "void", label: "Void Minimal" },
];

type MeshTask = {
  taskId: string;
  prompt: string;
  status: "processing" | "ready" | "failed";
  url?: string;
  previewUrl?: string;
  label: string;
};

export default function BuilderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const energy = useEnergy();

  const [flow, setFlow] = useState<FlowKey>("site");
  const [siteName, setSiteName] = useState("Projeto Merse");
  const [prompt, setPrompt] = useState("Site futurista para uma clínica de dentista premium com IA.");
  const [goal, setGoal] = useState("Gerar um site moderno com CTA duplo e depoimentos 3D.");
  const [menu, setMenu] = useState("Início, Tratamentos, Equipe, Planos, Contato");
  const [theme, setTheme] = useState(THEMES[0]);
  const [primaryColor, setPrimaryColor] = useState("#a855f7");
  const [secondaryColor, setSecondaryColor] = useState("#14b8a6");
  const [accentColor, setAccentColor] = useState("#ec4899");
  const [paletteDescription, setPaletteDescription] = useState("Roxo neon com azul profundo e rosa magenta.");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("code");
  const [selectedEffect, setSelectedEffect] = useState<EffectDefinition>(EFFECT_LIBRARY[0]);
  const [effectIntensity, setEffectIntensity] = useState(EFFECT_LIBRARY[0].minIntensity);
  const [meshConcept, setMeshConcept] = useState("Elemento 3D conectado ao tema");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingHero, setIsGeneratingHero] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [meshTasks, setMeshTasks] = useState<MeshTask[]>([]);
  const [pollingTasks, setPollingTasks] = useState<Record<string, NodeJS.Timeout>>({});
  const [shareUrl, setShareUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const effectPayload: ProjectEffect = useMemo(
    () => ({
      id: selectedEffect.id,
      name: selectedEffect.name,
      intensity: clampEffectIntensity(selectedEffect, effectIntensity),
      params: { description: selectedEffect.description },
    }),
    [selectedEffect, effectIntensity],
  );

  useEffect(() => {
    if (!user || !firebaseFirestore) return;

    const projectQuery = query(
      collection(firebaseFirestore, "projects"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(6),
    );

    const unsubscribe = onSnapshot(projectQuery, (snapshot) => {
      const docs: ProjectRecord[] = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as ProjectDocument;
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: (data.createdAt as Timestamp | undefined)?.toDate?.(),
          updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate?.(),
        };
      });
      setProjects(docs);

      if (currentProjectId) {
        const latest = docs.find((doc) => doc.id === currentProjectId);
        if (latest) {
          setCurrentProject(latest);
        }
      }
    });

    return () => unsubscribe();
  }, [user, currentProjectId]);

  useEffect(() => {
    return () => {
      Object.values(pollingTasks).forEach((timeoutId) => {
        clearInterval(timeoutId);
      });
    };
  }, [pollingTasks]);

  useEffect(() => {
    if (!currentProjectId || typeof window === "undefined") {
      setShareUrl("");
      setCopyStatus("idle");
      return;
    }
    setShareUrl(`${window.location.origin}/p/${currentProjectId}`);
    setCopyStatus("idle");
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProject) return;
    const options = (currentProject.options ?? {}) as {
      siteName?: string;
      paletteColors?: { primary?: string; secondary?: string; accent?: string };
    };
    if (options.siteName) {
      setSiteName(options.siteName);
    }
    if (options.paletteColors?.primary) setPrimaryColor(options.paletteColors.primary);
    if (options.paletteColors?.secondary) setSecondaryColor(options.paletteColors.secondary);
    if (options.paletteColors?.accent) setAccentColor(options.paletteColors.accent);
    if (currentProject.prompt) {
      setPrompt(currentProject.prompt);
      setMeshConcept(currentProject.prompt);
    }
    if (typeof options.meshConcept === "string") {
      setMeshConcept(options.meshConcept);
    }
    if (typeof options.paletteDescription === "string") {
      setPaletteDescription(options.paletteDescription);
    }
  }, [currentProject?.id]);

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      console.warn("Não foi possível copiar o link público:", error);
    }
  };

  const handleGenerateStructure = async (event: FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("Faça login para gerar projetos.");
      return;
    }

    const charges: CreditCharge[] = [{ action: "site" }];
    if (layoutMode === "image") {
      charges.push({ action: "image" });
    }
    if (layoutMode === "3d") {
      charges.push({ action: "model" });
    }

    let totalCostCharged = 0;
    try {
      const chargeResult = await applyCreditCharges(user.uid, charges);
      totalCostCharged = chargeResult.totalCost;
      if (totalCostCharged > 0) {
        energy.registerUsage(totalCostCharged);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Créditos insuficientes.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merse-uid": user.uid,
        },
        body: JSON.stringify({
          siteName,
          goal,
          menu,
          layout: {
            id: theme.id,
            label: theme.label,
            description: `${theme.label} com cores personalizadas`,
            highlights: ["Hero cósmico", "CTA duplo", "Seção 3D"],
          },
          palette: {
            id: "custom",
            label: "Paleta personalizada",
            preview: `${primaryColor}, ${secondaryColor}, ${accentColor}`,
          },
          modules: ["Hero 3D animado", "Tabela de planos", "CTA"],
          notes: `Efeito selecionado: ${selectedEffect.name} (intensidade ${effectPayload.intensity}). Cores: ${paletteDescription || `${primaryColor}, ${secondaryColor}, ${accentColor}`}.`,
          heroMood: `Tema ${theme.label} com efeito ${selectedEffect.name}`,
          rawBrief: prompt,
          structureOnly: true,
          paletteColors: {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: accentColor,
          },
          paletteDescription,
          effect: {
            id: selectedEffect.id,
            name: selectedEffect.name,
            intensity: effectIntensity,
          },
        }),
      });

      type WebsiteResponse = {
        summary: string;
        highlights: string[];
        html: string;
        imageUrl?: string;
      };

      const resultJson = await response.json();
      if (!response.ok) {
        throw new Error(resultJson.error ?? "Não foi possível gerar o site.");
      }

      const website = (resultJson.website ?? {}) as WebsiteResponse;
      const summary = website?.summary ?? "Resumo indisponível";
      const highlights = Array.isArray(website?.highlights) ? website.highlights : [];
      const html = website?.html ?? "<!DOCTYPE html><html><body><p>Blueprint indisponível.</p></body></html>";

      const projectId = await createProjectDocument(user.uid, {
        prompt,
        summary,
        highlights,
        html,
        status: "draft",
        flow: flow,
        theme: theme.id,
        palette: "custom",
        effect: effectPayload,
        options: {
          siteName,
          menu,
          paletteColors: { primaryColor, secondaryColor, accentColor },
          paletteDescription,
          meshConcept,
          theme: theme.label,
        },
        assets: {
          images: [],
          models3d: [],
        },
      });

      setCurrentProjectId(projectId);
      setStatusMessage("Estrutura criada. Ajuste os próximos passos.");

      if (layoutMode === "image") {
        await generateHeroForProject(projectId, html, { skipCharge: true, silent: true });
      } else if (layoutMode === "3d") {
        const concept = meshConcept.trim() || prompt;
        await handleMeshyRequest(projectId, concept, concept, { skipCharge: true, silent: true });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado ao gerar o site.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMeshyRequest = async (
    projectId: string,
    meshPrompt: string,
    label: string,
    options?: { skipCharge?: boolean; silent?: boolean },
  ) => {
    if (!user) {
      setErrorMessage("Faça login para solicitar 3D.");
      return;
    }

    if (!meshPrompt || !meshPrompt.trim()) {
      setErrorMessage("Descreva o elemento 3D antes de solicitar.");
      return;
    }

    if (!options?.skipCharge) {
      try {
        await applyCreditCharges(user.uid, [{ action: "model" }]);
        energy.registerUsage(ACTION_COST.model);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Créditos insuficientes para o 3D.");
        return;
      }
    }

    if (!options?.silent) {
      setStatusMessage("Modelo 3D enviado para a Meshy...");
    }

    try {
      const response = await fetch("/api/meshy/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merse-uid": user.uid,
        },
        body: JSON.stringify({
          prompt: `${meshPrompt}. Modelo 3D altamente detalhado seguindo a identidade Merse.`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível enviar o job 3D.");
      }

      const taskId = data.taskId as string;
      const newTask: MeshTask = {
        taskId,
        prompt: meshPrompt,
        label,
        status: "processing",
      };

      setMeshTasks((prev) => [...prev, newTask]);

      await appendModelAsset(projectId, {
        id: `${Date.now()}-${taskId}`,
        taskId,
        label,
        status: "processing",
      });

      const interval = setInterval(() => pollMeshyTask(projectId, newTask), 12000);
      setPollingTasks((prev) => ({ ...prev, [taskId]: interval }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao solicitar o modelo 3D.");
    }
  };

  const handleAddModelManually = async () => {
    if (!currentProjectId || !currentProject) {
      setErrorMessage("Selecione um projeto antes de solicitar o 3D.");
      return;
    }

    const concept = meshConcept.trim() || currentProject.prompt;
    await handleMeshyRequest(
      currentProjectId,
      concept,
      `Modelo ${currentProject.assets.models3d.length + 1}`,
    );
    setStatusMessage("Modelo 3D enviado para produção.");
  };

  const generateHeroForProject = async (
    projectId: string,
    html: string,
    options?: { skipCharge?: boolean; silent?: boolean },
  ) => {
    if (!user) {
      setErrorMessage("Faça login para gerar imagens.");
      return;
    }

    if (!options?.skipCharge) {
      try {
        await applyCreditCharges(user.uid, [{ action: "image" }]);
        energy.registerUsage(ACTION_COST.image);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Créditos insuficientes para imagem.");
        return;
      }
    }

    if (!options?.silent) {
      setIsGeneratingHero(true);
      setStatusMessage("Gerando hero com IA...");
    }
    setErrorMessage(null);
    try {
      const response = await fetch("/api/generate-hero", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merse-uid": user.uid,
        },
        body: JSON.stringify({
          siteName,
          goal,
          layout: { label: theme.label, description: `${theme.label} com cores customizadas` },
          palette: { label: "Custom", preview: `${primaryColor}, ${secondaryColor}, ${accentColor}` },
          heroMood: `Tema ${theme.label} com efeito ${selectedEffect.name}`,
          notes: `Efeito ${selectedEffect.name} (intensidade ${effectPayload.intensity}). Cores: ${paletteDescription || `${primaryColor}, ${secondaryColor}, ${accentColor}`}.`,
          rawBrief: prompt,
          html,
          paletteColors: {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: accentColor,
          },
          paletteDescription,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o hero.");
      }

      const assetId = `hero-${Date.now()}`;
      await appendImageAsset(projectId, {
        id: assetId,
        label: "Hero IA",
        url: data.imageUrl,
      });
      await updateProjectDocument(projectId, { html: data.html });

      setCurrentProject((prev) =>
        prev
          ? {
              ...prev,
              html: data.html,
              assets: {
                ...prev.assets,
                images: [...(prev.assets.images ?? []), { id: assetId, label: "Hero IA", url: data.imageUrl }],
              },
            }
          : prev,
      );
      if (!options?.silent) {
        setStatusMessage("Hero atualizado com sucesso.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao gerar hero.");
    } finally {
      if (!options?.silent) {
        setIsGeneratingHero(false);
      }
    }
  };

  const handleGenerateHero = async () => {
    if (!currentProjectId || !currentProject) {
      setErrorMessage("Gere e selecione um projeto antes de criar o hero.");
      return;
    }
    await generateHeroForProject(currentProjectId, currentProject.html);
  };

  const pollMeshyTask = async (projectId: string, task: MeshTask) => {
    try {
      const response = await fetch(`/api/meshy/status?taskId=${task.taskId}`, {
        headers: { "x-merse-uid": user?.uid ?? "" },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao consultar Meshy.");
      }

      const status = (data.status ?? "").toLowerCase();
      if (status === "in_progress" || status === "processing" || status === "pending") {
        return;
      }

      clearInterval(pollingTasks[task.taskId]);
      setPollingTasks((prev) => {
        const next = { ...prev };
        delete next[task.taskId];
        return next;
      });

      if (status === "failed" || status === "error") {
        setMeshTasks((prev) =>
          prev.map((item) => (item.taskId === task.taskId ? { ...item, status: "failed" } : item)),
        );
        setErrorMessage("O modelo 3D falhou. Tente novamente.");
        return;
      }

      const result = data.result ?? {};
      const url =
        result?.model_url ??
        result?.model_urls?.glb ??
        result?.model_urls?.gltf ??
        result?.model ??
        null;
      const preview = result?.preview_url ?? result?.thumbnail_url ?? null;

      const updatedTask: MeshTask = {
        ...task,
        status: "ready",
        url: url ?? undefined,
        previewUrl: preview ?? undefined,
      };

      setMeshTasks((prev) =>
        prev.map((item) => (item.taskId === task.taskId ? updatedTask : item)),
      );

      const existing = currentProject?.assets.models3d ?? [];
      const nextAssets: ProjectModelAsset[] = existing.map((asset) =>
        asset.taskId === task.taskId
          ? {
              ...asset,
              status: "ready",
              url: url ?? asset.url,
              previewUrl: preview ?? asset.previewUrl,
            }
          : asset,
      );
      if (!existing.find((asset) => asset.taskId === task.taskId)) {
        nextAssets.push({
          id: `${Date.now()}-${task.taskId}`,
          taskId: task.taskId,
          label: task.label,
          status: "ready",
          url: url ?? undefined,
          previewUrl: preview ?? undefined,
        });
      }

      await replaceModelAssets(projectId, nextAssets);
      setStatusMessage("Modelo 3D pronto e anexado ao projeto.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao consultar o job 3D.");
    }
  };

  const handlePublish = async () => {
    if (!currentProjectId) return;
    try {
      await updateProjectDocument(currentProjectId, { status: "published" });
      setStatusMessage("Projeto publicado. Link disponível em /p/[id].");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível publicar o projeto.");
    }
  };

  const handlePreview = () => {
    if (!currentProjectId) return;
    void router.push(`/p/${currentProjectId}`);
  };

  const renderProjectCard = (project: ProjectRecord) => (
    <div
      key={project.id}
      className={`rounded-2xl border px-4 py-3 transition ${
        currentProjectId === project.id ? "border-purple-400/60 bg-white/5" : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
        <span>{project.status}</span>
        <button
          type="button"
          className="text-purple-300 hover:text-white"
          onClick={() => {
            setCurrentProjectId(project.id);
            setCurrentProject(project);
          }}
        >
          Abrir
        </button>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">
        {((project.options as Record<string, unknown>)?.siteName as string) ?? project.summary}
      </p>
      <p className="text-xs text-white/60">{project.prompt.slice(0, 120)}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
        <span>{project.theme}</span>
          <span>{project.palette}</span>
          {project.effect ? (
            <span>
              {project.effect.name} • {project.effect.intensity}
            </span>
          ) : null}
        </div>
      </div>
  );

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <Head>
          <title>Merse Builder</title>
        </Head>
        <p className="text-sm uppercase tracking-[0.6em] text-purple-200">Merse Builder</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Faça login para criar seus sites</h1>
        <p className="mt-3 max-w-lg text-center text-white/70">
          Conecte-se para acompanhar créditos, salvar projetos e publicar os seus blueprints cósmicos.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-6 rounded-full border border-purple-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white hover:bg-purple-500/20"
        >
          Ir para login
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Merse Builder</title>
      </Head>
      <div className="min-h-screen bg-[#02010a] px-4 py-12 text-white lg:px-10">
        <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.55)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Merse Builder</p>
            <h1 className="mt-2 text-3xl font-semibold">Monte experiências completas com IA + 3D</h1>
            <p className="mt-2 text-sm text-white/70">
              Escolha o fluxo abaixo para gerar sites, anexar elementos 3D via Meshy e aplicar efeitos Merse em um só lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
            <span className="rounded-full border border-white/15 px-4 py-1">Créditos restantes: {energy.remaining}</span>
            <span className="rounded-full border border-white/15 px-4 py-1">Plano: {energy.planName}</span>
          </div>
        </header>

        <section className="mx-auto mt-8 flex w-full max-w-6xl flex-wrap gap-3">
          {(["site", "model", "effect"] as FlowKey[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFlow(item)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.4em] ${
                flow === item ? "border-purple-400 bg-purple-500/20 text-white" : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
              }`}
            >
              {item === "site" ? "Criar Site" : item === "model" ? "Adicionar 3D" : "Adicionar Efeito"}
            </button>
          ))}
        </section>

        <div className="mx-auto mt-8 grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <form className="space-y-6" onSubmit={handleGenerateStructure}>
              <div>
                <label className="text-xs uppercase tracking-[0.4em] text-white/60">Nome do site</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(event) => setSiteName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Ex.: Clínica Andromeda"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.4em] text-white/60">Prompt principal</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  rows={4}
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Layout base</p>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  {LAYOUT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setLayoutMode(mode.id)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                        layoutMode === mode.id ? "border-purple-400 bg-purple-500/10 text-white" : "border-white/10 bg-black/30 text-white/70 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      <p className="font-semibold">{mode.label}</p>
                      <p className="text-xs text-white/60">{mode.description}</p>
                    </button>
                  ))}
                </div>
                {layoutMode === "3d" && (
                  <textarea
                    value={meshConcept}
                    onChange={(event) => setMeshConcept(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    placeholder="Descreva o elemento 3D (ex.: dente holográfico realista, nave espacial orgânica...)"
                    rows={2}
                  />
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.4em] text-white/60">Objetivo</label>
                  <textarea
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.4em] text-white/60">Menu</label>
                  <textarea
                    value={menu}
                    onChange={(event) => setMenu(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Tema</p>
                  <div className="mt-2 space-y-2">
                    {THEMES.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setTheme(item)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                          theme.id === item.id ? "border-purple-400 bg-purple-500/10" : "border-white/10 bg-black/30 hover:border-white/30"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Paleta personalizada</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <label className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs uppercase tracking-[0.3em] text-white/60">
                      Primária
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(event) => setPrimaryColor(event.target.value)}
                        className="mt-3 h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-transparent"
                      />
                    </label>
                    <label className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs uppercase tracking-[0.3em] text-white/60">
                      Secundária
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(event) => setSecondaryColor(event.target.value)}
                        className="mt-3 h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-transparent"
                      />
                    </label>
                    <label className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs uppercase tracking-[0.3em] text-white/60">
                      Acento
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(event) => setAccentColor(event.target.value)}
                        className="mt-3 h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-transparent"
                      />
                    </label>
                  </div>
                  <textarea
                    value={paletteDescription}
                    onChange={(event) => setPaletteDescription(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    placeholder="Descreva as cores predominantes (ex.: violeta neon, azul profundo e rosa magenta)"
                    rows={2}
                  />
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-white/40">Paleta Merse (referência)</p>
                    <ul className="space-y-2">
                      {MERSE_PALETTE_REFERENCE.map((palette) => (
                        <li key={palette.title}>
                          <span className="font-semibold text-white/80">{palette.title}</span>
                          <span className="ml-2 text-white/60">{palette.colors}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Efeitos</p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {EFFECT_LIBRARY.map((effect) => (
                    <button
                      type="button"
                      key={effect.id}
                      onClick={() => {
                        setSelectedEffect(effect);
                        setEffectIntensity((prev) => clampEffectIntensity(effect, prev));
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                        selectedEffect.id === effect.id ? "border-purple-400 bg-purple-500/10" : "border-white/10 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <p className="font-semibold text-white">{effect.name}</p>
                      <p className="text-xs text-white/60">{effect.description}</p>
                    </button>
                  ))}
                </div>
                <label className="mt-4 block text-xs uppercase tracking-[0.4em] text-white/60">
                  Intensidade ({effectIntensity}) — {selectedEffect.minIntensity} a {selectedEffect.maxIntensity}
                </label>
                <input
                  type="range"
                  min={selectedEffect.minIntensity}
                  max={selectedEffect.maxIntensity}
                  value={effectIntensity}
                  onChange={(event) =>
                    setEffectIntensity(clampEffectIntensity(selectedEffect, Number(event.target.value)))
                  }
                  className="mt-2 w-full"
                />
              </div>

              {errorMessage && (
                <p className="rounded-2xl border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                  {errorMessage}
                </p>
              )}
              {statusMessage && (
                <p className="rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                  {statusMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full rounded-2xl border border-purple-400/70 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.5em] text-white shadow-[0_20px_80px_rgba(168,85,247,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? "Gerando estrutura..." : "Gerar estrutura"}
              </button>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Preview</h2>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
                  <button
                    type="button"
                    onClick={handleGenerateHero}
                    disabled={!currentProjectId || isGeneratingHero}
                    className="rounded-full border border-white/15 px-3 py-1 disabled:opacity-40"
                  >
                    {isGeneratingHero ? "Gerando hero..." : "Gerar hero IA"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={!currentProjectId}
                    className="rounded-full border border-white/15 px-3 py-1 disabled:opacity-40"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={!currentProjectId}
                    className="rounded-full border border-purple-400 px-3 py-1 disabled:border-white/15 disabled:opacity-40"
                  >
                    Publicar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddModelManually}
                    disabled={!currentProjectId}
                    className="rounded-full border border-white/15 px-3 py-1 disabled:opacity-40"
                  >
                    + 3D
                  </button>
                </div>
              </div>
              {shareUrl && (
                <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-white/70">
                  <p className="uppercase tracking-[0.4em] text-white/50">Link público</p>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate font-mono text-[11px]">{shareUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyShare}
                      className="rounded-full border border-purple-400/70 px-3 py-1 text-[10px] uppercase tracking-[0.35em]"
                    >
                      {copyStatus === "copied" ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              {currentProject ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-white/70">
                    {((currentProject.options as Record<string, unknown>)?.siteName as string) ?? currentProject.summary}
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-black">
                    <iframe
                      title="preview"
                      className="h-[360px] w-full border-0"
                      srcDoc={currentProject.html}
                    />
                  </div>
                  {currentProject.assets.images?.length ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-white/60">Assets</p>
                      <div className="mt-2 grid gap-3">
                        {currentProject.assets.images.map((asset) => (
                          <div key={asset.id} className="overflow-hidden rounded-2xl border border-white/10">
                            <img src={asset.url} alt={asset.label} className="h-40 w-full object-cover" />
                            <p className="px-3 py-2 text-xs uppercase tracking-[0.35em] text-white/60">{asset.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {currentProject.assets.models3d?.length ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-white/60">Modelos 3D</p>
                      <ul className="mt-2 space-y-2 text-sm text-white/70">
                        {currentProject.assets.models3d.map((asset) => (
                          <li key={asset.id} className="rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            {asset.label} • {asset.status}
                            {asset.url ? (
                              <a href={asset.url} target="_blank" rel="noreferrer" className="ml-2 text-purple-300">
                                baixar
                              </a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/50">Gere um projeto para ver o preview.</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
              <h2 className="text-lg font-semibold">Projetos recentes</h2>
              {projects.length ? (
                <div className="mt-4 space-y-3">{projects.map(renderProjectCard)}</div>
              ) : (
                <p className="mt-4 text-sm text-white/60">Nenhum projeto salvo ainda.</p>
              )}
            </div>

            {meshTasks.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
                <h2 className="text-lg font-semibold">Fila 3D (Meshy)</h2>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {meshTasks.map((task) => (
                    <li key={task.taskId} className="rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
                      {task.label} • {task.status}
                      {task.url ? (
                        <a href={task.url} target="_blank" rel="noreferrer" className="ml-2 text-purple-300">
                          arquivo
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
