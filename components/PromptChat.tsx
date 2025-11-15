import { useEffect, useMemo, useRef, useState } from "react";
import {
  PiChatsFill,
  PiPaperPlaneTiltFill,
  PiTrashSimpleFill,
  PiClockCountdownFill,
} from "react-icons/pi";

type Role = "user" | "assistant";
type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
};

type WebsiteBlueprint = {
  summary: string;
  highlights: string[];
  html: string;
  imageUrl?: string;
};

type PromptChatMode = "prompt" | "website";

type PromptChatProps = {
  embedded?: boolean;
  onClose?: () => void;
  storageKey?: string;
  mode?: PromptChatMode;
  onWebsiteGenerated?: (website: WebsiteBlueprint) => void;
};

const DEFAULT_STORAGE_KEY = "merse.chat.default";
const PLACEHOLDER_TEXT: Record<PromptChatMode, string> = {
  prompt: "Orbitando ideias cósmicas...",
  website: "Gerando blueprint completo...",
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadHistory(storageKey: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function persistHistory(storageKey: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(messages));
}

function buildWebsitePayloadFromBrief(brief: string) {
  const sanitized = brief.trim().slice(0, 2400);
  const fallbackName = sanitized.split(/[.!?\n]/)[0]?.slice(0, 60)?.trim() ?? "Projeto Merse via Chat";
  const siteName = fallbackName.length > 3 ? fallbackName : "Projeto Merse via Chat";

  return {
    siteName,
    goal: "Blueprint criado automaticamente pelo chat Merse.",
    menu: "Início, Recursos, Estudos de Caso, Planos, Contato",
    layout: {
      id: "chat-blueprint",
      label: "Galaxy Flow",
      description: "Layout criado a partir de briefing textual.",
      objective: "Converter visitantes apresentando o conceito com impacto.",
      highlights: [
        "Hero cinematográfico com CTA duplo e partículas líquidas.",
        "Blocos verticais exibindo benefícios, módulos e depoimentos.",
        "Seção de planos com cards translúcidos e indicadores de créditos.",
      ],
      referenceImage: "/banners/Merse-4.png",
    },
    palette: {
      id: "neon",
      label: "Neon Galaxy",
      preview: "Roxo • Azul • Magenta",
    },
    modules: [
      "Hero 3D animado",
      "Workflow visual",
      "Tabela de planos",
      "FAQ interativo",
      "CTA cósmico final",
    ],
    notes: "Blueprint solicitado via chat conversacional da Merse.",
    heroMood: "Atmosfera futurista, glassmorphism e partículas brilhantes.",
    rawBrief: sanitized,
  };
}

export default function PromptChat({
  embedded = false,
  onClose,
  storageKey,
  mode = "prompt",
  onWebsiteGenerated,
}: PromptChatProps) {
  const resolvedStorageKey = storageKey ?? DEFAULT_STORAGE_KEY;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(loadHistory(resolvedStorageKey));
  }, [resolvedStorageKey]);

  useEffect(() => {
    persistHistory(resolvedStorageKey, messages);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, resolvedStorageKey]);

  useEffect(() => {
    if (!embedded || !messages.length) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    containerRef.current?.focus();
  }, [messages.length, embedded]);

  const lastInteraction = useMemo(() => {
    const last = messages[messages.length - 1];
    return last ? new Date(last.createdAt) : null;
  }, [messages]);

  const headings = useMemo(() => {
    if (mode === "website") {
      return {
        title: "Chat para gerar rascunhos de site",
        description:
          "Descreva o site que imagina e o laboratório devolve o HTML completo com identidade Merse.",
        placeholder: "Preciso de um site para...",
        empty: "Explique o site desejado e vou gerar o blueprint.",
      };
    }

    return {
      title: "Chat para lapidar suas ideias",
      description:
        "Tire dúvidas, refine briefs e receba sugestões cósmicas antes de gerar seus visuais ou vídeos.",
      placeholder: "Descreva o que deseja gerar ou peça ideias...",
      empty: "Comece descrevendo o visual que deseja e eu ajudo a lapidar o prompt.",
    };
  }, [mode]);

  const handlePromptAssistant = async (history: ChatMessage[], placeholderId: string) => {
    const sanitized = history
      .map((message) => ({ role: message.role, content: message.content }))
      .slice(-12);

    const response = await fetch("/api/prompt-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: sanitized }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível gerar uma resposta agora.");
    }

    const assistantMessage: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: data.reply,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => prev.map((message) => (message.id === placeholderId ? assistantMessage : message)));
  };

  const handleWebsiteBlueprint = async (history: ChatMessage[], placeholderId: string) => {
    const brief = history
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .join("\n\n")
      .trim();

    if (!brief) {
      throw new Error("Descreva como deseja o site para gerar o blueprint.");
    }

    const payload = buildWebsitePayloadFromBrief(brief);

    const response = await fetch("/api/generate-website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível gerar o site agora.");
    }

    const summary = data.website?.summary?.trim();
    const assistantMessage: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: summary ? `Blueprint pronto! ${summary}` : "Blueprint pronto! Veja a prévia do lado direito.",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => prev.map((message) => (message.id === placeholderId ? assistantMessage : message)));
    onWebsiteGenerated?.(data.website);
  };

  const handleSend = async (value?: string) => {
    const content = typeof value === "string" ? value : input;
    if (!content.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const baseHistory = [...messages, userMessage];

    setMessages(baseHistory);
    setInput("");
    setIsGenerating(true);
    setError(null);

    const placeholderId = createMessageId();
    const placeholderMessage: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: PLACEHOLDER_TEXT[mode],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, placeholderMessage]);

    try {
      if (mode === "website") {
        await handleWebsiteBlueprint(baseHistory, placeholderId);
      } else {
        await handlePromptAssistant(baseHistory, placeholderId);
      }
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Erro inesperado ao acessar o laboratório.";
      setError(message);
      setMessages((prev) => prev.filter((chat) => chat.id !== placeholderId));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    persistHistory(resolvedStorageKey, []);
  };

  const renderChatShell = (isCompact: boolean) => {
    return (
      <div
        className={`flex h-full w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#07030f]/90 text-white backdrop-blur-2xl outline-none ${
          isCompact ? "" : "shadow-[0_34px_90px_rgba(0,0,0,0.45)]"
        }`}
        ref={isCompact ? containerRef : undefined}
        tabIndex={-1}
      >
        <header className="flex flex-col gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.45em] text-purple-200/80">Laboratório Merse</p>
            <h1 className="text-lg font-semibold text-white">{headings.title}</h1>
          </div>
          <p className="text-xs leading-relaxed text-white/70">{headings.description}</p>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
            <PiChatsFill className="text-lg text-purple-300" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">Último contato</p>
              <p>
                {lastInteraction
                  ? new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    }).format(lastInteraction)
                  : "Ainda não há mensagens"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-6 py-5 min-h-0">
          <section className="grid h-full flex-1 grid-rows-[auto_1fr_auto] rounded-2xl border border-white/10 bg-white/5 text-xs text-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)] min-h-0">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <span className="text-[10px] uppercase tracking-[0.35em] text-white/55">Histórico</span>
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white/65 transition hover:border-rose-400/50 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isGenerating || messages.length === 0}
              >
                <PiTrashSimpleFill />
                Limpar
              </button>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 space-y-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-white/20"
            >
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/60">
                  <PiClockCountdownFill className="text-2xl text-purple-300" />
                  <p>{headings.empty}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[90%] rounded-2xl border px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${
                      message.role === "user"
                        ? "ml-auto border-purple-400/40 bg-purple-500/20 text-white"
                        : "border-white/10 bg-black/40 text-white/80"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                    <span className="mt-2 block text-[9px] uppercase tracking-[0.3em] text-white/40">
                      {new Intl.DateTimeFormat("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(message.createdAt))}
                    </span>
                  </div>
                ))
              )}
          </div>

            <div className="border-t border-white/5 bg-black/40 px-4 py-4">
              {error && (
                <div className="mb-3 rounded-xl border border-rose-400/60 bg-rose-500/10 px-4 py-2 text-[11px] text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                  {error}
                </div>
              )}
              <form
                className="flex items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={mode === "website" ? 3 : 2}
                  placeholder={headings.placeholder}
                  className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={isGenerating || !input.trim()}
                  className="flex items-center gap-2 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_16px_40px_rgba(168,85,247,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PiPaperPlaneTiltFill className={isGenerating ? "animate-spin text-base" : "text-base"} />
                  Enviar
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    );
  };

  if (embedded) {
    return renderChatShell(true);
  }

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[480px] bg-[radial-gradient(circle_at_60%_25%,rgba(236,72,153,0.28),transparent_55%),radial-gradient(circle_at_25%_30%,rgba(14,165,233,0.25),transparent_65%)] blur-3xl opacity-80" />
      {!embedded && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
        >
          Voltar
        </button>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Laboratório Merse</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">{headings.title}</h1>
            <p className="max-w-2xl text-sm text-white/70">{headings.description}</p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
            <PiChatsFill className="text-2xl text-purple-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Último contato</p>
              <p>
                {lastInteraction
                  ? new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    }).format(lastInteraction)
                  : "Ainda não há mensagens"}
              </p>
            </div>
          </div>
        </header>

        {renderChatShell(false)}
      </div>
    </div>
  );
}
