import { useMemo, useRef, useState } from "react";

type FormatPreset = {
  id: string;
  label: string;
  ratio: string;
  hint: string;
};

type TonePreset = {
  id: string;
  label: string;
  description: string;
};

const FORMATS: FormatPreset[] = [
  { id: "story", label: "Story 9:16", ratio: "1080x1920", hint: "vertical rapido" },
  { id: "post", label: "Post 1:1", ratio: "1080x1080", hint: "feed classico" },
  { id: "banner", label: "Banner 16:9", ratio: "1920x1080", hint: "landings e ads" },
  { id: "cover", label: "Capa 4:5", ratio: "1080x1350", hint: "catalogo premium" },
];

const TONES: TonePreset[] = [
  { id: "clean", label: "Clean", description: "poucas palavras, muito impacto" },
  { id: "neon", label: "Neon", description: "alto contraste, vibe sci-fi" },
  { id: "editorial", label: "Editorial", description: "chique e elegante, sem gritar" },
];

const EXTRAS = [
  { id: "cta", label: "CTA pronto" },
  { id: "hierarchy", label: "Hierarquia visual" },
  { id: "logo", label: "Espaco do logo" },
  { id: "hashtags", label: "Hashtags" },
];

const COPY_PRESETS: Record<
  string,
  { headline: string; subtitle: string; cta: string; note: string }
> = {
  clean: {
    headline: "Menos texto, mais impacto",
    subtitle: "Layout limpo pra vender rapido.",
    cta: "Quero esse layout",
    note: "Perfeito pra produto premium.",
  },
  neon: {
    headline: "Brilha no feed sem pedir desculpa",
    subtitle: "Glow, contraste e tipografia com atitude.",
    cta: "Me mostra as variacoes",
    note: "Ideal pra drops, tech e events.",
  },
  editorial: {
    headline: "Estetica de revista, energia Merse",
    subtitle: "Hierarquia fina e ritmo visual.",
    cta: "Gerar versao editorial",
    note: "Funciona bem pra moda e luxo.",
  },
};

export default function CanvasIA() {
  const [formatId, setFormatId] = useState(FORMATS[0].id);
  const [toneId, setToneId] = useState(TONES[0].id);
  const [extras, setExtras] = useState<string[]>(["cta", "hierarchy"]);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedFormat = useMemo(
    () => FORMATS.find((item) => item.id === formatId) ?? FORMATS[0],
    [formatId],
  );
  const selectedTone = useMemo(
    () => TONES.find((item) => item.id === toneId) ?? TONES[0],
    [toneId],
  );
  const selectedCopy = useMemo(
    () => COPY_PRESETS[toneId] ?? COPY_PRESETS.clean,
    [toneId],
  );

  const toggleExtra = (id: string) => {
    setExtras((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-20 pt-24 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/30 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_78%_28%,rgba(59,130,246,0.16),transparent_58%),radial-gradient(circle_at_30%_75%,rgba(168,85,247,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Canvas IA</p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Texto e layout automaticos em cima da sua imagem
            </span>
          </h1>
          <p className="max-w-3xl text-sm text-white/70">
            Sobe a imagem, escolhe o clima e a Merse monta o combo completo: slogan, CTA, hierarquia
            tipografica e posicionamento pronto pra postar.
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/70">
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              sem designer? relaxa
            </span>
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              gera 3 variacoes
            </span>
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              copia e cola direto
            </span>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-purple-300/20 bg-gradient-to-br from-purple-500/14 via-fuchsia-500/12 to-transparent p-8 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:120px_120px] opacity-20" />
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/22 blur-[120px]" />
          <div className="absolute -right-20 bottom-[-28%] h-64 w-64 rounded-full bg-cyan-500/18 blur-[120px]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-white/70">Fluxo Merse</p>
                <h2 className="text-2xl font-semibold">Upload • Copy • Layout instantaneo</h2>
                <p className="text-sm text-white/70">
                  Cola sua arte, ajusta o tom e a Merse organiza texto, CTA e hierarquia. Zero
                  friccao, zero drama.
                </p>
              </div>

              <div className="rounded-2xl border border-purple-300/20 bg-black/45 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Sua imagem</p>
                <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-white/70">
                    {fileName ? (
                      <>
                        <span className="text-white">{fileName}</span>{" "}
                        <span className="text-white/50">carregada</span>
                      </>
                    ) : (
                      "Nenhuma imagem ainda. Solta aqui ou escolhe no botao."
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handlePickFile}
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30 hover:text-white"
                    >
                      Usar demo
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Formato</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FORMATS.map((format) => (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => setFormatId(format.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        format.id === formatId
                          ? "border-purple-300/60 bg-purple-500/15 shadow-[0_12px_40px_rgba(168,85,247,0.35)]"
                          : "border-purple-300/20 bg-white/5 hover:border-purple-200/40"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{format.label}</p>
                      <p className="text-xs text-white/60">
                        {format.ratio} • {format.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Tom de voz</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setToneId(tone.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        tone.id === toneId
                          ? "border-purple-300/60 bg-purple-500/15 shadow-[0_12px_40px_rgba(168,85,247,0.35)]"
                          : "border-purple-300/20 bg-white/5 hover:border-purple-200/40"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{tone.label}</p>
                      <p className="text-xs text-white/60">{tone.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Extras</p>
                <div className="flex flex-wrap gap-3">
                  {EXTRAS.map((extra) => {
                    const active = extras.includes(extra.id);
                    return (
                      <button
                        key={extra.id}
                        type="button"
                        onClick={() => toggleExtra(extra.id)}
                        className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                          active
                            ? "border-purple-300/60 bg-purple-500/15 text-white"
                            : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                        }`}
                      >
                        {extra.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-300/40 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-[1.08]"
                >
                  Gerar 3 variacoes
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
                >
                  Salvar preset
                </button>
                <span className="text-xs text-white/60">
                  {selectedTone.label} • {selectedFormat.label}
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-300/20 bg-black/50 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/16 to-transparent opacity-90" />
              <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/60">
                  <span>Preview IA</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white/70">
                    {selectedFormat.ratio}
                  </span>
                </div>
                <div className="relative h-56 overflow-hidden rounded-xl border border-purple-300/20 bg-gradient-to-br from-purple-500/28 via-pink-500/18 to-black/70">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(236,72,153,0.22),transparent_48%),radial-gradient(circle_at_80%_60%,rgba(59,130,246,0.22),transparent_50%)] opacity-70" />
                  <div className="absolute inset-0 flex flex-col justify-between p-5">
                    <div className="flex items-start justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                      <span>{selectedTone.label}</span>
                      <span>{extras.includes("logo") ? "logo reservado" : "sem logo"}</span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{selectedCopy.headline}</p>
                      <p className="text-xs text-white/70">{selectedCopy.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 uppercase tracking-[0.3em]">
                        {extras.includes("cta") ? selectedCopy.cta : "CTA opcional"}
                      </span>
                      <span>{selectedCopy.note}</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-purple-300/20 bg-black/30 p-3 text-xs text-white/70">
                    <p className="font-semibold text-white">Sugestao de copy</p>
                    <p className="mt-1">{selectedCopy.subtitle}</p>
                  </div>
                  <div className="rounded-xl border border-purple-300/20 bg-black/30 p-3 text-xs text-white/70">
                    <p className="font-semibold text-white">Ajuste rapido</p>
                    <p className="mt-1">
                      Troque o tom ou o formato acima pra gerar outra vibe.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-white/60">
                  Quer algo mais especifico? Joga palavras-chave no prompt e a Merse ajusta a
                  hierarquia por voce.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
