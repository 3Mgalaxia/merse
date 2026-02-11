import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type VoicePreset = {
  id: "nova" | "orion" | "lumen" | "atlas";
  label: string;
  description: string;
  baseRate: number;
};

type CuePoint = {
  startSec: number;
  endSec: number;
  text: string;
};

type VoiceResult = {
  script: string;
  audioUrl: string;
  durationSec: number;
  provider: "openai-tts";
  voiceUsed: string;
  cues: CuePoint[];
  sync: {
    attempted: boolean;
    success: boolean;
    provider?: "replicate-lipsync";
    videoUrl?: string;
    message?: string;
  };
  warnings: string[];
  generatedAt?: string;
  latencyMs?: number;
};

const PRESETS: VoicePreset[] = [
  {
    id: "nova",
    label: "Nova (feminina)",
    description: "Clara, suave e futurista",
    baseRate: 0.98,
  },
  {
    id: "orion",
    label: "Orion (masculina)",
    description: "Grave, controlada e concisa",
    baseRate: 1.04,
  },
  {
    id: "lumen",
    label: "Lumen (feminina)",
    description: "Mais energética para anúncios",
    baseRate: 1.1,
  },
  {
    id: "atlas",
    label: "Atlas (masculina)",
    description: "Narrador épico com presença",
    baseRate: 0.95,
  },
];

const TEMPLATES = [
  {
    id: "trailer",
    label: "Trailer 15s",
    text: "Imagine sua marca atravessando a galáxia. Em 15 segundos, ela brilha, conecta e deixa rastro.",
  },
  {
    id: "pitch",
    label: "Pitch rápido",
    text: "Apresente sua ideia em 20 segundos: o problema, a virada e o impacto. Simples, direto, memorável.",
  },
  {
    id: "tutorial",
    label: "Tutorial curto",
    text: "Passo um, escolha a imagem. Passo dois, ajuste o tom. Passo três, publique com identidade Merse.",
  },
] as const;

const MAX_VIDEO_MB = 18;

function isVoiceResult(value: unknown): value is VoiceResult {
  if (!value || typeof value !== "object") return false;
  const payload = value as { audioUrl?: unknown; cues?: unknown; sync?: unknown };
  return (
    typeof payload.audioUrl === "string" &&
    Array.isArray(payload.cues) &&
    payload.sync !== null &&
    typeof payload.sync === "object"
  );
}

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function formatSeconds(value: number) {
  const total = Math.max(0, Math.round(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCueTime(value: number) {
  return `${value.toFixed(2)}s`;
}

function triggerDownload(url: string, filename: string) {
  if (!url) return;
  if (url.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    return;
  }
  window.open(url, "_blank", "noreferrer");
}

export default function VozIA() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [script, setScript] = useState(
    "Bem-vindo à Merse. Esta narração foi gerada com voz neural estilizada para vídeos e apresentações.",
  );
  const [preset, setPreset] = useState<VoicePreset>(PRESETS[0]!);
  const [speed, setSpeed] = useState<number>(PRESETS[0]!.baseRate);
  const [autoSync, setAutoSync] = useState(true);
  const [videoPayload, setVideoPayload] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const wordCount = useMemo(() => countWords(script), [script]);
  const estimatedSeconds = useMemo(() => {
    if (!wordCount) return 0;
    return Math.max(1, Math.round(wordCount / (2.5 * Math.max(speed, 0.7))));
  }, [wordCount, speed]);

  useEffect(() => {
    setSpeed(preset.baseRate);
  }, [preset]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1300);
    } catch {
      setCopyStatus("idle");
    }
  };

  const handleApplyTemplate = (text: string) => {
    setScript(text);
    setError(null);
  };

  const clearUploadedVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setVideoPayload("");
    setVideoFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePickVideo = () => {
    fileInputRef.current?.click();
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Não foi possível ler o vídeo enviado."));
      reader.readAsDataURL(file);
    });

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const limitBytes = MAX_VIDEO_MB * 1024 * 1024;
    if (file.size > limitBytes) {
      setError(`Envie um vídeo de até ${MAX_VIDEO_MB}MB para sincronização automática.`);
      return;
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    try {
      const payload = await readAsDataUrl(file);
      const preview = URL.createObjectURL(file);
      setVideoPayload(payload);
      setVideoPreviewUrl(preview);
      setVideoFileName(file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha ao carregar o vídeo.");
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError("Cole ou digite um roteiro para gerar a narração.");
      return;
    }

    if (autoSync && !videoPayload) {
      setError("Envie um vídeo para ativar o sync automático.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/voz-ia/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: script.trim(),
          voicePreset: preset.id,
          speed,
          autoSync,
          referenceVideo: autoSync ? videoPayload : undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error?: string }).error ?? "Falha ao gerar voz neural.")
            : "Falha ao gerar voz neural.";
        throw new Error(message);
      }

      if (!isVoiceResult(data)) {
        throw new Error("Resposta inválida da API de voz. Tente novamente.");
      }

      setResult(data);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Não foi possível gerar a narração imersiva.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-20 pt-24 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/30 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(236,72,153,0.18),transparent_52%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(circle_at_30%_75%,rgba(168,85,247,0.16),transparent_58%)]" />
        <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Voz IA imersiva</p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Narre vídeos e apresentações com voz neural
            </span>
          </h1>
          <p className="max-w-3xl text-sm text-white/70">
            Cole o roteiro, selecione a assinatura vocal Merse e gere áudio neural. Com vídeo enviado,
            o sistema aplica sync automático de lip sync no mesmo fluxo.
          </p>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-purple-300/20 bg-gradient-to-br from-purple-500/14 via-fuchsia-500/10 to-transparent p-8 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:120px_120px] opacity-20" />
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/22 blur-[120px]" />
          <div className="absolute -right-20 bottom-[-28%] h-64 w-64 rounded-full bg-cyan-500/18 blur-[120px]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-white/70">Fluxo Merse</p>
                  <h2 className="text-2xl font-semibold">Roteiro • Voz neural • Sync automático</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60">
                  API ao vivo
                </span>
              </div>

              <label className="block">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>Roteiro</span>
                  <span>{wordCount} palavras • ~{formatSeconds(estimatedSeconds)}</span>
                </div>
                <textarea
                  value={script}
                  onChange={(event) => setScript(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                  placeholder="Cole seu texto para narração neural no padrão Merse..."
                />
              </label>

              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/70">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyTemplate(template.text)}
                    className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1 transition hover:border-purple-200/40 hover:text-white"
                  >
                    {template.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setScript("")}
                  className="rounded-full border border-white/15 bg-black/40 px-4 py-1 text-white/60 transition hover:border-white/30 hover:text-white"
                >
                  Limpar
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-white/70">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1 transition hover:border-purple-200/40 hover:text-white"
                >
                  {copyStatus === "copied" ? "Copiado" : "Copiar roteiro"}
                </button>
                <span className="text-white/50">Use frases curtas para melhor sincronização</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Vozes Merse</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRESETS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreset(item)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        preset.id === item.id
                          ? "border-purple-300/60 bg-purple-500/15 shadow-[0_12px_40px_rgba(168,85,247,0.35)]"
                          : "border-purple-300/20 bg-white/5 hover:border-purple-200/40"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-white/65">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-xs text-white/70">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.3em]">Velocidade</span>
                  <span>{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.35"
                  step="0.01"
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <div className="space-y-3 rounded-2xl border border-purple-300/20 bg-black/40 p-4">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/60">Sync automático de vídeo</span>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(event) => setAutoSync(event.target.checked)}
                    className="h-4 w-4 rounded border border-white/30 bg-black/40"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    disabled={!autoSync}
                  />
                  <button
                    type="button"
                    onClick={handlePickVideo}
                    disabled={!autoSync}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/20 disabled:opacity-45"
                  >
                    Upload vídeo
                  </button>
                  {videoPayload && (
                    <button
                      type="button"
                      onClick={clearUploadedVideo}
                      className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30 hover:text-white"
                    >
                      Remover
                    </button>
                  )}
                  <span className="text-xs text-white/50">até {MAX_VIDEO_MB}MB</span>
                </div>

                {videoPreviewUrl ? (
                  <div className="space-y-2 rounded-xl border border-purple-300/20 bg-black/40 p-3">
                    <p className="text-xs text-white/60">{videoFileName || "Vídeo carregado"}</p>
                    <video src={videoPreviewUrl} controls className="w-full rounded-lg" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/20 bg-black/25 px-3 py-4 text-xs text-white/55">
                    Envie um vídeo para o sistema aplicar lip sync automático com o áudio gerado.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-300/40 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-[1.08] disabled:opacity-50"
                >
                  {isLoading ? "Processando..." : "Gerar narração"}
                </button>
                {error && <span className="text-sm text-amber-200/90">{error}</span>}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-300/20 bg-black/50 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/16 to-transparent opacity-90" />
              <div className="absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-white/10 blur-3xl" />

              <div className="relative space-y-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/60">
                  <span>Saída neural</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white/70">
                    {result ? "pronto" : isLoading ? "gerando" : "aguardando"}
                  </span>
                </div>

                {!result && !isLoading && (
                  <div className="space-y-3 text-sm text-white/70">
                    <p>Ao gerar, você recebe:</p>
                    <ul className="space-y-2">
                      <li className="rounded-xl border border-purple-300/20 bg-black/35 px-3 py-2">
                        Áudio neural estilizado para narração
                      </li>
                      <li className="rounded-xl border border-purple-300/20 bg-black/35 px-3 py-2">
                        Cue points automáticos para timeline
                      </li>
                      <li className="rounded-xl border border-purple-300/20 bg-black/35 px-3 py-2">
                        Vídeo sincronizado automaticamente (quando enviado)
                      </li>
                    </ul>
                  </div>
                )}

                {isLoading && <p className="text-sm text-white/80">Gerando voz neural e aplicando sync...</p>}

                {result && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                        {result.provider}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                        voz {result.voiceUsed}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                        {formatSeconds(result.durationSec)}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                        {typeof result.latencyMs === "number" ? `${Math.round(result.latencyMs)}ms` : "latência n/a"}
                      </span>
                    </div>

                    <div className="space-y-3 rounded-xl border border-purple-300/20 bg-black/35 p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Áudio gerado</p>
                      <audio controls src={result.audioUrl} className="w-full" preload="none" />
                      <button
                        type="button"
                        onClick={() => triggerDownload(result.audioUrl, "merse-voz-imersiva.mp3")}
                        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
                      >
                        Baixar áudio
                      </button>
                    </div>

                    {result.sync.attempted && (
                      <div className="space-y-3 rounded-xl border border-purple-300/20 bg-black/35 p-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Sync automático</p>
                        <p className="text-sm text-white/75">{result.sync.message ?? "Sem mensagem de sync."}</p>

                        {result.sync.success && result.sync.videoUrl && (
                          <>
                            <video src={result.sync.videoUrl} controls className="w-full rounded-lg" />
                            <button
                              type="button"
                              onClick={() => triggerDownload(result.sync.videoUrl!, "merse-voz-sync.mp4")}
                              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
                            >
                              Abrir vídeo sincronizado
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {result.cues.length > 0 && (
                      <div className="space-y-2 rounded-xl border border-purple-300/20 bg-black/35 p-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Cue points automáticos</p>
                        <ul className="space-y-2 text-xs text-white/75">
                          {result.cues.slice(0, 8).map((cue, index) => (
                            <li key={`${cue.startSec}-${index}`} className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                              <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">
                                {formatCueTime(cue.startSec)} → {formatCueTime(cue.endSec)}
                              </p>
                              <p className="mt-1 text-white/80">{cue.text}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.warnings.length > 0 && (
                      <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/80">Avisos</p>
                        <ul className="mt-2 space-y-1 text-xs text-amber-100/85">
                          {result.warnings.slice(0, 4).map((warning) => (
                            <li key={warning}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
