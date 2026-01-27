import { useMemo, useRef, useState } from "react";
import Head from "next/head";

type SuggestionResponse = {
  suggestions: string[];
  headline: string;
  callouts?: string[];
};

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
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referencePayload, setReferencePayload] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestionResponse | null>(null);
  const [copyBriefStatus, setCopyBriefStatus] = useState<"idle" | "copied">("idle");
  const [copyResultStatus, setCopyResultStatus] = useState<"idle" | "copied">("idle");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const wordCount = useMemo(() => {
    const trimmed = combinedPrompt.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [combinedPrompt]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReferencePreview(base64);
      setReferencePayload(base64);
    };
    reader.readAsDataURL(file);
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
    const text = [result.headline, ...result.suggestions].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyResultStatus("copied");
      window.setTimeout(() => setCopyResultStatus("idle"), 1200);
    } catch {
      setCopyResultStatus("idle");
    }
  };

  const handleClearAll = () => {
    setPrompt("");
    setSelectedGoal(null);
    setSelectedAudience(null);
    setSelectedTone(null);
    setFocusAreas([]);
    handleClearImage();
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/assistente-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: combinedPrompt.trim() || undefined,
          image: referencePayload,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as
        | (SuggestionResponse & { error?: string })
        | { error: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Nao foi possivel gerar sugestoes.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao gerar sugestoes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Assistente de Site · Merse</title>
      </Head>
      <main className="relative min-h-screen overflow-hidden bg-black px-6 pb-20 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/30 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.16),transparent_58%),radial-gradient(circle_at_30%_75%,rgba(168,85,247,0.18),transparent_60%)]" />
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <header className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Assistente de Site</p>
            <h1 className="text-3xl font-semibold md:text-4xl">
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                Peça sugestoes de layout a IA Merse
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-white/70">
              Envie uma screenshot ou descreva o contexto. A Merse sugere hierarquia, tipografia, CTA e
              ritmo visual para elevar o design em minutos.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/70">
              <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
                resposta objetiva
              </span>
              <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
                prioriza conversao
              </span>
              <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
                foco em mobile
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
                  {isLoading ? "Gerando..." : "Pedir sugestoes"}
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
                <span>Sugestoes da Merse</span>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  disabled={!result}
                  className="rounded-full border border-purple-300/40 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70 transition hover:border-purple-200/60 hover:text-white disabled:opacity-50"
                >
                  {copyResultStatus === "copied" ? "Copiado" : "Copiar"}
                </button>
              </div>

              {!result && !isLoading && (
                <div className="space-y-3 text-sm text-white/70">
                  <p>Envie o contexto ou screenshot e receba:</p>
                  <ul className="space-y-2">
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Ajustes de hierarquia e ritmo visual
                    </li>
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Direcao de tipografia e contraste
                    </li>
                    <li className="rounded-xl border border-purple-300/20 bg-black/40 px-3 py-2">
                      Ideias de CTA e layout mobile-first
                    </li>
                  </ul>
                </div>
              )}
              {isLoading && <p className="text-sm text-white/80">Analisando seu layout...</p>}
              {result && (
                <div className="space-y-4">
                  <p className="text-lg font-semibold text-white">{result.headline}</p>
                  <ul className="space-y-2 text-sm text-white/80">
                    {result.suggestions.map((sug, idx) => (
                      <li key={idx} className="rounded-xl border border-purple-300/20 bg-white/5 px-3 py-2">
                        {sug}
                      </li>
                    ))}
                  </ul>
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
