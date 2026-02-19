import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiBriefcaseFill,
  PiQuestionFill,
  PiDownloadSimpleFill,
  PiFilmSlateFill,
  PiMonitorPlayFill,
  PiPaperPlaneTiltFill,
  PiSparkleFill,
  PiUploadSimpleFill,
  PiUsersThreeFill,
  PiXBold,
} from "react-icons/pi";
import { AnimatePresence, motion } from "framer-motion";
import { useEnergy } from "@/contexts/EnergyContext";
import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import PromptChat from "@/components/PromptChat";
import {
  appendUserCreations,
  generateCreationId,
  getUserStorageKey,
} from "@/lib/creations";

type ScenarioOption = {
  id: string;
  label: string;
  description: string;
};

type VideoGoal = {
  id: string;
  label: string;
  description: string;
};

type GeneratedVideo = {
  url: string;
  storyboard?: string;
  duration?: number;
  merged?: boolean;
  mergeError?: string;
  segments?: Array<{
    index: number;
    duration: number;
    videoUrl: string;
    cover?: string;
    provider: string;
  }>;
};

type CorporateHistory = {
  id: string;
  userId: string;
  company: string;
  goal: string;
  scenario: string;
  duration: number;
  videoUrl: string;
  script: string;
  createdAt: string;
};

const SCENARIOS: ScenarioOption[] = [
  {
    id: "galaxy",
    label: "Neo Galaxy",
    description: "Ambiente espacial com atmosfera corporativa futurista.",
  },
  {
    id: "space",
    label: "Orbit Workspace",
    description: "Escritórios flutuantes com colaboradores holográficos.",
  },
  {
    id: "studio",
    label: "Studio Vision",
    description: "Estúdio minimalista, luz neutra e destaque para produto.",
  },
  {
    id: "urban",
    label: "City Nova",
    description: "Megacidade noturna com painéis Merse e publicidade digital.",
  },
];

const GOALS: VideoGoal[] = [
  { id: "launch", label: "Lançamento de produto", description: "Apresente um produto ou feature." },
  { id: "institutional", label: "Institucional", description: "Conte a história e valores da empresa." },
  { id: "events", label: "Eventos/Feiras", description: "Convide para experiências presenciais." },
  { id: "training", label: "Educação", description: "Tutorial ou onboarding com IA." },
];

const CURRENT_USER_FALLBACK = "demo-user";
const COST_PER_VIDEO = 32;
const HISTORY_SOURCE = "/corporate-videos.json";

export default function VideosEmpresas() {
  const energy = useEnergy();
  const { user } = useAuth();
  const router = useRouter();
  const [logo, setLogo] = useState<string | null>(null);
  const [logoPayload, setLogoPayload] = useState<string | undefined>();
  const [companyName, setCompanyName] = useState("Merse Labs");
  const [goal, setGoal] = useState<string>(GOALS[0].id);
  const [scenario, setScenario] = useState<string>(SCENARIOS[0].id);
  const [scriptBrief, setScriptBrief] = useState(
    "Mostrar journey do cliente usando IA Merse, destacar resultados e depoimentos.",
  );
  const [duration, setDuration] = useState<number>(45);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [history, setHistory] = useState<CorporateHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const usageExceeds = useMemo(
    () => energy.usage + COST_PER_VIDEO > energy.limit,
    [energy.limit, energy.usage],
  );

  const userKey = useMemo(
    () => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined),
    [user?.email, user?.uid],
  );

  const currentUserId = useMemo(
    () => user?.uid ?? CURRENT_USER_FALLBACK,
    [user?.uid],
  );

  useEffect(() => {
    fetch(HISTORY_SOURCE)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar histórico corporativo.");
        }
        const data = (await response.json()) as { videos?: CorporateHistory[] };
        setHistory(data.videos?.filter((video) => video.userId === currentUserId) ?? []);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [currentUserId]);

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogo(result);
      setLogoPayload(result);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogo(null);
    setLogoPayload(undefined);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!companyName.trim() || !scriptBrief.trim()) {
      setError("Informe o nome da empresa e o briefing para gerar o roteiro.");
      return;
    }

    if (energy.plan === "free") {
      setError("O plano Free não permite gerar vídeos corporativos. Atualize seu plano para usar este módulo.");
      return;
    }

    if (String(energy.plan) === "free") {
      setError("O plano Free não permite gerar vídeos corporativos. Redirecionando para os planos Merse...");
      setTimeout(() => {
        router.push("/planos").catch(() => void 0);
      }, 600);
      return;
    }

    if (usageExceeds) {
      setError("Energia insuficiente. Atualize seu plano para gerar mais vídeos corporativos.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setGeneratedVideo(null);
    setStoryboard(null);

    try {
      const response = await fetch("/api/generate-corporate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companyName,
          goal,
          scenario,
          duration,
          scriptBrief,
          logo: logoPayload,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o vídeo corporativo.");
      }

      if (!data.videoUrl) {
        throw new Error("A resposta não retornou o vídeo. Tente novamente.");
      }

      setGeneratedVideo({
        url: data.videoUrl,
        storyboard: data.storyboard,
        duration: data.duration ?? duration,
        merged: Boolean(data.merged),
        mergeError: typeof data.mergeError === "string" ? data.mergeError : undefined,
        segments: Array.isArray(data.segments)
          ? data.segments
              .map((segment: any, idx: number) => ({
                index:
                  typeof segment?.index === "number" && Number.isFinite(segment.index)
                    ? segment.index
                    : idx + 1,
                duration:
                  typeof segment?.duration === "number" && Number.isFinite(segment.duration)
                    ? segment.duration
                    : 0,
                videoUrl: typeof segment?.videoUrl === "string" ? segment.videoUrl : "",
                cover: typeof segment?.cover === "string" ? segment.cover : undefined,
                provider: typeof segment?.provider === "string" ? segment.provider : "unknown",
              }))
              .filter((segment: { videoUrl: string }) => Boolean(segment.videoUrl))
          : undefined,
      });
      setStoryboard(data.storyboard ?? null);
      // Nao bloqueie o fim do loader aguardando persistencia em background (Firebase/localStorage).
      setIsLoading(false);
      energy.registerUsage(COST_PER_VIDEO);

      const goalLabel = GOALS.find((item) => item.id === goal)?.label ?? goal;
      const scenarioLabel = SCENARIOS.find((item) => item.id === scenario)?.label ?? scenario;
      const timestamp = new Date().toISOString();

      void appendUserCreations(
        userKey,
        [
          {
            id: generateCreationId("video"),
            type: "video",
            prompt: scriptBrief,
            createdAt: timestamp,
            previewUrl: data.videoUrl,
            downloadUrl: data.videoUrl,
            meta: {
              empresa: companyName,
              objetivo: goalLabel,
              cenario: scenarioLabel,
              duracao: data.duration ?? duration,
            },
          },
        ],
        { userId: user?.uid },
      ).catch((persistError) => {
        console.warn("[videos-empresas] Falha ao salvar criacao:", persistError);
      });

      setHistory((prev) => [
        {
          id: `corp-${Date.now()}`,
          userId: currentUserId,
          company: companyName,
          goal: goalLabel,
          scenario: scenarioLabel,
          duration: data.duration ?? duration,
          videoUrl: data.videoUrl,
          script: data.storyboard ?? scriptBrief,
          createdAt: timestamp,
        },
        ...prev,
      ]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Geração cancelada.");
      } else if ((err as Error)?.name === "AbortError") {
        setError("Geração cancelada.");
      } else {
        const message = err instanceof Error ? err.message : "Erro inesperado ao gerar vídeo.";
        setError(message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setError("Geração cancelada.");
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_60%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[480px] bg-[radial-gradient(circle_at_60%_25%,rgba(236,72,153,0.32),transparent_60%),radial-gradient(circle_at_25%_35%,rgba(37,99,235,0.28),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-blue-200/80">Corporate Vision</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              Vídeos corporativos com narrativa galáctica
            </h1>
            <p className="max-w-2xl text-sm text-white/70">
              Combine logo, estilo e objetivos para produzir um vídeo institucional completo com a estética Merse.
            </p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
            <PiUsersThreeFill className="text-2xl text-blue-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Vídeos anteriores</p>
              <p>{history.length ? `${history.length} campanhas salvas` : "Nenhum ainda"}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_100px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(59,130,246,0.26),transparent_55%)] opacity-90" />
            <div className="relative flex flex-col gap-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <PiUploadSimpleFill className="text-blue-300" />
                  Logo da empresa
                </label>
                <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-blue-400/40 hover:text-white">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                  {logo ? (
                    <div className="flex w-full flex-col items-center gap-3">
                      <img src={logo} alt="Logo" className="h-28 w-full rounded-xl object-contain bg-white/5 p-4" />
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/60 transition hover:border-white/50 hover:text-white"
                        disabled={isLoading}
                      >
                        remover logo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <PiUploadSimpleFill className="text-xl text-blue-300" />
                      <p className="text-xs uppercase tracking-[0.3em]">Arraste ou selecione</p>
                      <p className="text-[11px] text-white/50">PNG transparente fica perfeito nas animações.</p>
                    </div>
                  )}
                </label>
              </div>

              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Nome da empresa
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  disabled={isLoading}
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Objetivo do vídeo
                <select
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  disabled={isLoading}
                >
                  {GOALS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-4">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <PiFilmSlateFill className="text-blue-300" />
                  Cenário visual
                </span>
                <div className="grid gap-3 md:grid-cols-2">
                  {SCENARIOS.map((option) => {
                    const isActive = scenario === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setScenario(option.id)}
                        className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-blue-400/60 bg-blue-500/10 text-white shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                            : "border-white/10 bg-black/30 text-white/65 hover:border-blue-400/40 hover:text-white"
                        }`}
                        disabled={isLoading}
                      >
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Briefing do roteiro
                  <textarea
                    value={scriptBrief}
                    onChange={(event) => setScriptBrief(event.target.value)}
                    placeholder="Ex.: Mostrar laboratório, entrevistas curtas com executivos e depoimento de cliente."
                    className="mt-2 min-h-[110px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    disabled={isLoading}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAssistantOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-blue-400/60 bg-blue-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-100 transition hover:bg-blue-500/20"
                  >
                    <PiQuestionFill className="text-sm" />
                    Precisa de ajuda com o prompt?
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <span className="flex items-center gap-2">
                    <PiMonitorPlayFill className="text-blue-300" />
                    Duração
                  </span>
                  <span className="text-white/50">{duration}s</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={5}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 accent-white"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                  <span>Pitch rápido</span>
                  <span>Institucional completo</span>
                </div>
              </div>

              {error && (
                <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs uppercase tracking-[0.3em] text-white/60">
                <div className="flex items-center justify-between">
                  <span>
                    Uso atual: {energy.usage}/{energy.limit}
                  </span>
                  <span>Custo: {COST_PER_VIDEO} créditos</span>
                </div>
                {usageExceeds && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                    Você está chegando ao limite. Visite {" "}
                    <Link
                      className="underline underline-offset-4 hover:text-white"
                      href="/planos"
                      aria-label="Ir para planos"
                    >
                      Planos Merse
                    </Link>
                    {" "}para desbloquear mais energia.
                  </div>
                )}
              </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="group flex items-center justify-center gap-3 rounded-2xl border border-blue-400/60 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(37,99,235,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PiPaperPlaneTiltFill className={`text-xl transition ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Gerando vídeo..." : "Gerar vídeo corporativo"}
            </button>
            {isLoading && (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Cancelar
              </button>
            )}
          </div>
        </section>

          <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-2 text-white/70">
              <h2 className="text-2xl font-semibold text-white">Preview e roteiro</h2>
              <p className="text-sm">
                Assista ao vídeo gerado, exporte ou revise o storyboard sugerido pela IA Merse.
              </p>
            </header>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
              <MerseLoadingOverlay
                active={isLoading}
                label="Produzindo vídeo corporativo..."
                sublabel="Roteiro, cenas e animações Merse estão sendo renderizados."
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_60%)] opacity-80" />
              <div className="relative flex min-h-[320px] flex-col items-center justify-center gap-4">
                {generatedVideo ? (
                  <>
                    <video
                      src={generatedVideo.url}
                      controls
                      className="w-full rounded-2xl bg-black object-cover"
                    />
                    <div className="flex items-center justify-between w-full text-[11px] uppercase tracking-[0.3em] text-white/55">
                      <span>Duração {generatedVideo.duration ?? duration}s</span>
                      <a
                        href={generatedVideo.url}
                        download={`merse-corporate-${Date.now()}.mp4`}
                        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                      >
                        <PiDownloadSimpleFill />
                        download
                      </a>
                    </div>
                    {generatedVideo.merged ? (
                      <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
                        Vídeo final concatenado automaticamente a partir dos segmentos.
                      </div>
                    ) : generatedVideo.mergeError ? (
                      <div className="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                        Segmentos gerados, mas a concatenação automática falhou: {generatedVideo.mergeError}
                      </div>
                    ) : null}
                    {Array.isArray(generatedVideo.segments) && generatedVideo.segments.length > 1 && (
                      <div className="w-full rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-xs text-blue-100">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-blue-200/80">
                          Sequência em {generatedVideo.segments.length} clipes
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {generatedVideo.segments.map((segment) => (
                            <a
                              key={`${segment.index}-${segment.videoUrl}`}
                              href={segment.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-xl border border-blue-300/25 bg-black/30 px-3 py-2 text-[11px] text-blue-100 transition hover:border-blue-300/50"
                            >
                              <span>
                                Clip {segment.index} • {segment.duration}s
                              </span>
                              <span className="uppercase tracking-[0.25em] text-blue-200/75">{segment.provider}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {generatedVideo.storyboard && (
                      <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/75">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Storyboard</p>
                        <p className="mt-2 whitespace-pre-line">{generatedVideo.storyboard}</p>
                      </div>
                    )}
                  </>
                ) : !generatedVideo ? (
                  <div className="flex flex-col items-center gap-3 text-center text-sm text-white/60">
                    <PiMonitorPlayFill className="text-3xl text-blue-300" />
                    <p>
                      Preencha o briefing, selecione cenário e clique em {" "}
                      <span className="uppercase tracking-[0.35em] text-white">Gerar vídeo corporativo</span>.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {history.slice(0, 4).map((entry) => (
                <article
                  key={entry.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70 shadow-[0_22px_70px_rgba(0,0,0,0.4)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_60%)] opacity-70" />
                  <div className="relative space-y-3">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/55">
                      <span>{entry.company}</span>
                      <span>{
                        new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        }).format(new Date(entry.createdAt))
                      }</span>
                    </div>
                    <img
                      src={entry.videoUrl}
                      alt={entry.company}
                      className="h-32 w-full rounded-2xl object-cover"
                    />
                    <p>
                      <strong>Objetivo:</strong> {entry.goal}
                    </p>
                    <p className="text-xs text-white/60">
                      <strong>Storyboard:</strong> {entry.script}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">{entry.duration}s</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_60%)] opacity-80" />
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">Dicas Merse</p>
                  <ul className="space-y-2">
                    <li>• Combine com material gerado no Object Lab para mostrar produtos.</li>
                    <li>• Use depoimentos curtos (10s) para reforçar confiança.</li>
                    <li>• Integre cenas de interface Merse para explicar fluxos.</li>
                  </ul>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.15),transparent_60%)] opacity-80" />
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">Pipeline</p>
                  <ul className="space-y-2">
                    <li>1. Upload do logo e briefing.</li>
                    <li>2. IA Merse gera roteiro+vídeo.</li>
                    <li>3. Revise, faça ajustes e exporte para o cliente.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {isAssistantOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-black/0"
              onClick={() => setIsAssistantOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="fixed bottom-6 right-6 z-50 w-full max-w-md"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="relative flex h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/85 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(false)}
                  className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition hover:border-white/40 hover:bg-white/20 hover:text-white"
                  aria-label="Fechar assistente de prompts"
                >
                  <PiXBold className="text-base" />
                </button>
                <div className="h-full overflow-hidden px-4 pb-4 pt-10">
                  <PromptChat embedded storageKey="merse.chat.corporate" />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
