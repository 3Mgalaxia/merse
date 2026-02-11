import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

type AnalysisBucket = {
  score: number;
  diagnosis: string;
  actions: string[];
};

type RoadmapItem = {
  priority: "alta" | "media" | "baixa";
  task: string;
  impact: string;
  effort: string;
};

type SuggestionResponse = {
  suggestions: string[];
  headline: string;
  callouts?: string[];
  analysis?: {
    layout: AnalysisBucket;
    contrast: AnalysisBucket;
    hierarchy: AnalysisBucket;
    cta: AnalysisBucket;
    responsive: AnalysisBucket;
  };
  quickWins?: string[];
  roadmap?: RoadmapItem[];
  provider?: "openai" | "fallback";
  mode?: "quick" | "deep";
  generatedAt?: string;
  latencyMs?: number;
};

const isSuggestionResponse = (data: unknown): data is SuggestionResponse => {
  if (!data || typeof data !== "object") return false;
  const value = data as { suggestions?: unknown; headline?: unknown; callouts?: unknown };
  return (
    typeof value.headline === "string" &&
    Array.isArray(value.suggestions) &&
    value.suggestions.every((item) => typeof item === "string")
  );
};

const SCORE_LABELS = [
  { min: 85, label: "Excelente" },
  { min: 70, label: "Bom" },
  { min: 55, label: "Atencao" },
  { min: 0, label: "Critico" },
];

const QUICK_BRIEFS = [
  {
    id: "saas",
    label: "SaaS B2B",
    text: "Landing para SaaS B2B. Preciso melhorar conversao, prova social e clareza do produto.",
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    text: "Pagina de produto com foco em ticket medio e confianca. Quero CTA mais forte e visual premium.",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    text: "Portfolio criativo com foco em autoridade e destaque para projetos.",
  },
  {
    id: "event",
    label: "Evento",
    text: "Pagina de evento com cronograma, palestrantes e CTA para inscricao.",
  },
];

const GOALS = [
  "Mais conversao",
  "Clareza do produto",
  "Branding premium",
  "Onboarding",
  "Leads",
  "Retencao",
];

const AUDIENCES = ["B2B", "D2C", "Criadores", "Startups", "Enterprise", "Edu"];

const TONES = ["Minimal", "Neon", "Editorial", "Bold", "Clean", "Tech"];

const FOCUS_AREAS = [
  "Hierarquia",
  "Contraste",
  "Tipografia",
  "CTA",
  "Responsivo",
  "Espacamento",
  "Cards",
  "Imagens",
];

export default function AssistenteSite() {
  const [prompt, setPrompt] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [liveMode, setLiveMode] = useState(true);
  const [analysisMode, setAnalysisMode] = useState<"quick" | "deep">("deep");
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referencePayload, setReferencePayload] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestionResponse | null>(null);
  const [copyBriefStatus, setCopyBriefStatus] = useState<"idle" | "copied">("idle");
  const [copyResultStatus, setCopyResultStatus] = useState<"idle" | "copied">("idle");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const liveHashRef = useRef<string>("");

  const combinedPrompt = useMemo(() => {
    const lines: string[] = [];
    if (prompt.trim()) lines.push(prompt.trim());
    if (selectedGoal) lines.push(`Objetivo: ${selectedGoal}.`);
    if (selectedAudience) lines.push(`Publico: ${selectedAudience}.`);
    if (selectedTone) lines.push(`Tom visual: ${selectedTone}.`);
    if (focusAreas.length) lines.push(`Foco: ${focusAreas.join(", ")}.`);
    return lines.join("\n");
  }, [prompt, selectedGoal, selectedAudience, selectedTone, focusAreas]);

  const canSubmit = useMemo(
    () => combinedPrompt.trim().length > 0 || Boolean(referencePayload),
    [combinedPrompt, referencePayload],
  );
  const canRunLive = useMemo(
    () => Boolean(referencePayload) || combinedPrompt.trim().length >= 20,
    [combinedPrompt, referencePayload],
  );

  const wordCount = useMemo(() => {
    const trimmed = combinedPrompt.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [combinedPrompt]);

  const getScoreLabel = (score: number) => {
    return SCORE_LABELS.find((entry) => score >= entry.min)?.label ?? "N/A";
  };

  const analysisCards = useMemo(() => {
    if (!result?.analysis) return [];
    return [
      { key: "layout", title: "Layout", data: result.analysis.layout },
      { key: "contrast", title: "Contraste", data: result.analysis.contrast },
      { key: "hierarchy", title: "Hierarquia", data: result.analysis.hierarchy },
      { key: "cta", title: "CTA", data: result.analysis.cta },
      { key: "responsive", title: "Responsivo", data: result.analysis.responsive },
    ];
  }, [result]);

  const liveHash = useMemo(
    () =>
      [
        combinedPrompt.trim(),
        selectedGoal ?? "",
        selectedAudience ?? "",
        selectedTone ?? "",
        focusAreas.join("|"),
        referencePayload ? `${referencePayload.slice(0, 64)}:${referencePayload.length}` : "",
      ].join("::"),
    [combinedPrompt, selectedGoal, selectedAudience, selectedTone, focusAreas, referencePayload],
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const optimizeUploadedImage = async (file: File): Promise<string> => {
    const readAsDataUrl = () =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
        reader.readAsDataURL(file);
      });

    const raw = await readAsDataUrl();
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Nao foi possivel processar a screenshot."));
      image.src = raw;
    });

    const maxEdge = 1600;
    const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const targetWidth = Math.max(1, Math.round(img.width * ratio));
    const targetHeight = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return raw;

    context.drawImage(img, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", 0.88);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const optimized = await optimizeUploadedImage(file);
      setReferencePreview(optimized);
      setReferencePayload(optimized);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha ao carregar screenshot.");
    }
  };

  const handleClearImage = () => {
    setReferencePreview(null);
    setReferencePayload(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleFocus = (item: string) => {
    setFocusAreas((prev) =>
      prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item],
    );
  };

  const handleApplyBrief = (text: string) => {
    setPrompt(text);
  };

  const handleCopyBrief = async () => {
    if (!combinedPrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(combinedPrompt);
      setCopyBriefStatus("copied");
      window.setTimeout(() => setCopyBriefStatus("idle"), 1200);
    } catch {
      setCopyBriefStatus("idle");
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    const scoreLine = result.analysis
      ? [
          `Layout: ${result.analysis.layout.score}`,
          `Contraste: ${result.analysis.contrast.score}`,
          `Hierarquia: ${result.analysis.hierarchy.score}`,
          `CTA: ${result.analysis.cta.score}`,
          `Responsivo: ${result.analysis.responsive.score}`,
        ].join(" | ")
      : "";
    const text = [
      result.headline,
      scoreLine,
      ...result.suggestions,
      ...(result.quickWins ?? []),
      ...(result.roadmap ?? []).map((item) => `[${item.priority}] ${item.task} -> ${item.impact}`),
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyResultStatus("copied");
      window.setTimeout(() => setCopyResultStatus("idle"), 1200);
    } catch {
      setCopyResultStatus("idle");
    }
  };

  const handleClearAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPrompt("");
    setSelectedGoal(null);
    setSelectedAudience(null);
    setSelectedTone(null);
    setLiveMode(true);
    setAnalysisMode("deep");
    setFocusAreas([]);
    setLastUpdated(null);
    liveHashRef.current = "";
    handleClearImage();
    setResult(null);
    setError(null);
  };

  const runAnalysis = async (source: "manual" | "live" = "manual") => {
    if (!canSubmit) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    liveHashRef.current = liveHash;
    setIsLoading(true);
    setError(null);
    if (source === "manual") {
      setResult(null);
    }

    try {
      const response = await fetch("/api/assistente-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: combinedPrompt.trim() || undefined,
          image: referencePayload,
          goal: selectedGoal ?? undefined,
          audience: selectedAudience ?? undefined,
          tone: selectedTone ?? undefined,
          focusAreas,
          mode: source === "live" ? "quick" : analysisMode,
        }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error?: string }).error ?? "Nao foi possivel gerar o diagnostico.")
            : "Nao foi possivel gerar o diagnostico.";
        throw new Error(message);
      }
      if (!isSuggestionResponse(data)) {
        throw new Error("Nao foi possivel gerar o diagnostico.");
      }
      setResult(data);
      setLastUpdated(
        typeof data.generatedAt === "string" && data.generatedAt.length > 0
          ? data.generatedAt
          : new Date().toISOString(),
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if ((err as Error)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro inesperado ao gerar diagnostico.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;
    await runAnalysis("manual");
  };

  useEffect(() => {
    if (!liveMode) return;
    if (!canSubmit || !canRunLive) return;
    if (isLoading) return;
    if (liveHashRef.current === liveHash) return;

    const timer = window.setTimeout(() => {
      void runAnalysis("live");
    }, 900);

    return () => window.clearTimeout(timer);
  }, [liveMode, canSubmit, canRunLive, isLoading, liveHash]);

  return (
    <>
      <Head>
        <title>Mentor IA de Sites · Merse</title>
      </Head>
      <main className="relative min-h-screen overflow-hidden bg-black px-6 pb-20 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/30 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.16),transparent_58%),radial-gradient(circle_at_30%_75%,rgba(168,85,247,0.18),transparent_60%)]" />
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <header className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Mentor IA de Sites</p>
            <h1 className="text-3xl font-semibold md:text-4xl">
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                Envie screenshots e receba dicas em tempo real
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-white/70">
              O mentor Merse analisa layout, contraste, hierarquia, CTA e responsividade. Ajuste o foco
              e refine seu site com diagnosticos acionaveis em segundos.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/70">
              <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
                layout e ux
              </span>
              <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
                contraste e leitura
              </span>
              <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
                feedback em tempo real
              </span>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5 rounded-3xl border border-purple-300/20 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Brief rapido</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_BRIEFS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleApplyBrief(item.text)}
                      className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70 transition hover:border-purple-200/40 hover:text-white"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>Contexto</span>
                  <span>{wordCount} palavras</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-[0_18px_52px_rgba(0,0,0,0.45)] focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                  placeholder="Explique o objetivo, publico e o que quer melhorar."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Objetivo</p>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSelectedGoal(item === selectedGoal ? null : item)}
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                          selectedGoal === item
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
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Publico</p>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSelectedAudience(item === selectedAudience ? null : item)}
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                          selectedAudience === item
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
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Tom visual</p>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedTone(item === selectedTone ? null : item)}
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                        selectedTone === item
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
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Foco do diagnostico</p>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_AREAS.map((item) => {
                    const active = focusAreas.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleFocus(item)}
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                          active
                            ? "border-purple-300/60 bg-purple-500/15 text-white"
                            : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-purple-300/20 bg-black/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Modo de analise</p>
                  <button
                    type="button"
                    onClick={() => setLiveMode((prev) => !prev)}
                    className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                      liveMode
                        ? "border-cyan-300/60 bg-cyan-500/15 text-cyan-100"
                        : "border-white/20 bg-white/10 text-white/70 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {liveMode ? "Tempo real: ON" : "Tempo real: OFF"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["quick", "deep"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setAnalysisMode(item)}
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                        analysisMode === item
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item === "quick" ? "Rapido" : "Profundo"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/55">
                  {liveMode
                    ? "O mentor atualiza automaticamente ao alterar briefing, foco ou screenshot."
                    : "Use o botao de analise para gerar diagnosticos sob demanda."}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Screenshot</p>
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
                  {referencePreview && (
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60 transition hover:border-white/30 hover:text-white"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {referencePreview && (
                  <div className="overflow-hidden rounded-2xl border border-purple-300/20 bg-white/5">
                    <img src={referencePreview} alt="Screenshot enviada" className="h-48 w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit || isLoading}
                    className="rounded-full border border-purple-300/60 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-[1.08] disabled:opacity-50"
                  >
                    {isLoading ? "Analisando..." : "Analisar layout"}
                  </button>
                <button
                  type="button"
                  onClick={handleCopyBrief}
                  disabled={!combinedPrompt.trim()}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50"
                >
                  {copyBriefStatus === "copied" ? "Brief copiado" : "Copiar brief"}
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60 transition hover:border-white/30 hover:text-white"
                >
                  Limpar tudo
                </button>
                {error && <span className="text-sm text-amber-200/90">{error}</span>}
              </div>

              <div className="rounded-2xl border border-purple-300/20 bg-black/40 p-4 text-xs text-white/70">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">Resumo do briefing</p>
                <p className="mt-2 whitespace-pre-line text-white/70">
                  {combinedPrompt.trim() || "Ainda vazio. Use os presets ou descreva o contexto acima."}
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-purple-300/20 bg-black/50 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.32em] text-white/60">
                <span>Diagnostico do Mentor</span>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  disabled={!result}
                  className="rounded-full border border-purple-300/40 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70 transition hover:border-purple-200/60 hover:text-white disabled:opacity-50"
                >
                  {copyResultStatus === "copied" ? "Copiado" : "Copiar"}
                </button>
              </div>

              {result && (
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                    Provedor: {result.provider ?? "openai"}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                    Modo: {result.mode === "quick" ? "Rapido" : "Profundo"}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                    {result.latencyMs ? `${Math.round(result.latencyMs)}ms` : "latencia n/a"}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                    Atualizado:{" "}
                    {lastUpdated
                      ? new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(lastUpdated))
                      : "agora"}
                  </span>
                </div>
              )}

              {!result && !isLoading && (
                <div className="space-y-3 text-sm text-white/70">
                  <p>Envie o contexto ou screenshot e receba:</p>
                  <ul className="space-y-2">
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Diagnostico de layout, contraste e hierarquia visual
                    </li>
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Acoes praticas para CTA, tipografia e mobile
                    </li>
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Roadmap priorizado para melhorias rapidas
                    </li>
                  </ul>
                </div>
              )}
              {isLoading && (
                <p className="text-sm text-white/80">
                  {liveMode ? "Analisando em tempo real..." : "Analisando seu layout..."}
                </p>
              )}
              {result && (
                <div className="space-y-5">
                  <p className="text-lg font-semibold text-white">{result.headline}</p>

                  <ul className="space-y-2 text-sm text-white/80">
                    {result.suggestions.map((sug, idx) => (
                      <li key={idx} className="rounded-xl border border-purple-300/20 bg-white/5 px-3 py-2">
                        {sug}
                      </li>
                    ))}
                  </ul>

                  {analysisCards.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {analysisCards.map((card) => (
                        <article
                          key={card.key}
                          className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">{card.title}</p>
                            <span className="text-xs font-semibold text-white">
                              {card.data.score} · {getScoreLabel(card.data.score)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-cyan-400"
                              style={{ width: `${card.data.score}%` }}
                            />
                          </div>
                          <p className="text-xs text-white/70">{card.data.diagnosis}</p>
                          <ul className="space-y-1 text-xs text-white/75">
                            {card.data.actions.slice(0, 2).map((action) => (
                              <li key={action}>• {action}</li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  )}

                  {result.quickWins && result.quickWins.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/55">Quick wins</p>
                      <ul className="space-y-2 text-sm text-white/80">
                        {result.quickWins.map((item) => (
                          <li
                            key={item}
                            className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.roadmap && result.roadmap.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/55">
                        Roadmap de execucao
                      </p>
                      <div className="space-y-2">
                        {result.roadmap.map((item, index) => (
                          <div
                            key={`${item.task}-${index}`}
                            className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-white">{item.task}</p>
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.25em] ${
                                  item.priority === "alta"
                                    ? "border border-rose-300/40 bg-rose-500/15 text-rose-200"
                                    : item.priority === "media"
                                    ? "border border-amber-300/40 bg-amber-500/15 text-amber-200"
                                    : "border border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-white/65">Impacto: {item.impact}</p>
                            <p className="text-xs text-white/50">Esforco: {item.effort}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.callouts && result.callouts.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[0.28em] text-white/70">
                      {result.callouts.map((item) => (
                        <span
                          key={item}
                          className="rounded-xl border border-purple-300/20 bg-white/5 px-3 py-2"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
