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
  generatedImageUrl: string | null;
  generatedImages: string[];
  continuityImageUrl: string | null;
  generatedVideoUrl: string | null;
  generatedCoverUrl: string | null;
  generatedDuration: number | null;
  continuityFrameUrl: string | null;
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
const CARD_HEIGHT_IMAGE = 430;
const CARD_HEIGHT_VIDEO = 430;

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
    generatedImageUrl: null,
    generatedImages: [],
    continuityImageUrl: null,
    generatedVideoUrl: null,
    generatedCoverUrl: null,
    generatedDuration: null,
    continuityFrameUrl: null,
    x: 120,
    y: 180,
    width: CARD_WIDTH,
    height: cardHeightForType("image"),
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
    generatedImageUrl: null,
    generatedImages: [],
    continuityImageUrl: null,
    generatedVideoUrl: null,
    generatedCoverUrl: null,
    generatedDuration: null,
    continuityFrameUrl: null,
    x: 560,
    y: 420,
    width: CARD_WIDTH,
    height: cardHeightForType("video"),
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
  const y = 120 + row * (CARD_HEIGHT_VIDEO + 64);
  return {
    x: clamp(x, 24, CANVAS_WIDTH - CARD_WIDTH - 24),
    y: clamp(y, 24, CANVAS_HEIGHT - CARD_HEIGHT_VIDEO - 24),
  };
}

function cardHeightForType(type: GenerationType) {
  return type === "video" ? CARD_HEIGHT_VIDEO : CARD_HEIGHT_IMAGE;
}

function aspectFromSizeLabel(size: string) {
  const match = size.match(/(\d+:\d+)/);
  return match?.[1] ?? "16:9";
}

function normalizeVideoProvider(referenceId: string): "veo" | "sora" | "merse" | "wan" | "kling" {
  const value = referenceId.trim().toLowerCase();
  if (value === "sora") return "sora";
  if (value === "merse") return "merse";
  if (value === "wan") return "wan";
  if (value === "kling") return "kling";
  return "veo";
}

function normalizeImageProvider(
  referenceId: string,
): "openai" | "flux" | "merse" | "nano-banana" | "runway-gen4" {
  const value = referenceId.trim().toLowerCase();
  if (value === "flux") return "flux";
  if (value === "merse") return "merse";
  if (value === "nano-banana") return "nano-banana";
  if (value === "runway-gen4") return "runway-gen4";
  return "openai";
}

function toReadableFilename(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "video-merse"
  );
}

export default function LoopPage() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ cardId: string; offsetX: number; offsetY: number } | null>(null);
  const glowTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pulseTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const [cards, setCards] = useState<WorkflowCard[]>(INITIAL_CARDS);
  const [edges, setEdges] = useState<WorkflowEdge[]>(INITIAL_EDGES);
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [connectedCardIds, setConnectedCardIds] = useState<string[]>([]);
  const [generatingCardIds, setGeneratingCardIds] = useState<string[]>([]);
  const [pulseEdgeId, setPulseEdgeId] = useState<string | null>(null);
  const [isPulseRunning, setIsPulseRunning] = useState(false);
  const [isMergingSequence, setIsMergingSequence] = useState(false);
  const [sequenceMergeUrl, setSequenceMergeUrl] = useState<string | null>(null);
  const [sequenceMergeStatus, setSequenceMergeStatus] = useState<string | null>(null);
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
  const generatingCardSet = useMemo(() => new Set(generatingCardIds), [generatingCardIds]);
  const flowMetrics = useMemo(() => {
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    cards.forEach((card) => {
      inDegree.set(card.id, 0);
      outDegree.set(card.id, 0);
    });

    edges.forEach((edge) => {
      outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    });

    const isolated = cards.filter(
      (card) => (inDegree.get(card.id) ?? 0) === 0 && (outDegree.get(card.id) ?? 0) === 0,
    ).length;
    const entries = cards.filter((card) => (inDegree.get(card.id) ?? 0) === 0).length;
    const exits = cards.filter((card) => (outDegree.get(card.id) ?? 0) === 0).length;
    const branching = cards.filter((card) => (outDegree.get(card.id) ?? 0) > 1).length;

    const score = clamp(
      Math.round(
        100 - isolated * 20 - Math.max(0, entries - 1) * 8 - Math.max(0, exits - 1) * 6 + branching * 4,
      ),
      0,
      100,
    );

    return {
      score,
      isolated,
      entries,
      exits,
      branching,
      statusLabel: score >= 85 ? "Estelar" : score >= 65 ? "Estavel" : "Em ajuste",
    };
  }, [cards, edges]);

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
      pulseTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pulseTimeoutsRef.current = [];
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

  const clearPulseTimeline = useCallback(() => {
    pulseTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    pulseTimeoutsRef.current = [];
    setPulseEdgeId(null);
    setIsPulseRunning(false);
  }, []);

  const runEdgePulse = useCallback(() => {
    if (!edges.length) return;

    clearPulseTimeline();
    setIsPulseRunning(true);

    const orderedEdges = [...edges].sort((a, b) => {
      const fromA = cardsById.get(a.from);
      const fromB = cardsById.get(b.from);
      const toA = cardsById.get(a.to);
      const toB = cardsById.get(b.to);
      return (
        (fromA?.x ?? 0) - (fromB?.x ?? 0) ||
        (toA?.x ?? 0) - (toB?.x ?? 0) ||
        (fromA?.y ?? 0) - (fromB?.y ?? 0) ||
        (toA?.y ?? 0) - (toB?.y ?? 0)
      );
    });

    orderedEdges.forEach((edge, index) => {
      const timeoutId = setTimeout(() => {
        setPulseEdgeId(edge.id);
        triggerCardGlow([edge.from, edge.to]);
      }, index * 260);
      pulseTimeoutsRef.current.push(timeoutId);
    });

    const finishTimeoutId = setTimeout(() => {
      setPulseEdgeId(null);
      setIsPulseRunning(false);
    }, orderedEdges.length * 260 + 260);
    pulseTimeoutsRef.current.push(finishTimeoutId);
  }, [cardsById, clearPulseTimeline, edges, triggerCardGlow]);

  const autoConnectOrphans = useCallback(() => {
    if (cards.length < 2) return;

    const highlightedIds = new Set<string>();
    setEdges((previous) => {
      const nextEdges = [...previous];
      const existing = new Set(previous.map((edge) => `${edge.from}->${edge.to}`));
      const inDegree = new Map<string, number>();
      const outDegree = new Map<string, number>();

      cards.forEach((card) => {
        inDegree.set(card.id, 0);
        outDegree.set(card.id, 0);
      });

      previous.forEach((edge) => {
        outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      });

      const sortedCards = [...cards].sort((a, b) => a.x - b.x || a.y - b.y);

      sortedCards.forEach((card, index) => {
        const noInputs = (inDegree.get(card.id) ?? 0) === 0;
        const noOutputs = (outDegree.get(card.id) ?? 0) === 0;
        if (!noInputs || !noOutputs) return;

        const left = [...sortedCards.slice(0, index)].reverse().find((item) => item.id !== card.id);
        const right = sortedCards.slice(index + 1).find((item) => item.id !== card.id);

        const fromId = left ? left.id : card.id;
        const toId = left ? card.id : right?.id;
        if (!toId || fromId === toId) return;

        const edgeKey = `${fromId}->${toId}`;
        if (existing.has(edgeKey)) return;

        nextEdges.push({ id: createEdgeId(), from: fromId, to: toId });
        existing.add(edgeKey);
        outDegree.set(fromId, (outDegree.get(fromId) ?? 0) + 1);
        inDegree.set(toId, (inDegree.get(toId) ?? 0) + 1);
        highlightedIds.add(fromId);
        highlightedIds.add(toId);
      });

      return nextEdges;
    });

    if (highlightedIds.size) {
      triggerCardGlow(Array.from(highlightedIds));
    }
  }, [cards, triggerCardGlow]);

  const mutateCardFromDNA = useCallback(
    (cardId: string) => {
      const source = cardsById.get(cardId);
      if (!source) return;

      const mutationPrompt =
        source.generationType === "video"
          ? "Mutacao DNA: ritmo mais dinamico, camera com arco lateral e fechamento com CTA forte."
          : "Mutacao DNA: novo angulo de camera, contraste premium e variacao cromatica complementar.";

      const nextCard: WorkflowCard = {
        ...source,
        id: createCardId(),
        title: `${source.title} • DNA`,
        prompt: source.prompt ? `${source.prompt}\n${mutationPrompt}` : mutationPrompt,
        generatedImageUrl: null,
        generatedImages: [],
        continuityImageUrl: null,
        generatedVideoUrl: null,
        generatedCoverUrl: null,
        generatedDuration: null,
        continuityFrameUrl: null,
        x: clamp(source.x + CARD_WIDTH + 68, 24, CANVAS_WIDTH - source.width - 24),
        y: clamp(source.y + 34, 24, CANVAS_HEIGHT - source.height - 24),
      };

      setCards((previous) => [...previous, nextCard]);
      setEdges((previous) => {
        if (previous.some((edge) => edge.from === source.id && edge.to === nextCard.id)) {
          return previous;
        }
        return [...previous, { id: createEdgeId(), from: source.id, to: nextCard.id }];
      });
      triggerCardGlow([source.id, nextCard.id]);
    },
    [cardsById, triggerCardGlow],
  );

  const createSmartSequence = useCallback(() => {
    const baseTitle = newTitle.trim() || (newType === "video" ? "Sequencia de Video" : "Sequencia de Imagem");
    const origin = nextCardPosition(cards);
    const sequenceHeight = cardHeightForType(newType);
    const variationY = clamp(origin.y + 34, 24, CANVAS_HEIGHT - sequenceHeight - 24);
    const finalY = clamp(origin.y + 8, 24, CANVAS_HEIGHT - sequenceHeight - 24);

    const prompts =
      newType === "video"
        ? [
            "Abertura cinematografica da campanha com narrativa clara e gancho inicial.",
            "Plano de transicao com movimento de camera, prova de valor e ritmo crescente.",
            "Fechamento com CTA forte, assinatura de marca e adaptacao para anuncios curtos.",
          ]
        : [
            "Visual hero com composicao premium, foco no produto e iluminacao de estúdio.",
            "Variacao com angulo alternativo, detalhes de textura e contraste elevado.",
            "Frame final para conversao com CTA visual e identidade de marca consolidada.",
          ];

    const fallbackRef = defaultCreationReferenceId(newType);
    const secondRef = creationReferencesForNewCard[1]?.id ?? fallbackRef;
    const thirdRef = creationReferencesForNewCard[2]?.id ?? secondRef;
    const sequenceCards: WorkflowCard[] = [
      {
        id: createCardId(),
        title: `${baseTitle} • Origem`,
        generationType: newType,
        creationReferenceId: newCreationReferenceId || fallbackRef,
        outputSize: newSize,
        prompt: prompts[0],
        referenceImage: null,
        generatedImageUrl: null,
        generatedImages: [],
        continuityImageUrl: null,
        generatedVideoUrl: null,
        generatedCoverUrl: null,
        generatedDuration: null,
        continuityFrameUrl: null,
        x: origin.x,
        y: origin.y,
        width: CARD_WIDTH,
        height: cardHeightForType(newType),
      },
      {
        id: createCardId(),
        title: `${baseTitle} • Evolucao`,
        generationType: newType,
        creationReferenceId: secondRef,
        outputSize: newSize,
        prompt: prompts[1],
        referenceImage: null,
        generatedImageUrl: null,
        generatedImages: [],
        continuityImageUrl: null,
        generatedVideoUrl: null,
        generatedCoverUrl: null,
        generatedDuration: null,
        continuityFrameUrl: null,
        x: clamp(origin.x + CARD_WIDTH + 92, 24, CANVAS_WIDTH - CARD_WIDTH - 24),
        y: variationY,
        width: CARD_WIDTH,
        height: cardHeightForType(newType),
      },
      {
        id: createCardId(),
        title: `${baseTitle} • Final`,
        generationType: newType,
        creationReferenceId: thirdRef,
        outputSize: newSize,
        prompt: prompts[2],
        referenceImage: null,
        generatedImageUrl: null,
        generatedImages: [],
        continuityImageUrl: null,
        generatedVideoUrl: null,
        generatedCoverUrl: null,
        generatedDuration: null,
        continuityFrameUrl: null,
        x: clamp(origin.x + (CARD_WIDTH + 92) * 2, 24, CANVAS_WIDTH - CARD_WIDTH - 24),
        y: finalY,
        width: CARD_WIDTH,
        height: cardHeightForType(newType),
      },
    ];

    setCards((previous) => [...previous, ...sequenceCards]);
    setEdges((previous) => [
      ...previous,
      { id: createEdgeId(), from: sequenceCards[0].id, to: sequenceCards[1].id },
      { id: createEdgeId(), from: sequenceCards[1].id, to: sequenceCards[2].id },
    ]);
    triggerCardGlow(sequenceCards.map((card) => card.id));
    setIsCreatorOpen(false);
  }, [
    cards,
    creationReferencesForNewCard,
    newCreationReferenceId,
    newSize,
    newTitle,
    newType,
    triggerCardGlow,
  ]);

  const findUpstreamVideoCard = useCallback(
    (targetCardId: string) => {
      const visited = new Set<string>();
      const queue = edges.filter((edge) => edge.to === targetCardId).map((edge) => edge.from);

      while (queue.length) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        const card = cardsById.get(currentId);
        if (card?.generationType === "video" && card.generatedVideoUrl) {
          return card;
        }

        edges.forEach((edge) => {
          if (edge.to === currentId && !visited.has(edge.from)) {
            queue.push(edge.from);
          }
        });
      }

      return null;
    },
    [cardsById, edges],
  );

  const findUpstreamImageCard = useCallback(
    (targetCardId: string) => {
      const visited = new Set<string>();
      const queue = edges.filter((edge) => edge.to === targetCardId).map((edge) => edge.from);

      while (queue.length) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        const card = cardsById.get(currentId);
        if (card?.generationType === "image" && (card.generatedImageUrl || card.referenceImage)) {
          return card;
        }

        edges.forEach((edge) => {
          if (edge.to === currentId && !visited.has(edge.from)) {
            queue.push(edge.from);
          }
        });
      }

      return null;
    },
    [cardsById, edges],
  );

  const generateImageForCard = useCallback(
    async (cardId: string) => {
      const card = cardsById.get(cardId);
      if (!card || card.generationType !== "image") return;

      setGeneratingCardIds((previous) => (previous.includes(cardId) ? previous : [...previous, cardId]));

      try {
        const upstreamImageCard = findUpstreamImageCard(card.id);
        const continuityImageUrl =
          upstreamImageCard?.generatedImageUrl ?? upstreamImageCard?.referenceImage ?? null;

        const continuityInstruction = continuityImageUrl
          ? "CONTINUIDADE ESTRUTURAL OBRIGATORIA: preserve fielmente enquadramento, composição, posição dos elementos e hierarquia visual da referência. Altere apenas estilo, textura, luz e acabamento visual."
          : "";

        const finalPrompt = [card.prompt || "Crie uma imagem premium no estilo Merse.", continuityInstruction]
          .filter(Boolean)
          .join("\n\n");

        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            provider: normalizeImageProvider(card.creationReferenceId),
            aspectRatio: aspectFromSizeLabel(card.outputSize),
            count: 1,
            referenceImage: continuityImageUrl ?? card.referenceImage ?? undefined,
          }),
        });

        const payload = (await response.json()) as {
          imageUrl?: string;
          images?: string[];
          error?: string;
        };
        if (!response.ok || typeof payload.imageUrl !== "string") {
          throw new Error(payload.error ?? "Não foi possível gerar esta imagem agora.");
        }

        const images =
          Array.isArray(payload.images) && payload.images.length
            ? payload.images.filter((item): item is string => typeof item === "string")
            : [payload.imageUrl];

        updateCard(card.id, {
          generatedImageUrl: payload.imageUrl,
          generatedImages: images,
          continuityImageUrl,
        });

        if (upstreamImageCard) {
          triggerCardGlow([upstreamImageCard.id, card.id]);
        } else {
          triggerCardGlow([card.id]);
        }
      } catch (error) {
        setSequenceMergeStatus(error instanceof Error ? error.message : "Falha ao gerar a imagem do card.");
      } finally {
        setGeneratingCardIds((previous) => previous.filter((item) => item !== cardId));
      }
    },
    [cardsById, findUpstreamImageCard, triggerCardGlow, updateCard],
  );

  const generateVideoForCard = useCallback(
    async (cardId: string) => {
      const card = cardsById.get(cardId);
      if (!card || card.generationType !== "video") return;

      setGeneratingCardIds((previous) => (previous.includes(cardId) ? previous : [...previous, cardId]));
      setSequenceMergeUrl(null);
      setSequenceMergeStatus("Gerando vídeo no card...");

      try {
        const upstreamVideoCard = findUpstreamVideoCard(card.id);
        let continuityFrameUrl: string | null = null;

        if (upstreamVideoCard?.generatedVideoUrl) {
          const frameResponse = await fetch("/api/loop/extract-last-frame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoUrl: upstreamVideoCard.generatedVideoUrl,
              cardId: upstreamVideoCard.id,
            }),
          });
          const frameData = (await frameResponse.json()) as { frameUrl?: string; error?: string };
          if (frameResponse.ok && typeof frameData.frameUrl === "string" && frameData.frameUrl.trim()) {
            continuityFrameUrl = frameData.frameUrl.trim();
          }
        }

        const continuityInstruction = continuityFrameUrl
          ? "CONTINUIDADE OBRIGATORIA: use a imagem de referencia como ultimo frame do vídeo anterior e continue a cena sem corte, mantendo movimento, luz e direção de camera."
          : "";

        const finalPrompt = [card.prompt || "Crie um vídeo premium no estilo Merse.", continuityInstruction]
          .filter(Boolean)
          .join("\n\n");

        const response = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            provider: normalizeVideoProvider(card.creationReferenceId),
            aspectRatio: aspectFromSizeLabel(card.outputSize),
            referenceImage: continuityFrameUrl ?? card.referenceImage ?? undefined,
          }),
        });

        const payload = (await response.json()) as {
          videoUrl?: string;
          cover?: string;
          duration?: number;
          error?: string;
        };
        if (!response.ok || typeof payload.videoUrl !== "string") {
          throw new Error(payload.error ?? "Não foi possível gerar este vídeo agora.");
        }

        updateCard(card.id, {
          generatedVideoUrl: payload.videoUrl,
          generatedCoverUrl: typeof payload.cover === "string" ? payload.cover : continuityFrameUrl,
          generatedDuration: typeof payload.duration === "number" ? payload.duration : null,
          continuityFrameUrl,
        });

        if (upstreamVideoCard) {
          triggerCardGlow([upstreamVideoCard.id, card.id]);
        } else {
          triggerCardGlow([card.id]);
        }

        setSequenceMergeStatus("Vídeo gerado. Você já pode salvar este card ou juntar a sequência.");
      } catch (error) {
        setSequenceMergeStatus(error instanceof Error ? error.message : "Falha ao gerar o vídeo do card.");
      } finally {
        setGeneratingCardIds((previous) => previous.filter((item) => item !== cardId));
      }
    },
    [cardsById, findUpstreamVideoCard, triggerCardGlow, updateCard],
  );

  const saveCardVideo = useCallback(
    (cardId: string) => {
      if (typeof window === "undefined") return;
      const card = cardsById.get(cardId);
      if (!card?.generatedVideoUrl) return;

      const baseUrl = window.location.origin;
      const href = card.generatedVideoUrl.startsWith("http")
        ? card.generatedVideoUrl
        : `${baseUrl}${card.generatedVideoUrl.startsWith("/") ? "" : "/"}${card.generatedVideoUrl}`;

      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.download = `${toReadableFilename(card.title)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [cardsById],
  );

  const saveCardImage = useCallback(
    (cardId: string) => {
      if (typeof window === "undefined") return;
      const card = cardsById.get(cardId);
      if (!card?.generatedImageUrl) return;

      const baseUrl = window.location.origin;
      const href =
        card.generatedImageUrl.startsWith("data:") || card.generatedImageUrl.startsWith("http")
          ? card.generatedImageUrl
          : `${baseUrl}${card.generatedImageUrl.startsWith("/") ? "" : "/"}${card.generatedImageUrl}`;

      const extensionMatch = card.generatedImageUrl.match(/\.(png|jpe?g|webp|gif)(?:\?|$)/i);
      const extension = extensionMatch?.[1]?.toLowerCase() === "jpeg" ? "jpg" : extensionMatch?.[1] ?? "png";

      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.download = `${toReadableFilename(card.title)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [cardsById],
  );

  const saveMergedSequence = useCallback(async () => {
    if (isMergingSequence) return;

    const inDegree = new Map<string, number>();
    cards.forEach((card) => inDegree.set(card.id, 0));
    edges.forEach((edge) => inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1));

    const queue = cards
      .filter((card) => (inDegree.get(card.id) ?? 0) === 0)
      .sort((a, b) => a.x - b.x || a.y - b.y)
      .map((card) => card.id);

    const orderedIds: string[] = [];
    const adjacency = new Map<string, string[]>();
    edges.forEach((edge) => {
      const list = adjacency.get(edge.from) ?? [];
      list.push(edge.to);
      adjacency.set(edge.from, list);
    });

    while (queue.length) {
      const current = queue.shift();
      if (!current) break;
      orderedIds.push(current);
      const neighbours = adjacency.get(current) ?? [];
      neighbours.forEach((next) => {
        const nextDegree = (inDegree.get(next) ?? 0) - 1;
        inDegree.set(next, nextDegree);
        if (nextDegree === 0) {
          queue.push(next);
        }
      });
      queue.sort((left, right) => {
        const leftCard = cardsById.get(left);
        const rightCard = cardsById.get(right);
        return (leftCard?.x ?? 0) - (rightCard?.x ?? 0) || (leftCard?.y ?? 0) - (rightCard?.y ?? 0);
      });
    }

    if (orderedIds.length < cards.length) {
      const remaining = cards
        .filter((card) => !orderedIds.includes(card.id))
        .sort((a, b) => a.x - b.x || a.y - b.y)
        .map((card) => card.id);
      orderedIds.push(...remaining);
    }

    const orderedVideoUrls = orderedIds
      .map((id) => cardsById.get(id))
      .filter((card): card is WorkflowCard => Boolean(card))
      .filter((card) => card.generationType === "video" && typeof card.generatedVideoUrl === "string")
      .map((card) => card.generatedVideoUrl as string);

    if (!orderedVideoUrls.length) {
      setSequenceMergeStatus("Nenhum vídeo gerado para salvar em sequência.");
      return;
    }

    setIsMergingSequence(true);
    setSequenceMergeStatus("Mesclando toda a sequência de vídeos...");
    setSequenceMergeUrl(null);

    try {
      const response = await fetch("/api/loop/merge-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrls: orderedVideoUrls,
          sequenceName: "loop-sequencia-merse",
        }),
      });

      const payload = (await response.json()) as {
        mergedUrl?: string;
        error?: string;
      };

      if (!response.ok || typeof payload.mergedUrl !== "string") {
        throw new Error(payload.error ?? "Não foi possível montar a sequência agora.");
      }

      setSequenceMergeUrl(payload.mergedUrl);
      setSequenceMergeStatus("Sequência pronta. Clique em salvar para baixar o vídeo final.");
    } catch (error) {
      setSequenceMergeStatus(error instanceof Error ? error.message : "Falha ao salvar sequência.");
    } finally {
      setIsMergingSequence(false);
    }
  }, [cards, cardsById, edges, isMergingSequence]);

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
        generatedImageUrl: null,
        generatedImages: [],
        continuityImageUrl: null,
        generatedVideoUrl: null,
        generatedCoverUrl: null,
        generatedDuration: null,
        continuityFrameUrl: null,
        x: position.x,
        y: position.y,
        width: CARD_WIDTH,
        height: cardHeightForType(newType),
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
    setGeneratingCardIds((previous) => previous.filter((id) => id !== cardId));
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
          onClick={() => setIsCreatorOpen((previous) => !previous)}
          aria-label={isCreatorOpen ? "Fechar painel de criacao" : "Criar novo card"}
          className={`fixed right-5 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl border transition ${
            isCreatorOpen
              ? "border-rose-300/45 bg-[#2a0d14]/95 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.35),0_10px_32px_rgba(0,0,0,0.45)] hover:border-rose-200/75 hover:bg-[#34101a]"
              : "border-violet-300/35 bg-[#170f24]/95 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.35),0_10px_32px_rgba(0,0,0,0.45)] hover:border-violet-200/70 hover:bg-[#1f1431]"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isCreatorOpen ? (
              <path
                d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M12 5.5V18.5M5.5 12H18.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            )}
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
          <div className="mb-6">
            <h2 className="text-base font-semibold text-violet-100">Criar Novo Card</h2>
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

            <div className="space-y-2 rounded-xl border border-violet-300/20 bg-[#140d22]/75 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-violet-100/60">Funcoes Orbitais</p>
              <button
                type="button"
                onClick={createSmartSequence}
                className="w-full rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Gerar Trilha Inteligente (3 cards)
              </button>
              <button
                type="button"
                onClick={autoConnectOrphans}
                className="w-full rounded-lg border border-fuchsia-300/35 bg-fuchsia-500/15 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25"
              >
                Conectar Cards Orfaos
              </button>
            </div>
          </div>
        </aside>

        <section className="fixed bottom-5 left-5 z-30 w-[270px] rounded-xl border border-violet-300/25 bg-[#0f0919]/92 p-4 shadow-[0_16px_38px_rgba(0,0,0,0.46)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.22em] text-violet-100/70">DNA do Loop</p>
            <span className="rounded-full border border-violet-200/30 bg-violet-500/14 px-2 py-0.5 text-[11px] font-semibold text-violet-100">
              {flowMetrics.score}
            </span>
          </div>
          <p className="text-xs text-violet-100/75">
            Status: <span className="font-semibold text-violet-50">{flowMetrics.statusLabel}</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-violet-100/70">
            <span>Entradas: {flowMetrics.entries}</span>
            <span>Saídas: {flowMetrics.exits}</span>
            <span>Órfãos: {flowMetrics.isolated}</span>
            <span>Branches: {flowMetrics.branching}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={runEdgePulse}
              disabled={isPulseRunning || edges.length === 0}
              className="rounded-lg border border-cyan-300/35 bg-cyan-500/16 px-2 py-2 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/24 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isPulseRunning ? "Pulso..." : "Pulso Orbital"}
            </button>
            <button
              type="button"
              onClick={autoConnectOrphans}
              className="rounded-lg border border-fuchsia-300/35 bg-fuchsia-500/16 px-2 py-2 text-[11px] font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/24"
            >
              Corrigir Órfãos
            </button>
          </div>
          <button
            type="button"
            onClick={saveMergedSequence}
            disabled={isMergingSequence}
            className="mt-2 w-full rounded-lg border border-emerald-300/35 bg-emerald-500/16 px-2 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isMergingSequence ? "Juntando sequência..." : "Salvar Sequência (1 vídeo)"}
          </button>
          {sequenceMergeStatus ? <p className="mt-2 text-[11px] text-violet-100/70">{sequenceMergeStatus}</p> : null}
          {sequenceMergeUrl ? (
            <a
              href={sequenceMergeUrl}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-emerald-200/45 bg-emerald-400/18 px-2 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/30"
            >
              Baixar Vídeo Final da Sequência
            </a>
          ) : null}
        </section>

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
                const isPulseEdge = edge.id === pulseEdgeId;
                const isSelectedEdge = edge.id === selectedEdgeId;
                return (
                  <g key={edge.id}>
                    <path
                      d={curvePath(start, end)}
                      stroke={
                        isPulseEdge
                          ? "rgba(125,211,252,0.96)"
                          : isSelectedEdge
                          ? "rgba(233,213,255,0.98)"
                          : "rgba(192,132,252,0.72)"
                      }
                      strokeWidth={isPulseEdge ? 2.9 : isSelectedEdge ? 2.6 : 2.1}
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
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-no-drag
                      aria-label={`Mutacao DNA para ${card.title}`}
                      className="rounded-md border border-cyan-300/30 bg-cyan-500/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/90 transition hover:border-cyan-200/60 hover:bg-cyan-500/22"
                      onClick={(event) => {
                        event.stopPropagation();
                        mutateCardFromDNA(card.id);
                      }}
                    >
                      DNA
                    </button>
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
                  {card.generationType === "image" ? (
                    <div className="rounded-md border border-fuchsia-300/20 bg-fuchsia-500/8 p-2">
                      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-fuchsia-100/75">
                        <span>Automação de Imagem</span>
                        <span>{aspectFromSizeLabel(card.outputSize)}</span>
                      </div>
                      <div className={`grid gap-2 ${card.generatedImageUrl ? "grid-cols-2" : "grid-cols-1"}`}>
                        <button
                          type="button"
                          data-no-drag
                          onClick={(event) => {
                            event.stopPropagation();
                            void generateImageForCard(card.id);
                          }}
                          disabled={generatingCardSet.has(card.id)}
                          className="rounded-md border border-fuchsia-300/35 bg-fuchsia-500/15 px-2 py-1.5 text-[11px] font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {generatingCardSet.has(card.id) ? "Gerando..." : "Gerar Imagem"}
                        </button>
                        {card.generatedImageUrl ? (
                          <button
                            type="button"
                            data-no-drag
                            onClick={(event) => {
                              event.stopPropagation();
                              saveCardImage(card.id);
                            }}
                            className="rounded-md border border-emerald-300/35 bg-emerald-500/14 px-2 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24"
                          >
                            Salvar Imagem
                          </button>
                        ) : null}
                      </div>
                      {card.generatedImageUrl ? (
                        <img
                          src={card.generatedImageUrl}
                          alt={`Prévia gerada de ${card.title}`}
                          className="mt-2 h-24 w-full rounded-md border border-fuchsia-300/20 bg-black/35 object-cover"
                        />
                      ) : null}
                      {card.continuityImageUrl ? (
                        <p className="mt-1 text-[10px] text-fuchsia-100/75">
                          Continuidade ativa: estrutura do card anterior aplicada.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {card.generationType === "video" ? (
                    <div className="rounded-md border border-cyan-300/20 bg-cyan-500/8 p-2">
                      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-cyan-100/75">
                        <span>Automação de Vídeo</span>
                        <span>{card.generatedDuration ? `${card.generatedDuration}s` : aspectFromSizeLabel(card.outputSize)}</span>
                      </div>
                      <div className={`grid gap-2 ${card.generatedVideoUrl ? "grid-cols-2" : "grid-cols-1"}`}>
                        <button
                          type="button"
                          data-no-drag
                          onClick={(event) => {
                            event.stopPropagation();
                            void generateVideoForCard(card.id);
                          }}
                          disabled={generatingCardSet.has(card.id)}
                          className="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {generatingCardSet.has(card.id) ? "Gerando..." : "Gerar Vídeo"}
                        </button>
                        {card.generatedVideoUrl ? (
                          <button
                            type="button"
                            data-no-drag
                            onClick={(event) => {
                              event.stopPropagation();
                              saveCardVideo(card.id);
                            }}
                            className="rounded-md border border-emerald-300/35 bg-emerald-500/14 px-2 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24"
                          >
                            Salvar Vídeo
                          </button>
                        ) : null}
                      </div>
                      {card.generatedVideoUrl ? (
                        <video
                          src={card.generatedVideoUrl}
                          controls
                          playsInline
                          className="mt-2 h-24 w-full rounded-md border border-cyan-300/20 bg-black/35 object-cover"
                        />
                      ) : null}
                      {card.continuityFrameUrl ? (
                        <p className="mt-1 text-[10px] text-cyan-100/70">
                          Continuidade ativa: último frame do vídeo anterior aplicado.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
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
