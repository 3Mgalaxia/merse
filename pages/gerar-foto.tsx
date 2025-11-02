import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiArrowsClockwiseBold,
  PiDownloadSimpleFill,
  PiImageSquareFill,
  PiSlidersFill,
  PiSparkleFill,
  PiUploadSimpleFill,
  PiRobotFill,
  PiPlanetFill,
  PiCurrencyCircleDollarFill,
  PiQuestionFill,
  PiCaretDownBold,
  PiXBold,
} from "react-icons/pi";
import { AnimatePresence, motion } from "framer-motion";
import { useEnergy } from "@/contexts/EnergyContext";
import PromptChat from "@/components/PromptChat";
import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { appendUserCreations, generateCreationId, getUserStorageKey } from "@/lib/creations";

type ProviderKey = "openai" | "flux" | "merse";

type ProviderConfig = {
  id: ProviderKey;
  label: string;
  description: string;
  cost: number;
  accent: string;
  icon: "openai" | "merse";
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    label: "ChatGPT Vision",
    description: "Precisão máxima via OpenAI — indicado para campanhas premium.",
    cost: 24,
    accent: "from-purple-500/20 via-fuchsia-500/10 to-indigo-500/20",
    icon: "openai",
  },
  {
    id: "flux",
    label: "Flux Studio",
    description: "Equilíbrio custo/detalhe para concepts rápidos e variações criativas.",
    cost: 16,
    accent: "from-blue-500/15 via-cyan-500/10 to-purple-500/15",
    icon: "openai",
  },
  {
    id: "merse",
    label: "Merse AI 1.0",
    description: "Motor proprietário alinhado à identidade Merse para alto volume.",
    cost: 12,
    accent: "from-indigo-500/15 via-purple-500/10 to-pink-500/15",
    icon: "merse",
  },
];

const PROVIDER_MAP = PROVIDERS.reduce<Record<ProviderKey, ProviderConfig>>((acc, provider) => {
  acc[provider.id] = provider;
  return acc;
}, {} as Record<ProviderKey, ProviderConfig>);

type AspectPreset = {
  id: string;
  label: string;
  description: string;
  value: string;
};

const ASPECT_PRESETS: AspectPreset[] = [
  { id: "16:9", label: "16:9", description: "Cinemático", value: "16:9" },
  { id: "3:2", label: "3:2", description: "Editorial", value: "3:2" },
  { id: "1:1", label: "1:1", description: "Quadrado", value: "1:1" },
  { id: "4:5", label: "4:5", description: "Retrato", value: "4:5" },
  { id: "9:16", label: "9:16", description: "Stories", value: "9:16" },
];

const PROVIDER_ASPECTS: Record<ProviderKey, AspectPreset["id"][]> = {
  openai: ["1:1", "3:2", "2:3"],
  flux: ["16:9", "3:2", "1:1", "4:5", "9:16"],
  merse: ["16:9", "3:2", "1:1", "4:5", "9:16"],
};

type GeneratedImage = {
  url: string;
  seed?: string | number;
  providerId: ProviderKey;
  intensity?: number;
};

export default function GerarFoto() {
  const energy = useEnergy();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<AspectPreset>(ASPECT_PRESETS[0]);
  const [stylization, setStylization] = useState(72);
  const [merseIntensity, setMerseIntensity] = useState(100);
  const [providerId, setProviderId] = useState<ProviderKey>("openai");
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referencePayload, setReferencePayload] = useState<string | undefined>();
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
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
  const usageExceeds = useMemo(() => energy.usage + provider.cost > energy.limit, [
    energy.limit,
    energy.usage,
    provider.cost,
  ]);

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
      setError("Descreva a cena que deseja gerar.");
      return;
    }

    if (usageExceeds) {
      setError("Você atingiu o limite do seu plano. Turbine seu acesso na página de planos.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const requestPayload: Record<string, unknown> = {
        prompt,
        provider: provider.id,
        aspectRatio: aspect.value,
        stylization,
        count: 4,
        referenceImage: referencePayload,
      };

      if (provider.id === "merse") {
        requestPayload.merseIntensity = merseIntensity;
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar as imagens.");
      }

      const intensityForResult = provider.id === "merse" ? merseIntensity : undefined;

      const images: GeneratedImage[] = Array.isArray(data.images)
        ? data.images.map((url: string, index: number) => ({
            url,
            seed: data.seeds?.[index],
            providerId: provider.id,
            intensity: intensityForResult,
          }))
        : data.imageUrl
        ? [
            {
              url: data.imageUrl,
              seed: Array.isArray(data.seeds) ? data.seeds[0] : data.seed,
              providerId: provider.id,
              intensity: intensityForResult,
            },
          ]
        : [];

      if (!images.length) {
        throw new Error("A resposta não retornou imagens. Tente novamente.");
      }

      setGeneratedImages(images);
      energy.registerUsage(provider.cost);

      const timestamp = new Date().toISOString();
      const records = images.map((item, index) => {
        const meta: Record<string, string | number> = {
          provider: provider.label,
          aspect: aspect.value,
          seed: item.seed ?? index + 1,
          stylization,
        };
        if (typeof item.intensity === "number") {
          meta.intensidade = item.intensity;
        }
        return {
          id: generateCreationId("image"),
          type: "image" as const,
          prompt,
          createdAt: timestamp,
          previewUrl: item.url,
          downloadUrl: item.url,
          meta,
        };
      });
      await appendUserCreations(userKey, records, { userId: user?.uid });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Geração cancelada.");
      } else if ((err as Error)?.name === "AbortError") {
        setError("Geração cancelada.");
      } else {
        const message = err instanceof Error ? err.message : "Erro inesperado ao gerar as imagens.";
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

  const shimmerTiles =
    generatedImages.length === 0 && isLoading ? Array.from({ length: 4 }).map((_, i) => i) : [];

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.18),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-20 -z-10 h-[480px] bg-[radial-gradient(circle_at_35%_35%,rgba(236,72,153,0.28),transparent_55%),radial-gradient(circle_at_70%_25%,rgba(14,165,233,0.22),transparent_60%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute right-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
        aria-label="Voltar para o hub de geração"
      >
        VOLTAR
      </Link>

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.28),transparent_55%)] opacity-90" />
          <div className="relative flex flex-col gap-6">
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Laboratório</p>
              <h1 className="text-3xl font-semibold text-white">Photon Forge Studio</h1>
              <p className="text-sm text-white/70">
                Combine proporções, intensidade e referências para gerar quatro visões que ressoam com
                o universo Merse.
              </p>
            </header>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                  <PiSparkleFill className="text-purple-300/80" />
                  Motor de geração
                </span>
                <button
                  type="button"
                  onClick={() => setIsProviderMenuOpen((prev) => !prev)}
                  disabled={isLoading}
                  className="flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-left text-xs uppercase tracking-[0.35em] text-white/80 transition hover:border-purple-300/40 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/40 text-lg text-white">
                      {provider.icon === "openai" ? <PiRobotFill /> : <PiPlanetFill />}
                    </span>
                    {provider.label}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70">
                    <PiCurrencyCircleDollarFill className="text-purple-300/80" />
                    {provider.cost}
                  </span>
                  <PiCaretDownBold
                    className={`text-xs transition ${isProviderMenuOpen ? "rotate-180 text-purple-200" : ""}`}
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
                      const Icon = option.icon === "openai" ? PiRobotFill : PiPlanetFill;
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
                              ? "border-purple-400/60 bg-white/[0.08] text-white shadow-[0_8px_20px_rgba(168,85,247,0.25)]"
                              : "border-white/10 bg-black/50 text-white/70 hover:border-purple-300/40 hover:text-white"
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
                            <PiCurrencyCircleDollarFill className="text-purple-300/80" />
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
                <PiSparkleFill className="text-purple-300" />
                Prompt Cósmico
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ex.: retrato hiper-realista de uma astronauta brasileira em órbita de Saturno, luz roxa neon, neblina cósmica, lente anamórfica."
                className="min-h-[140px] w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                disabled={isLoading}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 uppercase tracking-[0.35em]">
                  <PiCurrencyCircleDollarFill className="text-purple-300" />
                  Consumo: {provider.cost} moedas
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-purple-400/60 bg-purple-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-purple-100 transition hover:bg-purple-500/20"
                >
                  <PiQuestionFill className="text-sm" />
                  Precisa de ajuda com o prompt?
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <PiSlidersFill className="text-purple-300" />
                  Proporção
                </span>
                <span className="text-xs uppercase tracking-[0.25em] text-white/40">
                  {aspect.description}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {availableAspects.map((preset) => {
                  const isActive = preset.id === aspect.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAspect(preset)}
                      className={`group flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-purple-400/60 bg-purple-500/10 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                          : "border-white/10 bg-black/30 text-white/65 hover:border-purple-400/40 hover:text-white"
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
                  <PiImageSquareFill className="text-purple-300" />
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
                  <span className="text-white/40">png • jpg • webp</span>
                )}
              </div>

              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-purple-400/40 hover:text-white">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                {referencePreview ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    <div className="relative w-full overflow-hidden rounded-xl">
                      <img
                        src={referencePreview}
                        alt="Referência carregada"
                        className="h-32 w-full rounded-xl object-cover shadow-lg"
                      />
                      {provider.id === "merse" && (
                        <div
                          className="absolute top-0 right-0 h-full bg-black/65 transition-[width] duration-300 ease-out"
                          style={{ width: `${Math.max(0, Math.min(100, 100 - merseIntensity))}%` }}
                        />
                      )}
                    </div>
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                      <PiUploadSimpleFill />
                      Atualizar referência
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PiUploadSimpleFill className="text-xl text-purple-300" />
                    <p className="text-xs uppercase tracking-[0.3em]">Arraste ou selecione</p>
                    <p className="text-[11px] text-white/50">
                      Personalize o estilo das gerações com sua própria imagem.
                    </p>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiSlidersFill className="text-purple-300" />
                  Direção criativa
                </span>
                <span className="text-white/50">{stylization}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={stylization}
                onChange={(event) => setStylization(Number(event.target.value))}
                disabled={isLoading}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 accent-white"
              />
              <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                <span>Fiel à referência</span>
                <span>Exploração galáctica</span>
              </div>
            </div>

            {provider.id === "merse" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                  <span className="flex items-center gap-2">
                    <PiSlidersFill className="text-purple-300" />
                    Intensidade Merse
                  </span>
                  <span className="text-white/50">{merseIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={merseIntensity}
                  onChange={(event) => setMerseIntensity(Number(event.target.value))}
                  disabled={isLoading}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-slate-900 via-purple-600 to-purple-300 accent-white"
                />
                <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                  <span>Ocultar detalhes</span>
                  <span>Revelar totalmente</span>
                </div>
              </div>
            )}

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
                <span>Custo: {provider.cost} moedas</span>
              </div>
              {usageExceeds && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  Seus créditos estão no limite. Considere desbloquear mais energia em{" "}
                  <Link
                    className="underline underline-offset-4 hover:text-white"
                    href="/planos"
                    aria-label="Ir para planos"
                  >
                    Planos Merse
                  </Link>
                  .
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="group flex items-center justify-center gap-3 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(168,85,247,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PiSparkleFill className={`text-xl transition ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Gerando..." : "Gerar 4 visões"}
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

        <section className="relative flex flex-col gap-6">
          <MerseLoadingOverlay
            active={isLoading}
            label="Gerando visões Merse..."
            sublabel="Nosso motor está lapidando texturas e luzes cósmicas."
          />
          <header className="flex flex-col gap-2 text-white/70">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">Resultados quadridimensionais</h2>
              {!isLoading && generatedImages.length > 0 && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
                  Motor: {provider.label}
                </span>
              )}
            </div>
            <p className="text-sm">
              As variações aparecem aqui. Faça download, capture seeds ou refine com outro prompt para
              evoluir o visual.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {generatedImages.map((image, index) => (
              <article
                key={image.url ?? index}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
              >
                <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-black/40">
                  <img
                    src={image.url}
                    alt={`Geração ${index + 1}`}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  />
                  {image.providerId === "merse" && (
                    <div
                      className="absolute top-0 right-0 h-full bg-black/65 transition-[width] duration-500 ease-out"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, 100 - (image.intensity ?? merseIntensity ?? 100)),
                        )}%`,
                      }}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.3em] text-white/70">
                    <span>Seed {image.seed ?? index + 1}</span>
                    <div className="flex items-center gap-2">
                      {image.providerId === "merse" && (
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/80">
                          Intensidade {image.intensity ?? merseIntensity}%
                        </span>
                      )}
                      <a
                        href={image.url}
                        download={`merse-image-${Date.now()}-${index + 1}.png`}
                        className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                      >
                        <PiDownloadSimpleFill />
                        download
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {shimmerTiles.map((skeleton) => (
              <div
                key={`placeholder-${skeleton}`}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
              >
                <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-white/5">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-500/10 via-white/10 to-blue-500/10" />
                  <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_45%,rgba(255,255,255,0)_100%)] animate-[shimmer_1.6s_infinite] bg-[length:200%_100%]" />
                </div>
              </div>
            ))}
          </div>

          {!isLoading && generatedImages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-sm text-white/60">
              <PiArrowsClockwiseBold className="text-3xl text-purple-300" />
              <p>
                Suas criações aparecerão aqui. Ajuste o prompt, combine proporções e toque em{" "}
                <span className="uppercase tracking-[0.35em] text-white">Gerar 4 visões</span>.
              </p>
            </div>
          )}
        </section>
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
                  <PromptChat embedded />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
