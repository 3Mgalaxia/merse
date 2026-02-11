import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiArrowsClockwiseBold,
  PiDownloadSimpleFill,
  PiLightningFill,
  PiSparkleFill,
  PiSlidersFill,
  PiUploadSimpleFill,
  PiCubeFocusFill,
  PiTimerFill,
} from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";
import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import {
  appendUserCreations,
  generateCreationId,
  getUserStorageKey,
} from "@/lib/creations";

const COST_PER_OBJECT = 18;

type MaterialPreset = {
  id: string;
  label: string;
  description: string;
};

const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: "metallic", label: "Metallic Nova", description: "Cromado com reflexos roxos e azuis." },
  { id: "matte", label: "Matte Void", description: "Textura fosca, sombras suaves e contraste alto." },
  { id: "holographic", label: "Holo Prism", description: "Refração translúcida com partículas." },
  { id: "organic", label: "Organic Terra", description: "Fibra natural com detalhes de luz quente." },
];

const LIGHTING_PRESETS = [
  { id: "studio", label: "Studio Merse", description: "Softbox frontal + rim neon." },
  { id: "cyberpunk", label: "Cyberpunk Alley", description: "Backlight magenta + preenchimento ciano." },
  { id: "galaxy", label: "Nebula Glow", description: "Iluminação volumétrica com partículas." },
  { id: "daylight", label: "Aurora Daylight", description: "Luz natural difusa, tons frios." },
];

type GeneratedRender = {
  id: string;
  imageUrl: string;
  format?: string;
  angle?: string;
};

type GeneratedDownload = {
  id: string;
  url: string;
  type: string;
  provider?: string;
};

export default function GerarObjeto() {
  const router = useRouter();
  const energy = useEnergy();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(
    "Speaker portátil futurista com grade hexagonal e luzes reativas ao som.",
  );
  const [material, setMaterial] = useState<MaterialPreset>(MATERIAL_PRESETS[0]);
  const [lighting, setLighting] = useState<string>(LIGHTING_PRESETS[0].id);
  const [detailLevel, setDetailLevel] = useState(70);
  const [productReference, setProductReference] = useState<string | null>(null);
  const [brandReference, setBrandReference] = useState<string | null>(null);
  const [renders, setRenders] = useState<GeneratedRender[]>([]);
  const [downloads, setDownloads] = useState<GeneratedDownload[]>([]);
  const [providerUsed, setProviderUsed] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productInputRef = useRef<HTMLInputElement | null>(null);
  const brandInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const usageExceeds = useMemo(
    () => energy.usage + COST_PER_OBJECT > energy.limit,
    [energy.limit, energy.usage],
  );

  const userKey = useMemo(
    () => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined),
    [user?.email, user?.uid],
  );

  const handleUpload = (
    event: ChangeEvent<HTMLInputElement>,
    setState: (value: string | null) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setState(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = (setState: (value: string | null) => void, ref?: typeof productInputRef) => {
    setState(null);
    if (ref?.current) {
      ref.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Descreva o objeto que deseja renderizar.");
      return;
    }

    if (String(energy.plan) === "free") {
      setError("O plano Free não permite gerar objetos 3D. Redirecionando para os planos Merse...");
      setTimeout(() => {
        router.push("/planos").catch(() => void 0);
      }, 600);
      return;
    }

    if (usageExceeds) {
      setError("Energia insuficiente. Atualize seu plano para gerar mais objetos 3D.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setRenders([]);
    setDownloads([]);
    setProviderUsed(null);

    try {
      const response = await fetch("/api/generate-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          material: material.id,
          lighting,
          detail: detailLevel,
          references: {
            product: productReference,
            brand: brandReference,
          },
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o objeto.");
      }

      const generated: GeneratedRender[] = Array.isArray(data.renders)
        ? data.renders.map((render: any, index: number) => ({
            id: `render-${Date.now()}-${index}`,
            imageUrl: typeof render === "string" ? render : render.url,
            format: render?.format,
            angle: render?.angle,
          }))
        : data.imageUrl
        ? [
            {
              id: `render-${Date.now()}-0`,
              imageUrl: data.imageUrl,
              format: data.format,
              angle: data.angle,
            },
          ]
        : [];

      const generatedDownloads: GeneratedDownload[] = Array.isArray(data.downloads)
        ? data.downloads
            .map((entry: any, index: number) => ({
              id: `download-${Date.now()}-${index}`,
              url: typeof entry?.url === "string" ? entry.url : "",
              type: typeof entry?.type === "string" ? entry.type : "model",
              provider: typeof entry?.provider === "string" ? entry.provider : undefined,
            }))
            .filter((entry: GeneratedDownload) => entry.url.length > 0)
        : [];

      if (!generated.length && !generatedDownloads.length) {
        throw new Error("A resposta não trouxe renders nem arquivos 3D. Tente novamente.");
      }

      setRenders(generated);
      setDownloads(generatedDownloads);
      setProviderUsed(typeof data.provider === "string" ? data.provider : null);
      energy.registerUsage(COST_PER_OBJECT);

      const lightingLabel =
        LIGHTING_PRESETS.find((preset) => preset.id === lighting)?.label ?? lighting;
      const timestamp = new Date().toISOString();
      if (generated.length > 0) {
        const records = generated.map((render) => ({
          id: generateCreationId("object"),
          type: "object" as const,
          prompt,
          createdAt: timestamp,
          previewUrl: render.imageUrl,
          downloadUrl: render.imageUrl,
          meta: {
            material: material.label,
            lighting: lightingLabel,
            detalhe: `${detailLevel}%`,
            provider: typeof data.provider === "string" ? data.provider : undefined,
          },
        }));
        await appendUserCreations(userKey, records, { userId: user?.uid });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Geração cancelada.");
      } else if ((err as Error)?.name === "AbortError") {
        setError("Geração cancelada.");
      } else {
        const message = err instanceof Error ? err.message : "Erro inesperado ao gerar o objeto.";
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

  const skeletonRenders =
    renders.length === 0 && isLoading ? Array.from({ length: 3 }).map((_, index) => index) : [];

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[480px] bg-[radial-gradient(circle_at_60%_25%,rgba(236,72,153,0.28),transparent_55%),radial-gradient(circle_at_25%_30%,rgba(14,165,233,0.25),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.28),transparent_55%)] opacity-90" />
          <div className="relative flex flex-col gap-6">
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Object Forge</p>
              <h1 className="text-3xl font-semibold text-white">Holo Object Lab</h1>
              <p className="text-sm text-white/70">
                Crie renders cósmicos de produtos combinando materiais, iluminação e referências para
                entregar campanhas hiper-realistas.
              </p>
            </header>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <PiCubeFocusFill className="text-purple-300" />
                Prompt do objeto
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ex.: perfume Merse com frasco translúcido em forma de prisma, base metálica, partículas de luz orbitando."
                className="min-h-[140px] w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-4">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <PiSlidersFill className="text-purple-300" />
                Materiais
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                {MATERIAL_PRESETS.map((preset) => {
                  const isActive = preset.id === material.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setMaterial(preset)}
                      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-purple-300/60 bg-purple-500/10 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                          : "border-white/10 bg-black/30 text-white/70 hover:border-purple-300/40 hover:text-white"
                      }`}
                      disabled={isLoading}
                    >
                      <span className="text-sm font-semibold">{preset.label}</span>
                      <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <PiLightningFill className="text-purple-300" />
                Iluminação
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                {LIGHTING_PRESETS.map((preset) => {
                  const isActive = preset.id === lighting;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setLighting(preset.id)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        isActive
                          ? "border-purple-300/60 bg-purple-500/10 text-white"
                          : "border-white/10 bg-black/30 text-white/65 hover:border-purple-300/40 hover:text-white"
                      }`}
                      disabled={isLoading}
                    >
                      <span className="block text-sm font-semibold">{preset.label}</span>
                      <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiSlidersFill className="text-purple-300" />
                  Detalhamento
                </span>
                <span className="text-white/50">{detailLevel}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={detailLevel}
                onChange={(event) => setDetailLevel(Number(event.target.value))}
                disabled={isLoading}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 accent-white"
              />
              <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                <span>Estudos rápidos</span>
                <span>Render final</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiUploadSimpleFill className="text-purple-300" />
                  Referência do produto
                </span>
                {productReference ? (
                  <button
                    type="button"
                    onClick={() => clearReference(setProductReference, productInputRef)}
                    className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/50 hover:text-white"
                  >
                    remover
                  </button>
                ) : (
                  <span className="text-white/40">png • jpg • webp</span>
                )}
              </div>
              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-purple-300/40 hover:text-white">
                <input
                  ref={productInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleUpload(event, setProductReference)}
                  className="hidden"
                  disabled={isLoading}
                />
                {productReference ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    <img
                      src={productReference}
                      alt="Referência de produto"
                      className="h-32 w-full rounded-xl object-cover shadow-lg"
                    />
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                      <PiUploadSimpleFill />
                      Atualizar imagem
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PiUploadSimpleFill className="text-xl text-purple-300" />
                    <p className="text-xs uppercase tracking-[0.3em]">Arraste ou selecione</p>
                    <p className="text-[11px] text-white/50">
                      Ajuda a manter forma e proporções originais do objeto.
                    </p>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiUploadSimpleFill className="text-purple-300" />
                  Logo / marca
                </span>
                {brandReference ? (
                  <button
                    type="button"
                    onClick={() => clearReference(setBrandReference, brandInputRef)}
                    className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/50 hover:text-white"
                  >
                    remover
                  </button>
                ) : (
                  <span className="text-white/40">png transparente</span>
                )}
              </div>
              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-purple-300/40 hover:text-white">
                <input
                  ref={brandInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleUpload(event, setBrandReference)}
                  className="hidden"
                  disabled={isLoading}
                />
                {brandReference ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    <img
                      src={brandReference}
                      alt="Logo ou marca"
                      className="h-24 w-full rounded-xl object-contain bg-white/5 p-3"
                    />
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                      <PiUploadSimpleFill />
                      Atualizar logo
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PiUploadSimpleFill className="text-xl text-purple-300" />
                    <p className="text-xs uppercase tracking-[0.3em]">Adicionar logo opcional</p>
                    <p className="text-[11px] text-white/50">
                      A IA aplica branding e embalagens personalizadas automaticamente.
                    </p>
                  </div>
                )}
              </label>
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
                <span>Custo: {COST_PER_OBJECT} créditos</span>
              </div>
              {usageExceeds && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  Você está no limite de energia. Considere turbinar seus recursos em{" "}
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
              {isLoading ? "Renderizando..." : "Gerar objeto 3D"}
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
            label="Modelando objeto Merse..."
            sublabel="Texturas, luzes e materiais estão sendo sintetizados."
          />
          <header className="flex flex-col gap-2 text-white/70">
            <h2 className="text-2xl font-semibold text-white">Renders orbitais</h2>
            <p className="text-sm">
              Pré-visualize as variações, baixe as melhores e refine materiais ou iluminação para
              explorar novas combinações.
            </p>
            {providerUsed ? (
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/75">
                Engine ativa: {providerUsed}
              </p>
            ) : null}
          </header>

          {downloads.length > 0 && (
            <section className="rounded-3xl border border-cyan-300/25 bg-cyan-500/10 p-5 text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/90">
                  Arquivos 3D prontos
                </p>
                <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                  {downloads.length} download{downloads.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {downloads.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.url}
                    download
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-100/35 bg-black/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-50 transition hover:border-cyan-100/70 hover:bg-black/55"
                  >
                    <PiDownloadSimpleFill />
                    {asset.type}
                  </a>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {renders.map((render) => (
              <article
                key={render.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1 hover:border-purple-300/40"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.16),transparent_60%)] opacity-80 transition duration-300 group-hover:opacity-100" />
                <div className="relative flex flex-col gap-4">
                  <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-black/40">
                    <img
                      src={render.imageUrl}
                      alt="Render Merse"
                      className="h-full w-full object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/60">
                      <span>{render.angle ?? "Ângulo padrão"}</span>
                      <span>{render.format ?? "PNG"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/50">
                    <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 py-1">
                      <PiTimerFill />
                      {new Intl.DateTimeFormat("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date())}
                    </span>
                    <a
                      href={render.imageUrl}
                      download={`merse-object-${render.id}.png`}
                      className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                    >
                      <PiDownloadSimpleFill />
                      download
                    </a>
                  </div>
                </div>
              </article>
            ))}

            {skeletonRenders.map((skeleton) => (
              <div
                key={`skeleton-${skeleton}`}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.35)]"
              >
                <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-white/5">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-500/10 via-white/10 to-blue-500/10" />
                  <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_45%,rgba(255,255,255,0)_100%)] animate-[shimmer_1.6s_infinite] bg-[length:200%_100%]" />
                </div>
              </div>
            ))}
          </div>

          {!isLoading && renders.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-sm text-white/60">
              <PiArrowsClockwiseBold className="text-3xl text-purple-300" />
              <p>
                Seus renders aparecem aqui. Ajuste materiais, iluminação e referências para criar a
                estética perfeita, depois toque em{" "}
                <span className="uppercase tracking-[0.35em] text-white">Gerar objeto 3D</span>.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
