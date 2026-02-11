import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { PiBrowsersFill, PiChatsFill, PiSparkleFill } from "react-icons/pi";

type LayoutBlueprint = {
  name: string;
  format: string;
  purpose: string;
  sections: string[];
  notes: string;
};

type CanvasResponse = {
  concept: string;
  conceptSummary: string;
  voice: string;
  visualDirections: string[];
  slogans: string[];
  headlines: string[];
  bodyCopies: string[];
  ctaOptions: string[];
  socialCaptions: string[];
  layoutBlueprints: LayoutBlueprint[];
  styleGuide: {
    palette: string[];
    typography: string[];
    composition: string[];
  };
  provider?: "openai" | "fallback";
  generatedAt?: string;
  latencyMs?: number;
};

const isCanvasResponse = (value: unknown): value is CanvasResponse => {
  if (!value || typeof value !== "object") return false;
  const payload = value as {
    concept?: unknown;
    slogans?: unknown;
    headlines?: unknown;
    layoutBlueprints?: unknown;
  };
  return (
    typeof payload.concept === "string" &&
    Array.isArray(payload.slogans) &&
    Array.isArray(payload.headlines) &&
    Array.isArray(payload.layoutBlueprints)
  );
};

const features = [
  {
    title: "Brief inteligente",
    description: "Interprete a imagem enviada e transforme em direção criativa Merse pronta para usar.",
    accent: "from-purple-500/45 via-fuchsia-500/20 to-transparent",
    icon: PiChatsFill,
  },
  {
    title: "Layouts autogerados",
    description: "Receba wireframes e blocos de copy alinhados ao estilo da campanha.",
    accent: "from-cyan-500/40 via-blue-500/20 to-transparent",
    icon: PiBrowsersFill,
  },
  {
    title: "Textos e slogans",
    description: "Gere headlines, slogans e textos secundários já com ritmo e hierarquia Merse.",
    accent: "from-amber-500/45 via-rose-500/20 to-transparent",
    icon: PiSparkleFill,
  },
] as const;

const quickBriefs = [
  {
    label: "Produto Tech",
    text: "Produto tech premium com lançamento em 7 dias e foco em percepção de valor.",
  },
  {
    label: "Curso Online",
    text: "Campanha para curso online com foco em credibilidade e inscrições.",
  },
  {
    label: "Serviço B2B",
    text: "Serviço B2B que precisa de narrativa objetiva para performance em mídia paga.",
  },
  {
    label: "Moda Premium",
    text: "Coleção de moda com identidade futurista e linguagem aspiracional.",
  },
] as const;

const objectives = ["Lançamento", "Conversão", "Branding", "Reengajar", "Lead Gen"] as const;
const tones = ["Futurista", "Editorial", "Minimal", "Bold", "Luxo"] as const;
const audiences = ["B2B", "D2C", "Creators", "Enterprise", "Edu"] as const;
const channels = ["Landing", "Instagram", "Ads", "Pitch Deck", "E-mail"] as const;

export default function CanvasIA() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [brief, setBrief] = useState("");
  const [objective, setObjective] = useState<string>("Lançamento");
  const [tone, setTone] = useState<string>("Futurista");
  const [audience, setAudience] = useState<string>("D2C");
  const [channel, setChannel] = useState<string>("Landing");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePayload, setImagePayload] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CanvasResponse | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const briefWordCount = useMemo(() => {
    const trimmed = brief.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [brief]);

  const canSubmit = Boolean(imagePayload) && !isLoading;

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const optimizeUploadedImage = async (file: File): Promise<string> => {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Não foi possível ler a imagem enviada."));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Não foi possível processar a imagem enviada."));
      nextImage.src = rawDataUrl;
    });

    const maxEdge = 1600;
    const ratio = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) return rawDataUrl;

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const optimized = await optimizeUploadedImage(file);
      setImagePreview(optimized);
      setImagePayload(optimized);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha ao processar a imagem.");
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setImagePayload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/canvas-ia/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brief: brief.trim() || undefined,
          image: imagePayload,
          objective,
          tone,
          audience,
          channel,
          language: "pt-br",
        }),
      });

      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error?: string }).error ?? "Erro ao gerar pacote.")
            : "Erro ao gerar pacote.";
        throw new Error(message);
      }

      if (!isCanvasResponse(data)) {
        throw new Error("Resposta inválida da geração. Tente novamente.");
      }

      setResult(data);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Não foi possível gerar o pacote Canvas IA.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPackage = async () => {
    if (!result) return;

    const text = [
      `Conceito: ${result.concept}`,
      `Resumo: ${result.conceptSummary}`,
      `Voz: ${result.voice}`,
      "",
      "Slogans:",
      ...result.slogans.map((item) => `- ${item}`),
      "",
      "Headlines:",
      ...result.headlines.map((item) => `- ${item}`),
      "",
      "Copies:",
      ...result.bodyCopies.map((item) => `- ${item}`),
      "",
      "CTAs:",
      ...result.ctaOptions.map((item) => `- ${item}`),
      "",
      "Layouts:",
      ...result.layoutBlueprints.map(
        (layout) =>
          `- ${layout.name} (${layout.format}) | ${layout.purpose} | ${layout.sections.join(" > ")}`,
      ),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1500);
    } catch {
      setCopyStatus("idle");
    }
  };

  return (
    <>
      <Head>
        <title>Canvas IA · Merse</title>
        <meta
          name="description"
          content="Envie a imagem e receba textos, slogans e layouts autogerados no padrão Merse."
        />
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/35 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_82%_30%,rgba(59,130,246,0.16),transparent_58%),radial-gradient(circle_at_30%_78%,rgba(168,85,247,0.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px] opacity-25" />
        </div>

        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Canvas IA</p>
            <h1 className="text-3xl font-semibold md:text-4xl">
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                Envie a imagem e receba textos, slogans e layouts autogerados
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-white/70">
              Suba sua referência visual, ajuste o objetivo da campanha e gere um pacote completo de
              comunicação no padrão Merse.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-full border border-purple-300/40 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Gerando..." : "Gerar pacote"}
              </button>
              <Link
                href="/gerar"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[11px] uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
              >
                Voltar ao hub
              </Link>
            </div>
          </header>

          <section className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-80`} />
                  <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-white/10 blur-[120px]" />
                  <div className="relative flex flex-col gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70">
                      <Icon className="text-lg" />
                    </span>
                    <h2 className="text-lg font-semibold">{feature.title}</h2>
                    <p className="text-sm text-white/70">{feature.description}</p>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-5 rounded-3xl border border-purple-300/20 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Brief rápido</p>
                <div className="flex flex-wrap gap-2">
                  {quickBriefs.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setBrief(item.text)}
                      className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70 transition hover:border-purple-200/40 hover:text-white"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.32em] text-white/60">
                  <span>Brief da campanha</span>
                  <span>{briefWordCount} palavras</span>
                </div>
                <textarea
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                  placeholder="Contexto, oferta e resultado esperado da campanha."
                />
              </label>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Objetivo</p>
                <div className="flex flex-wrap gap-2">
                  {objectives.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setObjective(item)}
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                        objective === item
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Tom</p>
                  <div className="flex flex-wrap gap-2">
                    {tones.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTone(item)}
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                          tone === item
                            ? "border-purple-300/60 bg-purple-500/15 text-white"
                            : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Audiência</p>
                  <div className="flex flex-wrap gap-2">
                    {audiences.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAudience(item)}
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                          audience === item
                            ? "border-purple-300/60 bg-purple-500/15 text-white"
                            : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Canal</p>
                <div className="flex flex-wrap gap-2">
                  {channels.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setChannel(item)}
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                        channel === item
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-purple-300/20 bg-black/35 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Imagem de referência</p>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handlePickFile}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
                  >
                    Upload
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60 transition hover:border-white/30 hover:text-white"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {imagePreview ? (
                  <div className="overflow-hidden rounded-2xl border border-purple-300/20 bg-white/5">
                    <img src={imagePreview} alt="Preview da referência" className="h-52 w-full object-cover" />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-4 py-6 text-sm text-white/55">
                    Envie uma imagem para ativar o Canvas IA.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  className="rounded-full border border-purple-300/60 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-[1.08] disabled:opacity-50"
                >
                  {isLoading ? "Gerando..." : "Gerar textos + layouts"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyPackage}
                  disabled={!result}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50"
                >
                  {copyStatus === "copied" ? "Pacote copiado" : "Copiar pacote"}
                </button>
                {error && <span className="text-sm text-rose-200/90">{error}</span>}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-purple-300/20 bg-black/50 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.32em] text-white/60">
                <span>Pacote Canvas IA</span>
                {result && (
                  <span>
                    {result.provider === "fallback" ? "Fallback" : "OpenAI"}
                    {typeof result.latencyMs === "number" ? ` · ${Math.round(result.latencyMs)}ms` : ""}
                  </span>
                )}
              </div>

              {!result && !isLoading && (
                <div className="space-y-3 text-sm text-white/70">
                  <p>Ao gerar, você recebe:</p>
                  <ul className="space-y-2">
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Slogans e headlines prontos para campanha
                    </li>
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Copies secundárias e opções de CTA
                    </li>
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Blueprints de layout com seções e intenção
                    </li>
                  </ul>
                </div>
              )}

              {isLoading && <p className="text-sm text-white/80">Analisando imagem e montando pacote...</p>}

              {result && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Conceito</p>
                    <p className="mt-2 text-lg font-semibold text-white">{result.concept}</p>
                    <p className="mt-2 text-sm text-white/70">{result.conceptSummary}</p>
                    <p className="mt-2 text-xs text-white/55">Voz: {result.voice}</p>
                    {result.generatedAt && (
                      <p className="mt-2 text-xs text-white/45">
                        {new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        }).format(new Date(result.generatedAt))}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Slogans</p>
                      <ul className="mt-3 space-y-2 text-sm text-white/80">
                        {result.slogans.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Headlines</p>
                      <ul className="mt-3 space-y-2 text-sm text-white/80">
                        {result.headlines.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </article>
                  </div>

                  <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Copies e CTA</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/80">
                      {result.bodyCopies.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.ctaOptions.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-100"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>

                  <article className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Layouts autogerados</p>
                    {result.layoutBlueprints.map((layout) => (
                      <div key={`${layout.name}-${layout.format}`} className="rounded-xl border border-purple-300/20 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{layout.name}</p>
                          <span className="text-[10px] uppercase tracking-[0.25em] text-white/60">{layout.format}</span>
                        </div>
                        <p className="mt-2 text-xs text-white/70">{layout.purpose}</p>
                        <p className="mt-2 text-xs text-white/55">{layout.sections.join("  ·  ")}</p>
                        <p className="mt-2 text-xs text-cyan-100/90">{layout.notes}</p>
                      </div>
                    ))}
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Guia visual</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Paleta</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.styleGuide.palette.map((color) => (
                            <span key={color} className="inline-flex items-center gap-2 text-[11px] text-white/70">
                              <span className="h-3 w-3 rounded-full border border-white/30" style={{ backgroundColor: color }} />
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Tipografia</p>
                        <ul className="mt-2 space-y-1 text-xs text-white/75">
                          {result.styleGuide.typography.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Composição</p>
                        <ul className="mt-2 space-y-1 text-xs text-white/75">
                          {result.styleGuide.composition.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>

                  {result.socialCaptions.length > 0 && (
                    <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Legendas sociais</p>
                      <ul className="mt-3 space-y-2 text-sm text-white/80">
                        {result.socialCaptions.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </article>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
