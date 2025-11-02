import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiCoatHangerFill,
  PiDownloadSimpleFill,
  PiFilmSlateFill,
  PiFlowArrowFill,
  PiFlameFill,
  PiTimerFill,
  PiUploadSimpleFill,
} from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";
import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import {
  appendUserCreations,
  generateCreationId,
  getUserStorageKey,
} from "@/lib/creations";

const COST_PER_RENDER = 22;

type ModelPreset = {
  id: string;
  label: string;
  description: string;
};

const MODEL_PRESETS: ModelPreset[] = [
  { id: "metahuman", label: "MetaHuman", description: "Modelo hiper-realista com animação suave." },
  { id: "fashion-runway", label: "Runway Fashion", description: "Passarela 3D com luz neon." },
  { id: "hologram", label: "Holograma 360°", description: "Render volumétrico com partículas." },
];

const CAM_ANGLES = [
  { id: "orbit", label: "Órbita 360°" },
  { id: "front", label: "Front cinematic" },
  { id: "detail", label: "Macro tecidos" },
];

const FABRIC_PRESETS = [
  "Algodão futurista",
  "Couro líquido",
  "Tecno holográfico",
  "Linho espacial",
  "Mesh respirável",
];

type RenderResult = {
  videoUrl: string;
  cover?: string;
  duration?: number;
  fabric?: string;
};

export default function VideoRoupas() {
  const energy = useEnergy();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(
    "Traje streetwear feminino futurista com jaqueta holográfica e tênis antigravidade.",
  );
  const [modelPreset, setModelPreset] = useState<ModelPreset>(MODEL_PRESETS[0]);
  const [cameraAngle, setCameraAngle] = useState<string>(CAM_ANGLES[0].id);
  const [fabric, setFabric] = useState<string>(FABRIC_PRESETS[0]);
  const [duration, setDuration] = useState(8);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referencePayload, setReferencePayload] = useState<string | undefined>();
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const usageExceeds = useMemo(
    () => energy.usage + COST_PER_RENDER > energy.limit,
    [energy.limit, energy.usage],
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
      setError("Descreva o look que deseja animar.");
      return;
    }

    if (usageExceeds) {
      setError("Energia insuficiente. Reforce seu plano para continuar gerando vídeos.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setRenderResult(null);

    try {
      const response = await fetch("/api/generate-fashion-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          modelPreset: modelPreset.id,
          cameraAngle,
          fabric,
          duration,
          referenceImage: referencePayload,
        }),
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o vídeo fashion.");
      }

      if (!data.videoUrl) {
        throw new Error("A resposta não retornou o vídeo. Tente novamente em instantes.");
      }

      setRenderResult({
        videoUrl: data.videoUrl,
        cover: data.cover,
        duration: data.duration ?? duration,
        fabric: data.fabric ?? fabric,
      });
      energy.registerUsage(COST_PER_RENDER);

      const cameraLabel =
        CAM_ANGLES.find((angle) => angle.id === cameraAngle)?.label ?? cameraAngle;
      const timestamp = new Date().toISOString();
      await appendUserCreations(
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
              modelo: modelPreset.label,
              camera: cameraLabel,
              tecido: data.fabric ?? fabric,
              duracao: data.duration ?? duration,
            },
          },
        ],
        { userId: user?.uid },
      );
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
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[500px] bg-[radial-gradient(circle_at_65%_30%,rgba(236,72,153,0.32),transparent_60%),radial-gradient(circle_at_20%_25%,rgba(14,165,233,0.28),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(236,72,153,0.28),transparent_55%)] opacity-90" />
          <div className="relative flex flex-col gap-6">
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-[0.5em] text-pink-200/80">Studio Merse</p>
              <h1 className="text-3xl font-semibold text-white lg:text-4xl">Runway Wear Labs</h1>
              <p className="text-sm text-white/70">
                Transforme descrições e fotos em vídeos fashion com modelos virtuais, foco em tecidos e
                iluminação futurista.
              </p>
            </header>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <PiFilmSlateFill className="text-pink-300" />
                Prompt do look
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ex.: combinado streetwear masculino com jaqueta oversized matelassê, calça em tecido técnico e tênis com LED azul."
                className="min-h-[140px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-4">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <PiCoatHangerFill className="text-pink-300" />
                Modelos e passarelas
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                {MODEL_PRESETS.map((preset) => {
                  const isActive = preset.id === modelPreset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setModelPreset(preset)}
                      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-pink-300/60 bg-pink-500/10 text-white shadow-[0_0_25px_rgba(236,72,153,0.35)]"
                          : "border-white/10 bg-black/30 text-white/70 hover:border-pink-300/40 hover:text-white"
                      }`}
                      disabled={isLoading}
                    >
                      <span className="text-base font-semibold">{preset.label}</span>
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
                <PiFlowArrowFill className="text-pink-300" />
                Câmera e foco
              </span>
              <div className="grid grid-cols-3 gap-3">
                {CAM_ANGLES.map((angle) => {
                  const isActive = angle.id === cameraAngle;
                  return (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => setCameraAngle(angle.id)}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        isActive
                          ? "border-pink-300/60 bg-pink-500/10 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                          : "border-white/10 bg-black/30 text-white/65 hover:border-pink-300/40 hover:text-white"
                      }`}
                      disabled={isLoading}
                    >
                      {angle.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <PiFlameFill className="text-pink-300" />
                Tecidos destaque
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                {FABRIC_PRESETS.map((fabricPreset) => {
                  const isActive = fabricPreset === fabric;
                  return (
                    <button
                      key={fabricPreset}
                      type="button"
                      onClick={() => setFabric(fabricPreset)}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        isActive
                          ? "border-pink-300/60 bg-pink-500/10 text-white"
                          : "border-white/10 bg-black/30 text-white/65 hover:border-pink-300/40 hover:text-white"
                      }`}
                      disabled={isLoading}
                    >
                      {fabricPreset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiUploadSimpleFill className="text-pink-300" />
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
                  <span className="text-white/40">Foto frontal ou vídeo curto</span>
                )}
              </div>
              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-pink-300/40 hover:text-white">
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
                    <PiUploadSimpleFill className="text-xl text-pink-300" />
                    <p className="text-xs uppercase tracking-[0.3em]">Arraste ou selecione</p>
                    <p className="text-[11px] text-white/50">
                      Envie foto do look ou vídeo curto do manequim para precisão.
                    </p>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                <span className="flex items-center gap-2">
                  <PiTimerFill className="text-pink-300" />
                  Duração
                </span>
                <span className="text-white/50">{duration}s</span>
              </div>
              <input
                type="range"
                min={4}
                max={16}
                step={2}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                disabled={isLoading}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 accent-white"
              />
              <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                <span>Loop curto</span>
                <span>Desfile completo</span>
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
                <span>Custo: {COST_PER_RENDER} créditos</span>
              </div>
              {usageExceeds && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  Próximo render pode exceder seu limite. Veja{" "}
                  <Link
                    className="underline underline-offset-4 hover:text-white"
                    href="/planos"
                    aria-label="Ir para planos"
                  >
                    Planos Merse
                  </Link>{" "}
                  para ampliar a energia.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="group flex items-center justify-center gap-3 rounded-2xl border border-pink-400/60 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(236,72,153,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PiFlameFill className={`text-xl transition ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Renderizando..." : "Gerar fashion video"}
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
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(236,72,153,0.2),transparent_55%)] opacity-80" />
            <div className="relative space-y-5">
              <header>
                <p className="text-xs uppercase tracking-[0.4em] text-pink-200/80">
                  Preview Merse
                </p>
                <h2 className="text-2xl font-semibold text-white">Look em movimento</h2>
              </header>

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
                <MerseLoadingOverlay
                  active={isLoading}
                  label="Animando look Merse..."
                  sublabel="Tecidos digitais e passarela estão sendo renderizados."
                />
                {renderResult ? (
                  <div className="space-y-4">
                    <video
                      src={renderResult.videoUrl}
                      poster={renderResult.cover}
                      controls
                      className="w-full rounded-xl bg-black object-cover"
                    />
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/60">
                      <span>Duração {renderResult.duration ?? duration}s</span>
                      <span>Tecido {renderResult.fabric}</span>
                    </div>
                    <div className="flex justify-end">
                      <a
                        href={renderResult.videoUrl}
                        download={`merse-fashion-${Date.now()}.mp4`}
                        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                      >
                        <PiDownloadSimpleFill />
                        download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-white/60">
                    <PiCoatHangerFill className="text-3xl text-pink-300" />
                    <p>
                      Descreva o look, ajuste a passarela e clique em{" "}
                      <span className="uppercase tracking-[0.35em] text-white">Gerar</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.15),transparent_60%)] opacity-80" />
              <div className="relative space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Dicas Merse</p>
                <ul className="space-y-2">
                  <li>• Combine vídeo com banners de runway para campanha completa.</li>
                  <li>• Use modo Holograma para vitrines digitais e AR.</li>
                  <li>• Ajuste a câmera “Macro tecidos” para close de textura.</li>
                </ul>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_60%)] opacity-80" />
              <div className="relative space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Pipeline</p>
                <ul className="space-y-2">
                  <li>1. Upload do look ou referência.</li>
                  <li>2. Escolha modelo, câmera e tecido.</li>
                  <li>3. Gerar vídeo e exportar.</li>
                  <li>4. Publicar em campanhas da Merse.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
