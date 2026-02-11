import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GenerationType = "image" | "video";
type CreationReferenceOption = { id: string; label: string };

type WorkflowCard = {
  id: string;
  title: string;
  generationType: GenerationType;
  creationReferenceId: string;
  outputSize: string;
  prompt: string;
  referenceImage: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
};

type WorkflowEdge = {
  id: string;
  from: string;
  to: string;
};

type PendingLink =
  | { mode: "new"; fromCardId: string; x: number; y: number }
  | { mode: "reconnectFrom"; edgeId: string; toCardId: string; x: number; y: number }
  | { mode: "reconnectTo"; edgeId: string; fromCardId: string; x: number; y: number };

const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1400;
const CARD_WIDTH = 312;
const CARD_HEIGHT = 300;

const SIZE_OPTIONS: Record<GenerationType, string[]> = {
  image: ["1:1 (1024x1024)", "4:5 (1080x1350)", "16:9 (1920x1080)", "9:16 (1080x1920)"],
  video: ["16:9 (1920x1080)", "9:16 (1080x1920)", "1:1 (1080x1080)", "21:9 (2560x1080)"],
};

const CREATION_REFERENCES: Record<GenerationType, CreationReferenceOption[]> = {
  image: [
    { id: "openai", label: "ChatGPT Vision" },
    { id: "flux", label: "Flux Studio" },
    { id: "merse", label: "Merse AI 1.0" },
    { id: "nano-banana", label: "Nano Banana" },
    { id: "runway-gen4", label: "Runway Gen-4" },
  ],
  video: [
    { id: "veo", label: "Veo 3" },
    { id: "sora", label: "Sora 2" },
    { id: "merse", label: "Merse AI 1.0" },
    { id: "wan", label: "Wan-2.6-t2v" },
    { id: "kling", label: "Kling v2.5 Turbo" },
  ],
};

const CREATION_REFERENCE_LABELS: Record<GenerationType, Record<string, string>> = {
  image: CREATION_REFERENCES.image.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.label;
    return acc;
  }, {}),
  video: CREATION_REFERENCES.video.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.label;
    return acc;
  }, {}),
};

function defaultCreationReferenceId(type: GenerationType) {
  return CREATION_REFERENCES[type][0]?.id ?? "";
}

const INITIAL_CARDS: WorkflowCard[] = [
  {
    id: "a",
    title: "Base Prompt",
    generationType: "image",
    creationReferenceId: "flux",
    outputSize: "1:1 (1024x1024)",
    prompt:
      "Crie um conceito visual cinematografico com luz suave, composicao limpa e detalhes premium.",
    referenceImage: "/LOJA-PROMPTS/CEU.png",
    x: 120,
    y: 180,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  {
    id: "b",
    title: "Prompt de Video",
    generationType: "video",
    creationReferenceId: "veo",
    outputSize: "16:9 (1920x1080)",
    prompt:
      "Transforme a cena em video publicitario com movimento de camera lento, transicoes organicas e atmosfera high-end.",
    referenceImage: "/LOJA-PROMPTS/PRAIA.png",
    x: 560,
    y: 420,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
];

const INITIAL_EDGES: WorkflowEdge[] = [];

function createCardId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `card-${crypto.randomUUID()}`;
  }
  return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEdgeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `edge-${crypto.randomUUID()}`;
  }
  return `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function curvePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = Math.abs(to.x - from.x);
  const curve = Math.max(72, dx * 0.45);
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nextCardPosition(existingCards: WorkflowCard[]) {
  const colCount = 5;
  const index = existingCards.length;
  const col = index % colCount;
  const row = Math.floor(index / colCount);
  const x = 120 + col * (CARD_WIDTH + 90);
  const y = 120 + row * (CARD_HEIGHT + 64);
  return {
    x: clamp(x, 24, CANVAS_WIDTH - CARD_WIDTH - 24),
    y: clamp(y, 24, CANVAS_HEIGHT - CARD_HEIGHT - 24),
  };
}

export default function LoopPage() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ cardId: string; offsetX: number; offsetY: number } | null>(null);
  const glowTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [cards, setCards] = useState<WorkflowCard[]>(INITIAL_CARDS);
  const [edges, setEdges] = useState<WorkflowEdge[]>(INITIAL_EDGES);
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [connectedCardIds, setConnectedCardIds] = useState<string[]>([]);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newType, setNewType] = useState<GenerationType>("image");
  const [newSize, setNewSize] = useState<string>(SIZE_OPTIONS.image[0]);
  const [newCreationReferenceId, setNewCreationReferenceId] = useState<string>(
    defaultCreationReferenceId("image"),
  );
  const [newTitle, setNewTitle] = useState("Novo Card");

  const cardsById = useMemo(() => {
    return new Map(cards.map((card) => [card.id, card] as const));
  }, [cards]);
  const connectedCardSet = useMemo(() => new Set(connectedCardIds), [connectedCardIds]);

  const sizeOptionsForNewCard = SIZE_OPTIONS[newType];
  const creationReferencesForNewCard = CREATION_REFERENCES[newType];

  useEffect(() => {
    if (!sizeOptionsForNewCard.includes(newSize)) {
      setNewSize(sizeOptionsForNewCard[0]);
    }
  }, [newSize, sizeOptionsForNewCard]);

  useEffect(() => {
    if (!creationReferencesForNewCard.some((option) => option.id === newCreationReferenceId)) {
      setNewCreationReferenceId(defaultCreationReferenceId(newType));
    }
  }, [newCreationReferenceId, newType, creationReferencesForNewCard]);

  const edgesToRender = useMemo(() => {
    if (!pendingLink) return edges;
    if (pendingLink.mode === "reconnectFrom" || pendingLink.mode === "reconnectTo") {
      return edges.filter((edge) => edge.id !== pendingLink.edgeId);
    }
    return edges;
  }, [edges, pendingLink]);

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const cardInputPoint = useCallback((card: WorkflowCard) => {
    return {
      x: card.x - 6,
      y: card.y + card.height * 0.5,
    };
  }, []);

  const cardOutputPoint = useCallback((card: WorkflowCard) => {
    return {
      x: card.x + card.width + 6,
      y: card.y + card.height * 0.5,
    };
  }, []);

  const edgeExists = useCallback(
    (fromCardId: string, toCardId: string, ignoreEdgeId?: string) => {
      return edges.some(
        (edge) =>
          edge.id !== ignoreEdgeId && edge.from === fromCardId && edge.to === toCardId,
      );
    },
    [edges],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const point = toCanvasPoint(event.clientX, event.clientY);

      if (dragRef.current) {
        const { cardId, offsetX, offsetY } = dragRef.current;
        setCards((previous) =>
          previous.map((card) => {
            if (card.id !== cardId) return card;
            const nextX = clamp(point.x - offsetX, 24, CANVAS_WIDTH - card.width - 24);
            const nextY = clamp(point.y - offsetY, 24, CANVAS_HEIGHT - card.height - 24);
            return { ...card, x: nextX, y: nextY };
          }),
        );
      }

      setPendingLink((previous) => {
        if (!previous) return previous;
        return { ...previous, x: point.x, y: point.y };
      });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      setDraggingCardId(null);
      setPendingLink(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [toCanvasPoint]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingLink(null);
        setSelectedEdgeId(null);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeId) {
        setEdges((previous) => previous.filter((edge) => edge.id !== selectedEdgeId));
        setSelectedEdgeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId]);

  useEffect(() => {
    return () => {
      glowTimeoutRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      glowTimeoutRef.current.clear();
    };
  }, []);

  const startCardDrag = (event: React.PointerEvent<HTMLElement>, cardId: string) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-handle]")) return;
    if (target.closest("[data-no-drag]")) return;
    if (target.closest("input, textarea, select, button, label")) return;

    const card = cardsById.get(cardId);
    if (!card) return;

    const point = toCanvasPoint(event.clientX, event.clientY);
    dragRef.current = {
      cardId,
      offsetX: point.x - card.x,
      offsetY: point.y - card.y,
    };
    setDraggingCardId(cardId);
    setSelectedEdgeId(null);
  };

  const updateCard = useCallback((cardId: string, patch: Partial<WorkflowCard>) => {
    setCards((previous) =>
      previous.map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
    );
  }, []);

  const triggerCardGlow = useCallback((cardIds: string[]) => {
    const uniqueIds = Array.from(new Set(cardIds));
    if (uniqueIds.length === 0) return;

    setConnectedCardIds((previous) => {
      const next = new Set(previous);
      uniqueIds.forEach((id) => next.add(id));
      return Array.from(next);
    });

    uniqueIds.forEach((id) => {
      const existingTimeout = glowTimeoutRef.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      const timeoutId = setTimeout(() => {
        setConnectedCardIds((previous) => previous.filter((item) => item !== id));
        glowTimeoutRef.current.delete(id);
      }, 1200);
      glowTimeoutRef.current.set(id, timeoutId);
    });
  }, []);

  const onReferenceImageChange = useCallback(
    (cardId: string, file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const data = typeof reader.result === "string" ? reader.result : null;
        updateCard(cardId, { referenceImage: data });
      };
      reader.readAsDataURL(file);
    },
    [updateCard],
  );

  const createCard = () => {
    setCards((previous) => {
      const position = nextCardPosition(previous);
      const card: WorkflowCard = {
        id: createCardId(),
        title: newTitle.trim() || `${newType === "video" ? "Video" : "Imagem"} Node`,
        generationType: newType,
        creationReferenceId: newCreationReferenceId,
        outputSize: newSize,
        prompt: "",
        referenceImage: null,
        x: position.x,
        y: position.y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      };
      return [...previous, card];
    });
    setIsCreatorOpen(false);
  };

  const deleteCard = useCallback((cardId: string) => {
    const timeoutId = glowTimeoutRef.current.get(cardId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      glowTimeoutRef.current.delete(cardId);
    }

    setCards((previous) => previous.filter((card) => card.id !== cardId));
    setEdges((previous) => previous.filter((edge) => edge.from !== cardId && edge.to !== cardId));
    setConnectedCardIds((previous) => previous.filter((id) => id !== cardId));
    setPendingLink(null);
    setSelectedEdgeId(null);
  }, []);

  const startNewLink = (event: React.PointerEvent<HTMLSpanElement>, fromCardId: string) => {
    event.stopPropagation();
    event.preventDefault();
    const point = toCanvasPoint(event.clientX, event.clientY);
    setPendingLink({
      mode: "new",
      fromCardId,
      x: point.x,
      y: point.y,
    });
    setSelectedEdgeId(null);
  };

  const attachOnInput = (event: React.PointerEvent<HTMLSpanElement>, toCardId: string) => {
    event.stopPropagation();
    event.preventDefault();
    if (!pendingLink) return;
    let connected = false;
    let fromCardId = "";

    if (pendingLink.mode === "new") {
      fromCardId = pendingLink.fromCardId;
      if (fromCardId !== toCardId && !edgeExists(fromCardId, toCardId)) {
        setEdges((previous) => [...previous, { id: createEdgeId(), from: fromCardId, to: toCardId }]);
        connected = true;
      }
    }

    if (pendingLink.mode === "reconnectTo") {
      fromCardId = pendingLink.fromCardId;
      if (fromCardId !== toCardId && !edgeExists(fromCardId, toCardId, pendingLink.edgeId)) {
        setEdges((previous) =>
          previous.map((edge) =>
            edge.id === pendingLink.edgeId ? { ...edge, to: toCardId } : edge,
          ),
        );
        connected = true;
      }
    }

    if (connected && fromCardId) {
      triggerCardGlow([fromCardId, toCardId]);
    }

    setPendingLink(null);
    setSelectedEdgeId(null);
  };

  const attachOnOutput = (event: React.PointerEvent<HTMLSpanElement>, fromCardId: string) => {
    event.stopPropagation();
    event.preventDefault();
    if (!pendingLink || pendingLink.mode !== "reconnectFrom") return;

    const toCardId = pendingLink.toCardId;
    if (fromCardId !== toCardId && !edgeExists(fromCardId, toCardId, pendingLink.edgeId)) {
      setEdges((previous) =>
        previous.map((edge) =>
          edge.id === pendingLink.edgeId ? { ...edge, from: fromCardId } : edge,
        ),
      );
      triggerCardGlow([fromCardId, toCardId]);
    }

    setPendingLink(null);
    setSelectedEdgeId(null);
  };

  const selectedEdge = selectedEdgeId
    ? edges.find((edge) => edge.id === selectedEdgeId) ?? null
    : null;

  const selectedEdgePoints = selectedEdge
    ? (() => {
        const from = cardsById.get(selectedEdge.from);
        const to = cardsById.get(selectedEdge.to);
        if (!from || !to) return null;
        return {
          start: cardOutputPoint(from),
          end: cardInputPoint(to),
        };
      })()
    : null;

  const previewPath = (() => {
    if (!pendingLink) return null;

    if (pendingLink.mode === "new") {
      const fromCard = cardsById.get(pendingLink.fromCardId);
      if (!fromCard) return null;
      return curvePath(cardOutputPoint(fromCard), { x: pendingLink.x, y: pendingLink.y });
    }

    if (pendingLink.mode === "reconnectFrom") {
      const toCard = cardsById.get(pendingLink.toCardId);
      if (!toCard) return null;
      return curvePath({ x: pendingLink.x, y: pendingLink.y }, cardInputPoint(toCard));
    }

    const fromCard = cardsById.get(pendingLink.fromCardId);
    if (!fromCard) return null;
    return curvePath(cardOutputPoint(fromCard), { x: pendingLink.x, y: pendingLink.y });
  })();

  return (
    <>
      <Head>
        <title>Loop Canvas • Merse</title>
      </Head>

      <main className="relative min-h-screen overflow-hidden bg-[#03060c] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(30,41,59,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.4) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_42%_12%,rgba(124,58,237,0.22),transparent_40%),radial-gradient(circle_at_72%_78%,rgba(192,132,252,0.16),transparent_56%)]" />

        <button
          type="button"
          onClick={() => setIsCreatorOpen(true)}
          aria-label="Criar novo card"
          className="fixed right-5 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl border border-violet-300/35 bg-[#170f24]/95 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.35),0_10px_32px_rgba(0,0,0,0.45)] transition hover:border-violet-200/70 hover:bg-[#1f1431]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 5.5V18.5M5.5 12H18.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {isCreatorOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setIsCreatorOpen(false)}
            aria-label="Fechar painel de criacao"
          />
        ) : null}

        <aside
          className={`fixed right-0 top-0 z-40 h-screen w-[360px] border-l border-violet-300/20 bg-[#0b0714]/96 p-5 shadow-[-22px_0_50px_rgba(0,0,0,0.35)] transition-transform duration-300 ${
            isCreatorOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-violet-100">Criar Novo Card</h2>
            <button
              type="button"
              onClick={() => setIsCreatorOpen(false)}
              className="rounded-md border border-violet-300/20 px-2 py-1 text-xs text-violet-100/80 hover:bg-violet-400/10"
            >
              Fechar
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-violet-100/60">Tipo de Geracao</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType("image")}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    newType === "image"
                      ? "border-violet-300/80 bg-violet-500/20 text-violet-100"
                      : "border-violet-300/20 bg-white/[0.02] text-violet-100/80"
                  }`}
                >
                  Imagem
                </button>
                <button
                  type="button"
                  onClick={() => setNewType("video")}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    newType === "video"
                      ? "border-violet-300/80 bg-violet-500/20 text-violet-100"
                      : "border-violet-300/20 bg-white/[0.02] text-violet-100/80"
                  }`}
                >
                  Video
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-violet-100/60">Tamanho</label>
              <select
                value={newSize}
                onChange={(event) => setNewSize(event.target.value)}
                className="w-full rounded-lg border border-violet-300/20 bg-[#130d21] px-3 py-2 text-sm text-violet-50 outline-none ring-0"
              >
                {sizeOptionsForNewCard.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-violet-100/60">
                Referência de Criação
              </label>
              <select
                value={newCreationReferenceId}
                onChange={(event) => setNewCreationReferenceId(event.target.value)}
                className="w-full rounded-lg border border-violet-300/20 bg-[#130d21] px-3 py-2 text-sm text-violet-50 outline-none ring-0"
              >
                {creationReferencesForNewCard.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-violet-100/60">Nome do Card</label>
              <input
                type="text"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                className="w-full rounded-lg border border-violet-300/20 bg-[#130d21] px-3 py-2 text-sm text-violet-50 outline-none ring-0"
                placeholder="Ex: Prompt de cena inicial"
              />
            </div>

            <button
              type="button"
              onClick={createCard}
              className="mt-2 w-full rounded-lg border border-violet-300/35 bg-violet-500/25 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/35"
            >
              Criar Card no Canvas
            </button>
          </div>
        </aside>

        <div className="relative min-h-screen w-full overflow-auto p-8 pr-24">
          <div
            ref={canvasRef}
            className="relative"
            style={{ minHeight: CANVAS_HEIGHT, minWidth: CANVAS_WIDTH }}
            onPointerDown={() => setSelectedEdgeId(null)}
          >
            <svg
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              className="absolute inset-0 h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {edgesToRender.map((edge) => {
                const fromCard = cardsById.get(edge.from);
                const toCard = cardsById.get(edge.to);
                if (!fromCard || !toCard) return null;
                const start = cardOutputPoint(fromCard);
                const end = cardInputPoint(toCard);
                return (
                  <g key={edge.id}>
                    <path
                      d={curvePath(start, end)}
                      stroke={edge.id === selectedEdgeId ? "rgba(233,213,255,0.98)" : "rgba(192,132,252,0.72)"}
                      strokeWidth={edge.id === selectedEdgeId ? 2.6 : 2.1}
                      strokeLinecap="round"
                      onClick={() => setSelectedEdgeId(edge.id)}
                      onDoubleClick={() => {
                        setEdges((previous) => previous.filter((item) => item.id !== edge.id));
                        setSelectedEdgeId(null);
                      }}
                    />
                    <path
                      d={curvePath(start, end)}
                      stroke="transparent"
                      strokeWidth={16}
                      strokeLinecap="round"
                      onClick={() => setSelectedEdgeId(edge.id)}
                    />
                  </g>
                );
              })}

              {previewPath ? (
                <path
                  d={previewPath}
                  stroke="rgba(216,180,254,0.95)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="6 6"
                />
              ) : null}
            </svg>

            {selectedEdgePoints ? (
              <>
                <button
                  type="button"
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-100/55 bg-violet-300/95 shadow-[0_0_10px_rgba(167,139,250,0.95)]"
                  style={{ left: selectedEdgePoints.start.x, top: selectedEdgePoints.start.y }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    if (!selectedEdge) return;
                    const point = toCanvasPoint(event.clientX, event.clientY);
                    setPendingLink({
                      mode: "reconnectFrom",
                      edgeId: selectedEdge.id,
                      toCardId: selectedEdge.to,
                      x: point.x,
                      y: point.y,
                    });
                  }}
                />
                <button
                  type="button"
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-100/55 bg-fuchsia-300/95 shadow-[0_0_10px_rgba(232,121,249,0.95)]"
                  style={{ left: selectedEdgePoints.end.x, top: selectedEdgePoints.end.y }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    if (!selectedEdge) return;
                    const point = toCanvasPoint(event.clientX, event.clientY);
                    setPendingLink({
                      mode: "reconnectTo",
                      edgeId: selectedEdge.id,
                      fromCardId: selectedEdge.from,
                      x: point.x,
                      y: point.y,
                    });
                  }}
                />
              </>
            ) : null}

            {cards.map((card) => (
              <article
                key={card.id}
                className={`absolute select-none overflow-hidden rounded-xl border border-violet-300/20 bg-[#10091a]/94 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-[border-color,box-shadow] duration-300 ${
                  connectedCardSet.has(card.id) ? "loop-card-connected border-violet-300/85" : ""
                }`}
                style={{
                  left: card.x,
                  top: card.y,
                  width: card.width,
                  height: card.height,
                  cursor: draggingCardId === card.id ? "grabbing" : "grab",
                }}
                onPointerDown={(event) => startCardDrag(event, card.id)}
              >
                <span
                  data-handle="input"
                  className="absolute -left-[6px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-violet-300/95 shadow-[0_0_12px_rgba(167,139,250,0.95)]"
                  onPointerUp={(event) => attachOnInput(event, card.id)}
                />
                <span
                  data-handle="output"
                  className="absolute -right-[6px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-fuchsia-300/95 shadow-[0_0_12px_rgba(232,121,249,0.95)]"
                  onPointerDown={(event) => startNewLink(event, card.id)}
                  onPointerUp={(event) => attachOnOutput(event, card.id)}
                />

                <div className="flex items-start justify-between gap-2 px-3 pb-2 pt-3">
                  <div className="min-w-0">
                    <p className="truncate pt-1 text-[10px] uppercase tracking-[0.22em] text-violet-50/75">
                      {card.title}
                    </p>
                    <p className="truncate pt-1 text-[10px] text-violet-200/60">
                      {CREATION_REFERENCE_LABELS[card.generationType][card.creationReferenceId] ??
                        card.creationReferenceId}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-no-drag
                    aria-label={`Excluir ${card.title}`}
                    className="rounded-md border border-violet-300/25 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-100/80 transition hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteCard(card.id);
                    }}
                  >
                    X
                  </button>
                </div>

                <div data-no-drag className="space-y-2 px-3 pb-3">
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-violet-100/60">
                      Referência de Criação
                    </label>
                    <select
                      value={card.creationReferenceId}
                      onChange={(event) =>
                        updateCard(card.id, {
                          creationReferenceId: event.target.value,
                        })
                      }
                      className="w-full rounded-md border border-violet-300/20 bg-[#160f24]/85 px-2 py-1.5 text-xs text-violet-50 outline-none"
                    >
                      {CREATION_REFERENCES[card.generationType].map((reference) => (
                        <option key={reference.id} value={reference.id}>
                          {reference.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-violet-100/60">
                      Prompt
                    </label>
                    <textarea
                      value={card.prompt}
                      onChange={(event) => updateCard(card.id, { prompt: event.target.value })}
                      placeholder="Escreva seu prompt aqui..."
                      className="h-20 w-full resize-none rounded-md border border-violet-300/20 bg-[#160f24]/85 px-2 py-1.5 text-xs text-violet-50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-violet-100/60">
                      Imagem de Referencia
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => onReferenceImageChange(card.id, event.target.files?.[0] ?? null)}
                      className="w-full rounded-md border border-violet-300/20 bg-[#160f24]/85 px-2 py-1 text-[11px] text-violet-50/85 file:mr-2 file:rounded file:border-0 file:bg-violet-500/30 file:px-2 file:py-1 file:text-[11px] file:text-violet-100"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <style jsx global>{`
        @keyframes loopCardPulse {
          0% {
            border-color: rgba(196, 181, 253, 0.52);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
          }
          40% {
            border-color: rgba(233, 213, 255, 1);
            box-shadow:
              0 0 0 1px rgba(196, 181, 253, 0.92),
              0 0 28px rgba(168, 85, 247, 0.42),
              0 12px 32px rgba(0, 0, 0, 0.45);
          }
          100% {
            border-color: rgba(196, 181, 253, 0.58);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
          }
        }

        .loop-card-connected {
          animation: loopCardPulse 1.2s ease-out;
        }
      `}</style>
    </>
  );
}
