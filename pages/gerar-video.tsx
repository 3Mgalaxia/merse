import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiClockCountdownFill,
  PiDownloadSimpleFill,
  PiFilmSlateFill,
  PiFlameFill,
  PiSlidersFill,
  PiUploadSimpleFill,
  PiSparkleFill,
  PiRobotFill,
  PiPlanetFill,
  PiCurrencyCircleDollarFill,
  PiCaretDownBold,
} from "react-icons/pi";
import { AnimatePresence, motion } from "framer-motion";
import { useEnergy } from "@/contexts/EnergyContext";
import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { appendUserCreations, generateCreationId, getUserStorageKey } from "@/lib/creations";

type AspectPreset = {
  id: string;
  label: string;
  description: string;
  value: string;
};

const ASPECT_PRESETS: AspectPreset[] = [
  { id: "16:9", label: "16:9", description: "Wide cinematic", value: "16:9" },
  { id: "9:16", label: "9:16", description: "Vertical social", value: "9:16" },
  { id: "1:1", label: "1:1", description: "Quadrado imersivo", value: "1:1" },
  { id: "4:5", label: "4:5", description: "Retrato editorial", value: "4:5" },
  { id: "3:2", label: "3:2", description: "Narrativa clássica", value: "3:2" },
];

const ASPECT_CLASS_MAP: Record<string, string> = {
  "16:9": "aspect-[16/9]",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "3:2": "aspect-[3/2]",
};

type ProviderKey = "veo" | "sora" | "merse" | "wan" | "kling";

type ProviderConfig = {
  id: ProviderKey;
  label: string;
  description: string;
  cost: number;
  accent: string;
  icon: "robot" | "planet";
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "veo",
    label: "Veo 3",
    description: "Qualidade cinematográfica com simulações de câmera realistas.",
    cost: 30,
    accent: "from-cyan-500/15 via-blue-500/10 to-purple-500/20",
    icon: "robot",
  },
  {
    id: "sora",
    label: "Sora 2",
    description: "Motor OpenAI focado em storytelling, física e detalhes sutis.",
    cost: 34,
    accent: "from-purple-500/15 via-fuchsia-500/10 to-indigo-500/20",
    icon: "robot",
  },
  {
    id: "merse",
    label: "Merse AI 1.0",
    description: "Motor proprietário sintonizado com a estética oficial da Merse.",
    cost: 24,
    accent: "from-indigo-500/15 via-purple-500/10 to-pink-500/20",
    icon: "planet",
  },
  {
    id: "wan",
    label: "Wan-2.6-t2v",
    description: "wan-video/wan-2.6-t2v para geração rápida com estética consistente.",
    cost: 20,
    accent: "from-emerald-500/15 via-teal-500/12 to-blue-500/18",
    icon: "robot",
  },
  {
    id: "kling",
    label: "Kling v2.5 Turbo",
    description: "kwaivgi/kling-v2.5-turbo-pro para sequências fluidas e detalhadas.",
    cost: 22,
    accent: "from-amber-500/15 via-orange-500/12 to-red-500/18",
    icon: "robot",
  },
];

const PROVIDER_MAP = PROVIDERS.reduce<Record<ProviderKey, ProviderConfig>>((acc, provider) => {
  acc[provider.id] = provider;
  return acc;
}, {} as Record<ProviderKey, ProviderConfig>);

const PROVIDER_ASPECTS: Record<ProviderKey, AspectPreset["id"][]> = {
  veo: ["16:9", "9:16"],
  sora: ["16:9", "9:16"],
  merse: ["16:9", "9:16"],
  wan: ["16:9", "9:16"],
  kling: ["16:9", "9:16"],
};

const PROVIDER_DURATION: Record<
  ProviderKey,
  { min: number; max: number; step: number; default: number; labels: [string, string] }
> = {
  veo: { min: 4, max: 8, step: 2, default: 6, labels: ["Take curto", "Vinheta longa"] },
  sora: { min: 6, max: 18, step: 2, default: 12, labels: ["Storyboard", "Sequência narrativa"] },
  merse: { min: 4, max: 20, step: 2, default: 12, labels: ["Clipes curtos", "Sequências longas"] },
  wan: { min: 4, max: 16, step: 2, default: 10, labels: ["Rápido", "Estendido"] },
  kling: { min: 4, max: 16, step: 2, default: 10, labels: ["Rápido", "Estendido"] },
};

type GeneratedVideo = {
  url: string;
  cover?: string;
  duration?: number;
  provider?: ProviderKey;
  aspectId?: AspectPreset["id"];
};

export default function GerarVideo() {
  const router = useRouter();
  const energy = useEnergy();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<AspectPreset>(ASPECT_PRESETS[0]);
  const [providerId, setProviderId] = useState<ProviderKey>("veo");
  const [duration, setDuration] = useState(PROVIDER_DURATION.veo.default);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referencePayload, setReferencePayload] = useState<string | undefined>();
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const provider = useMemo(
    () => PROVIDER_MAP[providerId] ?? PROVIDERS[0],
    [providerId],
  );

  const availableAspects = useMemo(() => {
    const allowed = PROVIDER_ASPECTS[provider.id];
    return ASPECT_PRESETS.filter((preset) => allowed.includes(preset.id));
  }, [provider.id]);

  useEffect(() => {
    if (!availableAspects.find((preset) => preset.id === aspect.id)) {
      setAspect(availableAspects[0]);
    }
  }, [availableAspects, aspect.id]);

  useEffect(() => {
    const rules = PROVIDER_DURATION[provider.id];
    setDuration((current) => {
      if (current < rules.min || current > rules.max) {
        return rules.default;
      }
      return current;
    });
  }, [provider.id]);

  const usageExceeds = useMemo(
    () => energy.usage + provider.cost > energy.limit,
    [energy.limit, energy.usage, provider.cost],
  );

  const userKey = useMemo(
    () => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined),
    [user?.email, user?.uid],
  );

  const handleReferenceUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReferencePreview(result);
      setReferencePayload(result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearReference = () => {
    setReferencePreview(null);
    setReferencePayload(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Descreva a sequência que deseja gerar.");
      return;
    }

    if (String(energy.plan) === "free") {
      setError("O plano Free não permite gerar vídeos. Redirecionando para a página de planos...");
      setTimeout(() => {
        router.push("/planos").catch(() => void 0);
      }, 600);
      return;
    }

    if (usageExceeds) {
      setError("Você atingiu o limite do seu plano. Reforce sua energia em Planos Merse.");
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

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: provider.id,
          aspectRatio: aspect.value,
          duration,
          referenceImage: referencePayload,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o vídeo.");
      }

      if (!data.videoUrl) {
        throw new Error("A resposta não retornou o vídeo. Tente novamente em instantes.");
      }

      setGeneratedVideo({
        url: data.videoUrl,
        cover: data.cover,
        duration: data.duration ?? duration,
        provider: provider.id,
        aspectId: aspect.id,
      });
      // Nao bloqueie o fim do loader aguardando persistencia em background (Firebase/localStorage).
      setIsLoading(false);
      energy.registerUsage(provider.cost);

      const timestamp = new Date().toISOString();
      void appendUserCreations(
        userKey,
        [
          {
            id: generateCreationId("video"),
            type: "video",
            prompt,
            createdAt: timestamp,
            previewUrl: data.cover ?? data.videoUrl,
            downloadUrl: data.videoUrl,
            meta: {
              provider: provider.label,
              aspect: aspect.value,
              duration: data.duration ?? duration,
            },
          },
        ],
        { userId: user?.uid },
      ).catch((persistError) => {
        console.warn("[gerar-video] Falha ao salvar criacao:", persistError);
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Geração cancelada.");
      } else if ((err as Error)?.name === "AbortError") {
        setError("Geração cancelada.");
      } else {
        const message = err instanceof Error ? err.message : "Erro inesperado ao gerar o vídeo.";
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
      <div className="pointer-events-none absolute inset-x-0 top-20 -z-10 h-[460px] bg-[radial-gradient(circle_at_30%_30%,rgba(129,140,248,0.32),transparent_60%),radial-gradient(circle_at_70%_40%,rgba(236,72,153,0.28),transparent_60%)] blur-3xl opacity-80" />

      <div className="absolute right-6 top-28 z-10 flex items-center gap-3">
        <Link
          href="/gerar"
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
          aria-label="Voltar para o hub de geração"
        >
          VOLTAR
        </Link>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key="video-generator-mode"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,420px)_1fr]"
        >
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(79,70,229,0.28),transparent_55%)] opacity-90" />
          <div className="relative flex flex-col gap-6">
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-[0.5em] text-blue-200/80">Oficina Merse</p>
              <h1 className="text-3xl font-semibold text-white">Nebula Motion Studio</h1>
              <p className="text-sm text-white/70">
                Descreva a cena, escolha proporção e duração para gerar uma sequência que parece ter
                sido capturada em outra galáxia.
              </p>
            </header>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                  <PiSparkleFill className="text-blue-300/80" />
                  Motor de geração
                </span>
                <button
                  type="button"
                  onClick={() => setIsProviderMenuOpen((prev) => !prev)}
                  disabled={isLoading}
                  className="flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-left text-xs uppercase tracking-[0.35em] text-white/80 transition hover:border-blue-300/40 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/40 text-lg text-white">
                      {provider.icon === "planet" ? <PiPlanetFill /> : <PiRobotFill />}
                    </span>
                    {provider.label}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70">
                    <PiCurrencyCircleDollarFill className="text-blue-300/80" />
                    {provider.cost}
                  </span>
                  <PiCaretDownBold
                    className={`text-xs transition ${isProviderMenuOpen ? "rotate-180 text-blue-200" : ""}`}
                  />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isProviderMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="space-y-2 rounded-2xl border border-white/10 bg-black/40 p-3"
                  >
                    {PROVIDERS.map((option) => {
                      const isActive = option.id === provider.id;
                      const Icon = option.icon === "planet" ? PiPlanetFill : PiRobotFill;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setProviderId(option.id);
                            setIsProviderMenuOpen(false);
                          }}
                          disabled={isLoading}
                          className={`relative flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                            isActive
                              ? `border-blue-400/60 bg-gradient-to-r ${option.accent} text-white shadow-[0_8px_20px_rgba(59,130,246,0.25)]`
                              : "border-white/10 bg-black/50 text-white/70 hover:border-blue-300/40 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-lg text-white">
                              <Icon />
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-white">{option.label}</p>
                              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                                {option.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70">
                            <PiCurrencyCircleDollarFill className="text-blue-300/80" />
                            {option.cost}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <PiFilmSlateFill className="text-blue-300" />
                Prompt cinematográfico
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ex.: drone filmando cidade cyberpunk chuvosa, neon pastel, estilo filme slow motion."
                className="min-h-[140px] w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <PiSlidersFill className="text-blue-300" />
                  Proporção
                </span>
                <span className="text-xs uppercase tracking-[0.25em] text-white/40">
                  {aspect.description}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {availableAspects.map((preset) => {
                  const isActive = preset.id === aspect.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAspect(preset)}
                      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-blue-400/60 bg-blue-500/10 text-white shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                          : "border-white/10 bg-black/30 text-white/65 hover:border-blue-400/40 hover:text-white"
                      }`}
                      disabled={isLoading}
                    >
                      <span className="text-base font-semibold tracking-widest">{preset.label}</span>
                      <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiUploadSimpleFill className="text-blue-300" />
                  Referência opcional
                </span>
                {referencePreview ? (
                  <button
                    type="button"
                    onClick={handleClearReference}
                    className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/50 hover:text-white"
                    disabled={isLoading}
                  >
                    remover
                  </button>
                ) : (
                  <span className="text-white/40">frames, storyboard ou thumbnail</span>
                )}
              </div>
              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-blue-400/40 hover:text-white">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  onChange={handleReferenceUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                {referencePreview ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    <img
                      src={referencePreview}
                      alt="Referência carregada"
                      className="h-32 w-full rounded-xl object-cover shadow-lg"
                    />
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                      <PiUploadSimpleFill />
                      Atualizar referência
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PiUploadSimpleFill className="text-xl text-blue-300" />
                    <p className="text-xs uppercase tracking-[0.3em]">Arraste ou selecione</p>
                    <p className="text-[11px] text-white/50">
                      Uma referência melhora consistência, personagens e cores.
                    </p>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiClockCountdownFill className="text-blue-300" />
                  Duração
                </span>
                <span className="text-white/50">{duration}s</span>
              </div>
              <input
                type="range"
                min={PROVIDER_DURATION[provider.id].min}
                max={PROVIDER_DURATION[provider.id].max}
                step={PROVIDER_DURATION[provider.id].step}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                disabled={isLoading}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 accent-white"
              />
              <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                <span>{PROVIDER_DURATION[provider.id].labels[0]}</span>
                <span>{PROVIDER_DURATION[provider.id].labels[1]}</span>
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
                <span>Custo: {provider.cost} créditos</span>
              </div>
              {usageExceeds && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  Seus créditos estão no limite. Explore{" "}
                  <Link
                    className="underline underline-offset-4 hover:text-white"
                    href="/planos"
                    aria-label="Ir para planos"
                  >
                    Planos Merse
                  </Link>{" "}
                  para desbloquear mais energia.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="group flex items-center justify-center gap-3 rounded-2xl border border-blue-400/60 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(37,99,235,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PiFlameFill className={`text-xl transition ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Gerando..." : "Gerar sequência"}
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
            <h2 className="text-2xl font-semibold text-white">Preview intergaláctico</h2>
            <p className="text-sm">
              Faça download do clipe, capture o tempo exato ou refine o prompt para continuar evoluindo
              o storytelling.
            </p>
          </header>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            <MerseLoadingOverlay
              active={isLoading}
              label="Sintetizando frames Merse..."
              sublabel="A sequência está sendo renderizada com partículas cósmicas."
            />
            {generatedVideo ? (
              <div className="relative w-full overflow-hidden rounded-2xl bg-black/40">
                <video
                  src={generatedVideo.url}
                  poster={generatedVideo.cover}
                  controls
                  className={`w-full ${
                    ASPECT_CLASS_MAP[generatedVideo.aspectId ?? aspect.id] ?? "aspect-[16/9]"
                  } rounded-2xl bg-black object-cover`}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/70">
                  <span>Duração {generatedVideo.duration ?? duration}s</span>
                  <a
                    href={generatedVideo.url}
                    download={`merse-video-${Date.now()}.mp4`}
                    className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                  >
                    <PiDownloadSimpleFill />
                    download
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 text-center text-sm text-white/60">
                <PiClockCountdownFill className="text-2xl text-blue-300" />
                <p>
                  Descreva a cena e toque em{" "}
                  <span className="uppercase tracking-[0.35em] text-white">Gerar sequência</span>.
                </p>
              </div>
            )}
          </div>

        </section>
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
