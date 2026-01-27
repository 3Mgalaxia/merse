import { useEffect, useMemo, useRef, useState } from "react";

type VoicePreset = {
  id: string;
  label: string;
  description: string;
  tone: "soft" | "neutral" | "bold";
  rate: number;
  pitch: number;
};

const PRESETS: VoicePreset[] = [
  {
    id: "nova",
    label: "Nova (feminina)",
    description: "Clara, suave e futurista",
    tone: "soft",
    rate: 0.98,
    pitch: 1.05,
  },
  {
    id: "orion",
    label: "Orion (masculina)",
    description: "Grave, controlada e concisa",
    tone: "neutral",
    rate: 1.05,
    pitch: 1,
  },
  {
    id: "lumen",
    label: "Lumen (feminina)",
    description: "Empolgada, com brilho",
    tone: "bold",
    rate: 1.12,
    pitch: 1.08,
  },
  {
    id: "atlas",
    label: "Atlas (masculina)",
    description: "Narrador épico e firme",
    tone: "bold",
    rate: 1.02,
    pitch: 0.92,
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
];

export default function VozIA() {
  const [script, setScript] = useState(
    "Bem-vindo à Merse. Esta narração foi gerada com a estética sonora do nosso universo.",
  );
  const [preset, setPreset] = useState<VoicePreset>(PRESETS[0]!);
  const [rate, setRate] = useState(PRESETS[0]!.rate);
  const [pitch, setPitch] = useState(PRESETS[0]!.pitch);
  const [volume, setVolume] = useState(1);
  const [splitSentences, setSplitSentences] = useState(true);
  const [pauseMs, setPauseMs] = useState(180);
  const [status, setStatus] = useState<"idle" | "playing" | "unavailable">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playTokenRef = useRef(0);

  const hasSpeech = useMemo(() => typeof window !== "undefined" && "speechSynthesis" in window, []);

  useEffect(() => {
    if (!hasSpeech) {
      setStatus("unavailable");
      setMessage("Seu navegador não suporta síntese de voz local. Use um navegador compatível.");
      return;
    }
    const synth = window.speechSynthesis;
    const populate = () => {
      const list = synth.getVoices();
      if (list.length) {
        setVoices(list);
      }
    };
    populate();
    synth.onvoiceschanged = populate;
  }, [hasSpeech]);

  useEffect(() => {
    setRate(preset.rate);
    setPitch(preset.pitch);
  }, [preset]);

  useEffect(() => {
    if (!voices.length) return;
    if (selectedVoiceId) return;
    const preferred =
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("pt")) ?? voices[0];
    if (preferred) {
      setSelectedVoiceId(preferred.name);
    }
  }, [voices, selectedVoiceId]);

  const wordCount = useMemo(() => {
    const trimmed = script.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [script]);

  const estimatedSeconds = useMemo(() => {
    if (!wordCount) return 0;
    const wordsPerSecond = 2.6 * Math.max(rate, 0.5);
    return Math.round(wordCount / wordsPerSecond);
  }, [wordCount, rate]);

  const pickVoice = () => {
    if (!voices.length) return null;
    const selected = selectedVoiceId
      ? voices.find((voice) => voice.name === selectedVoiceId)
      : null;
    if (selected) return selected;
    return voices.find((v) => v.lang?.toLowerCase().startsWith("pt")) ?? voices[0] ?? null;
  };

  const splitScriptIntoChunks = (text: string) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    const chunks = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    if (!chunks) return [cleaned];
    return chunks.map((chunk) => chunk.trim()).filter(Boolean);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1400);
    } catch {
      setCopyStatus("idle");
    }
  };

  const handleApplyTemplate = (text: string) => {
    setScript(text);
    setMessage(null);
  };

  const handlePlay = () => {
    if (!hasSpeech) {
      setMessage("Seu navegador não suporta síntese de voz local.");
      return;
    }
    if (!script.trim()) {
      setMessage("Cole ou digite um roteiro para gerar a voz.");
      return;
    }
    const synth = window.speechSynthesis;
    if (utteranceRef.current) {
      synth.cancel();
      utteranceRef.current = null;
    }
    playTokenRef.current += 1;
    const token = playTokenRef.current;
    const voice = pickVoice();
    const queue = splitSentences ? splitScriptIntoChunks(script) : [script];

    const speakIndex = (index: number) => {
      if (token !== playTokenRef.current) return;
      const text = queue[index];
      if (!text) {
        setStatus("idle");
        setIsPaused(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.onstart = () => {
        setStatus("playing");
        setIsPaused(false);
        setMessage(null);
      };
      utterance.onend = () => {
        if (token !== playTokenRef.current) return;
        if (splitSentences && index < queue.length - 1) {
          window.setTimeout(() => speakIndex(index + 1), Math.max(0, pauseMs));
        } else {
          setStatus("idle");
          setIsPaused(false);
        }
      };
      utterance.onerror = () => {
        setStatus("idle");
        setIsPaused(false);
        setMessage("Não foi possível reproduzir. Tente outro navegador.");
      };
      utteranceRef.current = utterance;
      synth.speak(utterance);
    };

    speakIndex(0);
  };

  const handlePause = () => {
    if (!hasSpeech) return;
    if (status !== "playing") return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (!hasSpeech) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const stop = () => {
    if (!hasSpeech) return;
    playTokenRef.current += 1;
    window.speechSynthesis.cancel();
    setStatus("idle");
    setIsPaused(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-20 pt-24 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/30 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(236,72,153,0.18),transparent_52%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(circle_at_30%_75%,rgba(168,85,247,0.16),transparent_58%)]" />
        <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
      </div>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Voz IA imersiva</p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Narração neural no estilo Merse
            </span>
          </h1>
          <p className="max-w-3xl text-sm text-white/70">
            Cole o roteiro, escolha a voz Merse e reproduza na hora com FX espacial. Ideal para trailers, pitches e
            tutoriais.
          </p>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-purple-300/20 bg-gradient-to-br from-purple-500/14 via-fuchsia-500/10 to-transparent p-8 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:120px_120px] opacity-20" />
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/22 blur-[120px]" />
          <div className="absolute -right-20 bottom-[-28%] h-64 w-64 rounded-full bg-cyan-500/18 blur-[120px]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-white/70">Fluxo Merse</p>
                  <h2 className="text-2xl font-semibold">Texto • Voz neural • Preview imediato</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60">
                  Local preview
                </span>
              </div>

              <label className="block">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>Roteiro</span>
                  <span>{wordCount} palavras • ~{estimatedSeconds}s</span>
                </div>
                <textarea
                  value={script}
                  onChange={(event) => setScript(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                  placeholder="Cole seu texto para narrar no padrão Merse..."
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
                <span className="text-white/50">Use ponto final para pausas naturais</span>
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

              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Voz do navegador
                <select
                  value={selectedVoiceId ?? ""}
                  onChange={(event) => setSelectedVoiceId(event.target.value)}
                  disabled={!voices.length}
                  className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-60"
                >
                  {!voices.length && <option value="">Carregando vozes...</option>}
                  {voices.map((voice) => (
                    <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                      {voice.name} • {voice.lang}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Ajustes finos</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Velocidade</span>
                      <span>{rate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.02"
                      value={rate}
                      onChange={(event) => setRate(Number(event.target.value))}
                      className="mt-2 w-full"
                    />
                  </label>
                  <label className="rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Pitch</span>
                      <span>{pitch.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.02"
                      value={pitch}
                      onChange={(event) => setPitch(Number(event.target.value))}
                      className="mt-2 w-full"
                    />
                  </label>
                  <label className="rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Volume</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(event) => setVolume(Number(event.target.value))}
                      className="mt-2 w-full"
                    />
                  </label>
                  <label className="rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Pausa entre frases</span>
                      <span>{pauseMs}ms</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="600"
                      step="20"
                      value={pauseMs}
                      onChange={(event) => setPauseMs(Number(event.target.value))}
                      className="mt-2 w-full"
                      disabled={!splitSentences}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
                  <input
                    type="checkbox"
                    checked={splitSentences}
                    onChange={(event) => setSplitSentences(event.target.checked)}
                    className="h-4 w-4 rounded border border-white/30 bg-black/40"
                  />
                  Quebrar por frases
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-white/70">
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1">Voz estilizada</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1">FX espacial</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1">Preview imediato</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={status === "unavailable"}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-300/40 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-[1.08] disabled:opacity-50"
                >
                  {status === "playing" ? "Reproduzindo..." : "Gerar e ouvir"}
                </button>
                {status === "playing" && !isPaused && (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/40 hover:bg-white/20"
                  >
                    Pausar
                  </button>
                )}
                {status === "playing" && isPaused && (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/40 hover:bg-white/20"
                  >
                    Continuar
                  </button>
                )}
                {status === "playing" && (
                  <button
                    type="button"
                    onClick={stop}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/40 hover:bg-white/20"
                  >
                    Parar
                  </button>
                )}
                {message && <span className="text-sm text-amber-200/90">{message}</span>}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-300/20 bg-black/50 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/16 to-transparent opacity-90" />
              <div className="absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/60">
                  <span>Prévia de voz</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white/70">
                    {status === "playing" ? "tocando" : "pronto"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/55">
                  <span>{selectedVoiceId ?? "voz padrão"}</span>
                  <span>{rate.toFixed(2)}x</span>
                  <span>pitch {pitch.toFixed(2)}</span>
                </div>
                <div className="relative h-28 overflow-hidden rounded-xl border border-purple-300/20 bg-gradient-to-br from-purple-500/26 via-pink-500/16 to-black/70">
                  <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_20%_30%,rgba(236,72,153,0.22),transparent_48%),radial-gradient(circle_at_80%_60%,rgba(59,130,246,0.22),transparent_50%)] opacity-70" />
                  {status === "playing" ? (
                    <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
                      {Array.from({ length: 28 }).map((_, idx) => (
                        <span
                          key={idx}
                          className="h-10 w-[4px] rounded-full bg-white/70"
                          style={{
                            animation: `barWave 0.9s ease-in-out ${idx * 0.03}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
                      Clique em “Gerar e ouvir” para tocar a prévia
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-purple-300/20 bg-black/30 p-3 text-xs text-white/70">
                  <p className="font-semibold text-white">Dica rápida</p>
                  <p className="mt-1">
                    Para sincronizar com vídeo, exporte o áudio gerado e use no editor Merse ou suba o vídeo com o
                    roteiro para lipsync automático.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <style jsx global>{`
        @keyframes barWave {
          0% {
            transform: scaleY(0.4);
            opacity: 0.4;
          }
          50% {
            transform: scaleY(1.2);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.4);
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
