import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "@/contexts/AuthContext";

type ChatMessage = { role: "merse" | "user"; content: string };

type FirstCreation = {
  title: string;
  description: string;
  imageDataUrl: string;
  createdAt: string;
  story: string;
};

const STORAGE_KEY = "merse.firstCreation";

const seedPrompts = [
  "Me conta uma cena que você sempre imaginou, mas nunca viu de verdade.",
  "Que atmosfera essa cena tem? Luz suave, neon, ou algo mais silencioso?",
  "Se pudesse pendurar essa imagem na parede da sua nave, como quer que ela faça você se sentir?",
];

function createPoster({ title, description }: { title: string; description: string }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const hue = Math.floor(Math.random() * 360);
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, `hsla(${hue}, 70%, 52%, 0.9)`);
  grad.addColorStop(0.6, `hsla(${(hue + 40) % 360}, 68%, 45%, 0.6)`);
  grad.addColorStop(1, "rgba(5,5,15,0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 2.4 + 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 44px 'Inter', system-ui";
  ctx.fillText(title, 64, 360);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "300 26px 'Inter', system-ui";
  const words = description.split(" ");
  let line = "";
  let y = 410;
  words.forEach((word) => {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > 980) {
      ctx.fillText(line, 64, y);
      line = `${word} `;
      y += 34;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, 64, y);

  return canvas.toDataURL("image/png");
}

export default function MersePrimeira() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "merse",
      content:
        "Oi, sou a Merse. Quero ver o que você imagina. Me conta uma cena que vive na sua cabeça.",
    },
  ]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoGenerateTriggered = useRef(false);

  // Temporarily allow users to revisit this page even if they already generated
  // the first creation. Re-enable redirect when the onboarding should be single-use again.
  // useEffect(() => {
  //   const stored = localStorage.getItem(STORAGE_KEY);
  //   if (stored) {
  //     void router.replace("/gerar");
  //   }
  // }, [router]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isReplying) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    const nextStep = Math.min(step + 1, seedPrompts.length - 1);
    setStep(nextStep + 1);
    setInput("");
    setErrorMessage(null);
    setTimeout(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }, 80);

    setIsReplying(true);
    try {
      const response = await fetch("/api/merse-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      const merseReply =
        data.reply?.trim() ?? seedPrompts[nextStep] ?? seedPrompts[seedPrompts.length - 1]!;
      setMessages([...nextMessages, { role: "merse", content: merseReply }]);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível continuar a conversa agora.",
      );
      setMessages([
        ...nextMessages,
        { role: "merse", content: seedPrompts[nextStep] ?? seedPrompts[seedPrompts.length - 1]! },
      ]);
    } finally {
      setIsReplying(false);
      setTimeout(() => {
        containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
      }, 80);
    }
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    const userLines = messages.filter((m) => m.role === "user").map((m) => m.content);
    if (!userLines.length) {
      setErrorMessage("Responda pelo menos uma vez para gerar sua imagem.");
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);

    fetch("/api/primeira-imagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        userId: user?.uid ?? null,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Não foi possível gerar a imagem.");
        }
        return response.json() as Promise<FirstCreation>;
      })
      .then((payload) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        void router.replace("/gerar");
      })
      .catch((err: Error) => {
        setErrorMessage(err.message);
        // fallback local para não travar a UX
        const description = userLines.slice(-3).join(" • ");
        const story = userLines.join(" ");
        const imageDataUrl = createPoster({ title: "Primeira Criação", description });
        const payload: FirstCreation = {
          title: "Primeira Criação",
          description,
          imageDataUrl,
          createdAt: new Date().toISOString(),
          story,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        void router.replace("/gerar");
      })
      .finally(() => setIsGenerating(false));
  };

  const canGenerate = useMemo(() => messages.some((m) => m.role === "user"), [messages]);
  const userReplyCount = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);
  const latestMersePrompt =
    messages.filter((m) => m.role === "merse").slice(-1)[0]?.content ??
    seedPrompts[step] ??
    seedPrompts[seedPrompts.length - 1]!;
  const activePrompt = latestMersePrompt;
  const progress = useMemo(() => Math.min((step / seedPrompts.length) * 100, 100), [step]);

  useEffect(() => {
    if (autoGenerateTriggered.current) return;
    if (userReplyCount >= seedPrompts.length && canGenerate && !isGenerating) {
      autoGenerateTriggered.current = true;
      handleGenerate();
    }
  }, [userReplyCount, canGenerate, isGenerating]);

  return (
    <>
      <Head>
        <title>Encontro Merse · Primeira criação</title>
      </Head>
      <main className="relative min-h-screen overflow-hidden bg-[#05030f] px-6 pb-16 pt-16 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(168,85,247,0.22),transparent_55%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_30%_78%,rgba(34,197,94,0.14),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.08),transparent_40%)] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:200px_200px] opacity-20" />
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="relative overflow-hidden rounded-[32px] border border-purple-300/25 bg-gradient-to-br from-black/70 via-purple-950/40 to-black/80 px-8 py-10 shadow-[0_24px_90px_rgba(0,0,0,0.55)] ring-1 ring-purple-300/20 backdrop-blur-3xl">
            <div className="pointer-events-none absolute -left-20 -top-28 h-64 w-64 rounded-full bg-purple-500/20 blur-[120px]" />
            <div className="pointer-events-none absolute -right-16 bottom-[-30%] h-72 w-72 rounded-full bg-cyan-400/14 blur-[120px]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_55%,rgba(255,255,255,0.06),transparent_38%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.34em] text-white/70">
                  <span className="rounded-full border border-purple-200/40 bg-purple-500/20 px-4 py-1 text-white">
                    Primeira criação
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/70">Conversa guiada</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/60">Imagem única</span>
                </div>
                <h1 className="text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
                  A Merse quer{" "}
                  <span className="bg-gradient-to-r from-purple-300 via-white to-blue-200 bg-clip-text text-transparent bg-[length:220%_220%] animate-gradient-shift">
                    ouvir sua imaginação
                  </span>
                </h1>
                <p className="max-w-3xl text-sm text-white/70">
                  Conduzimos você pelas perguntas certas, sem pressa. Cada resposta vira um banner exclusivo do seu dia zero
                  com a estética Merse.
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-white/70">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="uppercase tracking-[0.28em]">Sessão ativa</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/60 via-indigo-500/50 to-blue-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)]" />
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">Destino</p>
                      <p className="text-sm text-white">Banner do Dia Zero</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-white/5 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-3xl">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-400/20 blur-[90px]" />
                <div className="relative space-y-4">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Ritmo da conversa</p>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold leading-none text-white">
                        {Math.min(step + 1, seedPrompts.length)}
                      </p>
                      <p className="text-sm text-white/60">de {seedPrompts.length} pontos explorados</p>
                    </div>
                    <span className="rounded-full border border-purple-200/30 bg-purple-500/20 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white">
                      Próxima pergunta
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-300"
                    />
                  </div>
                  <p className="text-sm text-white/80">{activePrompt}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="relative overflow-hidden rounded-[32px] border border-purple-300/25 bg-gradient-to-br from-black/80 via-[#0c0a18] to-black/90 p-6 shadow-[0_26px_100px_rgba(0,0,0,0.65)] backdrop-blur-3xl ring-1 ring-purple-300/15">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(236,72,153,0.12),transparent_55%),radial-gradient(circle_at_75%_40%,rgba(59,130,246,0.12),transparent_55%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:160px_160px] opacity-30" />
            </div>
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-500/22 blur-[150px]" />
            <div className="absolute -right-16 bottom-[-32%] h-72 w-72 rounded-full bg-cyan-500/18 blur-[150px]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5 rounded-[24px] border border-white/10 bg-black/40 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/60">Conversa com a Merse</p>
                    <p className="text-sm text-white/70">Curta, inspiradora e sem pressa. Responda com o que vier à mente.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-white/70">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <span>Gravando ideias</span>
                  </div>
                </div>

                <div
                  ref={containerRef}
                  className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-purple-300/25 bg-black/60 p-4 shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                >
                  {messages.map((msg, idx) => (
                    <div
                      key={`${msg.role}-${idx}`}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${
                          msg.role === "user"
                            ? "border border-purple-300/40 bg-gradient-to-br from-purple-500/30 via-fuchsia-500/25 to-indigo-500/30 text-white"
                            : "border border-white/10 bg-white/5 text-white/80"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/50 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">Sugestão da Merse</p>
                      <p className="text-sm text-white/80">{activePrompt}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
                      {messages.filter((m) => m.role === "user").length} respostas
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      className="w-full rounded-xl border border-purple-300/30 bg-[#090812] px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-[0_18px_52px_rgba(0,0,0,0.45)] focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                      placeholder={activePrompt || "Continue a conversa..."}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSend}
                        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/40 hover:bg-white/20"
                      >
                        Enviar
                      </button>
                      <span className="rounded-full border border-purple-300/40 bg-purple-500/20 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-white/80">
                        {isGenerating ? "Gerando automaticamente..." : "Gera automático ao finalizar"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.28em]">
                      Rápido e único
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.28em]">
                      Sem repetir
                    </span>
                    {errorMessage && <span className="text-sm text-amber-200/90">{errorMessage}</span>}
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-purple-500/12 via-black/40 to-black/70 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                <div className="absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-white/12 blur-3xl" />
                <div className="absolute -right-16 top-[-20%] h-48 w-48 rounded-full bg-purple-400/14 blur-[120px]" />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Primeira criação</p>
                      <p className="text-lg font-semibold text-white">Banner do dia zero</p>
                      <p className="text-sm text-white/70">
                        Seu relato vira uma imagem exclusiva e segue direto para a página Gerar, pronta para baixar e
                        compartilhar.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-purple-300/30 bg-purple-500/20 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white">
                      Exclusivo
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-white/60">Trilha da sessão</p>
                    <div className="grid gap-2 text-sm text-white/80">
                      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-purple-300" />
                        <div>
                          <p className="text-xs text-white/70">Passo 1</p>
                          <p className="text-white">Conte a cena na sua cabeça</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-blue-300" />
                        <div>
                          <p className="text-xs text-white/70">Passo 2</p>
                          <p className="text-white">Refine luz, atmosfera e sentimento</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-300" />
                        <div>
                          <p className="text-xs text-white/70">Passo 3</p>
                          <p className="text-white">Geramos o banner com o estilo Merse</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-white/60">Preview imediato</p>
                    <p className="text-sm text-white/70">Assim que gerar, enviamos você para a galeria pessoal com o banner.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[0.28em] text-white/70">
                      <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Download rápido</span>
                      <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Compartilhar</span>
                      <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Alta resolução</span>
                      <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Somente você</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="space-y-3 rounded-3xl border border-purple-300/30 bg-gradient-to-br from-purple-900/60 via-black/85 to-black/90 px-8 py-10 text-center shadow-[0_24px_90px_rgba(0,0,0,0.7)]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-purple-100/70">Carregando</p>
            <p className="text-xl font-semibold text-white">Gerando sua primeira criação...</p>
            <p className="text-sm text-white/70">Isso leva poucos segundos. Preparando seu banner único.</p>
          </div>
        </div>
      )}
    </>
  );
}
