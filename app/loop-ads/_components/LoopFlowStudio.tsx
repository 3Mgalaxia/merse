"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiCheckCircleFill,
  PiCodeFill,
  PiCopySimpleFill,
  PiDownloadSimpleFill,
  PiFlameFill,
  PiSparkleFill,
  PiVideoFill,
} from "react-icons/pi";

import { useAuth } from "@/contexts/AuthContext";
import { useEnergy } from "@/contexts/EnergyContext";
import {
  appendUserCreations,
  generateCreationId,
  getUserStorageKey,
} from "@/lib/creations";

type ProviderKey = "veo" | "sora" | "merse" | "wan" | "kling";
type FlowApi = "video_api" | "loop_ads_api";
type ReferenceMode = "none" | "upload" | "url" | "previous";
type ProductSource = "url" | "upload" | "previous";
type StepStatus = "idle" | "running" | "done" | "error";

type FlowNode = {
  id: string;
  name: string;
  api: FlowApi;
  prompt: string;
  provider: ProviderKey;
  aspectRatio: "16:9" | "9:16";
  duration: number;
  retries: number;
  continueOnError: boolean;
  autoPassOutput: boolean;
  referenceMode: ReferenceMode;
  referenceUrl: string;
  referenceUpload?: string;
  loopPreset: "ecom" | "cosmic" | "minimal" | "premium";
  loopScenes: number;
  loopSecondsPerScene: number;
  withProduct: boolean;
  productSource: ProductSource;
  productUrl: string;
  productUpload?: string;
  status: StepStatus;
  statusText: string;
  outputUrl?: string;
  error?: string;
  renderedPrompt?: string;
};

const STORAGE_KEY = "merse.loop.flow.studio.v2";
const LOOP_COST = 26;

const VIDEO_PROVIDER_COST: Record<ProviderKey, number> = {
  veo: 30,
  sora: 34,
  merse: 24,
  wan: 20,
  kling: 22,
};

const VIDEO_PROVIDER_LABEL: Record<ProviderKey, string> = {
  veo: "Veo 3",
  sora: "Sora 2",
  merse: "Merse AI 1.0",
  wan: "Wan-2.6-t2v",
  kling: "Kling v2.5 Turbo",
};

const LOOP_PRESET_BG: Record<FlowNode["loopPreset"], "studio_glass" | "cosmic_nebula" | "packshot_studio"> = {
  ecom: "studio_glass",
  cosmic: "cosmic_nebula",
  minimal: "studio_glass",
  premium: "packshot_studio",
};

const LOOP_PRESET_ELEMENT: Record<FlowNode["loopPreset"], "none" | "orb" | "chroma_creature" | "mixed"> = {
  ecom: "mixed",
  cosmic: "orb",
  minimal: "none",
  premium: "orb",
};

type GraphNodeLayout = {
  nodeId: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

function buildFlowEdgePath(from: GraphNodeLayout, to: GraphNodeLayout) {
  const startX = from.x + from.width;
  const startY = from.y + from.height * 0.5;
  const endX = to.x;
  const endY = to.y + to.height * 0.5;
  const curvature = Math.max(64, Math.abs(endX - startX) * 0.45);
  return `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;
}

function resolveNodePreview(node: FlowNode) {
  if (node.outputUrl && node.outputUrl.trim()) return node.outputUrl.trim();
  if (node.referenceUpload && node.referenceUpload.trim()) return node.referenceUpload.trim();
  if (node.productUpload && node.productUpload.trim()) return node.productUpload.trim();
  if (node.referenceMode === "url" && node.referenceUrl.trim()) return node.referenceUrl.trim();
  if (node.withProduct && node.productSource === "url" && node.productUrl.trim()) {
    return node.productUrl.trim();
  }
  return "";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function createId(prefix = "step") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampNumber(value: number, min: number, max: number, fallback: number, step = 1) {
  if (!Number.isFinite(value)) return fallback;
  const clamped = Math.min(max, Math.max(min, value));
  if (step <= 0) return clamped;
  const normalized = Math.round((clamped - min) / step) * step + min;
  return Number(normalized.toFixed(2));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function extractVideoUrls(payload: unknown): string[] {
  const urls: string[] = [];
  const seen = new Set<unknown>();

  const walk = (value: unknown) => {
    if (!value || seen.has(value)) return;
    if (typeof value === "string") {
      if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:video/")
      ) {
        urls.push(value);
      }
      return;
    }
    if (typeof value !== "object") return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    Object.values(value as Record<string, unknown>).forEach(walk);
  };

  walk(payload);
  return Array.from(new Set(urls));
}

function applyPromptTokens(prompt: string, tokens: Record<string, string>) {
  let output = prompt;
  for (const [key, value] of Object.entries(tokens)) {
    output = output.split(`{{${key}}}`).join(value || "");
  }
  return output.trim();
}

function mutatePrompt(prompt: string, attempt: number) {
  const additions = [
    "Refine continuity, keep subject identity and remove flicker.",
    "Enhance camera movement coherence and preserve style consistency.",
    "Improve lighting readability and keep cinematic depth stable.",
  ];
  const suffix = additions[(attempt - 1) % additions.length];
  return `${prompt} ${suffix}`.trim();
}

async function captureFrameFromVideo(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let timeout: number | null = null;

    const cleanup = () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
      video.pause();
      video.src = "";
    };

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = videoUrl;

    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timeout ao capturar frame do video anterior."));
    }, 12000);

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Nao foi possivel ler o video anterior como referencia."));
    });

    video.addEventListener("loadedmetadata", () => {
      const seekTo = Math.min(0.8, Math.max(0.12, (video.duration || 1) * 0.22));
      video.currentTime = seekTo;
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        const width = 720;
        const height = Math.max(
          400,
          Math.round((width * video.videoHeight) / Math.max(1, video.videoWidth))
        );
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Contexto de canvas indisponivel.");
        }

        context.drawImage(video, 0, 0, width, height);
        const frame = canvas.toDataURL("image/png", 0.92);
        cleanup();
        resolve(frame);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  });
}

async function pollLoopPrediction({
  predictionId,
  shouldStop,
  onStatus,
}: {
  predictionId: string;
  shouldStop: () => boolean;
  onStatus: (status: string) => void;
}) {
  for (let attempt = 0; attempt < 70; attempt += 1) {
    if (shouldStop()) {
      throw new Error("Execucao interrompida pelo usuario.");
    }

    const response = await fetch(`/api/loop-ads/status?id=${encodeURIComponent(predictionId)}`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data?.error === "string"
          ? data.error
          : "Erro ao consultar status da etapa Loop Ads.";
      throw new Error(message);
    }

    const status = typeof data?.status === "string" ? data.status : "processing";
    onStatus(status);

    if (status === "succeeded") {
      const outputs = extractVideoUrls(data?.output);
      if (!outputs.length) {
        throw new Error("Loop concluido sem URL de video no retorno.");
      }
      return outputs;
    }

    if (status === "failed" || status === "canceled") {
      const message =
        typeof data?.error?.message === "string"
          ? data.error.message
          : typeof data?.error === "string"
          ? data.error
          : "Loop Ads falhou durante a execucao.";
      throw new Error(message);
    }

    await sleep(3200);
  }

  throw new Error("Tempo esgotado aguardando o Loop Ads finalizar.");
}

function createDefaultNode(index: number): FlowNode {
  return {
    id: createId("flow"),
    name: `Etapa ${index}`,
    api: "video_api",
    prompt: "",
    provider: "veo",
    aspectRatio: "9:16",
    duration: 6,
    retries: 1,
    continueOnError: false,
    autoPassOutput: true,
    referenceMode: "none",
    referenceUrl: "",
    referenceUpload: "",
    loopPreset: "ecom",
    loopScenes: 5,
    loopSecondsPerScene: 1,
    withProduct: false,
    productSource: "url",
    productUrl: "",
    productUpload: "",
    status: "idle",
    statusText: "Aguardando",
    outputUrl: "",
    error: "",
    renderedPrompt: "",
  };
}

function normalizeNode(raw: Partial<FlowNode>, index: number): FlowNode {
  const base = createDefaultNode(index + 1);
  return {
    ...base,
    ...raw,
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : base.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : base.name,
    prompt: typeof raw.prompt === "string" ? raw.prompt : base.prompt,
    referenceUrl: typeof raw.referenceUrl === "string" ? raw.referenceUrl : "",
    referenceUpload: typeof raw.referenceUpload === "string" ? raw.referenceUpload : "",
    productUrl: typeof raw.productUrl === "string" ? raw.productUrl : "",
    productUpload: typeof raw.productUpload === "string" ? raw.productUpload : "",
    retries: clampNumber(Number(raw.retries ?? base.retries), 0, 4, base.retries),
    duration: clampNumber(Number(raw.duration ?? base.duration), 4, 20, base.duration, 2),
    loopScenes: clampNumber(Number(raw.loopScenes ?? base.loopScenes), 3, 10, base.loopScenes),
    loopSecondsPerScene: clampNumber(
      Number(raw.loopSecondsPerScene ?? base.loopSecondsPerScene),
      0.6,
      3,
      base.loopSecondsPerScene,
      0.1
    ),
    status: "idle",
    statusText: "Aguardando",
    error: "",
  };
}

type LoopFlowStudioProps = {
  canvasOnly?: boolean;
};

export default function LoopFlowStudio({ canvasOnly = false }: LoopFlowStudioProps) {
  const { user } = useAuth();
  const energy = useEnergy();
  const runTokenRef = useRef(0);
  const nodeCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [flowName, setFlowName] = useState("Merse Flow Blueprint");
  const [nodes, setNodes] = useState<FlowNode[]>([createDefaultNode(1), createDefaultNode(2)]);
  const [isRunning, setIsRunning] = useState(false);
  const [flowStatus, setFlowStatus] = useState("Pronto para executar.");
  const [runLog, setRunLog] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");

  const userKey = useMemo(
    () => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined),
    [user?.email, user?.uid]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { flowName?: string; nodes?: Partial<FlowNode>[] };
      if (typeof parsed.flowName === "string" && parsed.flowName.trim()) {
        setFlowName(parsed.flowName.trim());
      }
      if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
        setNodes(parsed.nodes.map((item, index) => normalizeNode(item, index)));
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const payload = {
      flowName,
      nodes: nodes.map((node) => ({
        ...node,
        status: "idle",
        statusText: "Aguardando",
        outputUrl: "",
        error: "",
        renderedPrompt: "",
      })),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }, [flowName, nodes]);

  useEffect(() => {
    if (!nodes.length) {
      setSelectedNodeId("");
      return;
    }

    const hasSelection = nodes.some((node) => node.id === selectedNodeId);
    if (!hasSelection) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  function pushLog(line: string) {
    const timestamp = new Date().toLocaleTimeString();
    setRunLog((prev) => [`${timestamp} • ${line}`, ...prev].slice(0, 80));
  }

  function patchNode(nodeId: string, patch: Partial<FlowNode>) {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)));
  }

  function addNode() {
    setNodes((prev) => [...prev, createDefaultNode(prev.length + 1)]);
  }

  function duplicateNode(nodeId: string) {
    setNodes((prev) => {
      const index = prev.findIndex((node) => node.id === nodeId);
      if (index < 0) return prev;
      const original = prev[index];
      const clone: FlowNode = {
        ...original,
        id: createId("flow"),
        name: `${original.name} copy`,
        status: "idle",
        statusText: "Aguardando",
        outputUrl: "",
        error: "",
      };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  }

  function removeNode(nodeId: string) {
    setNodes((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((node) => node.id !== nodeId);
    });
  }

  function moveNode(nodeId: string, direction: "up" | "down") {
    setNodes((prev) => {
      const index = prev.findIndex((node) => node.id === nodeId);
      if (index < 0) return prev;

      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  async function handleUpload(nodeId: string, field: "referenceUpload" | "productUpload", file: File | null) {
    if (!file) {
      patchNode(nodeId, { [field]: "" } as Partial<FlowNode>);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file).catch(() => "");
    if (!dataUrl) {
      patchNode(nodeId, {
        status: "error",
        statusText: "Erro",
        error: "Nao foi possivel ler o arquivo enviado.",
      });
      return;
    }

    patchNode(nodeId, { [field]: dataUrl } as Partial<FlowNode>);
  }

  function resetFlowRunVisuals() {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        status: "idle",
        statusText: "Aguardando",
        error: "",
        renderedPrompt: "",
      }))
    );
  }

  function stopExecution() {
    runTokenRef.current += 1;
    setIsRunning(false);
    setFlowStatus("Execucao interrompida manualmente.");
    pushLog("Execucao interrompida pelo usuario.");
  }

  async function runFlow() {
    if (!nodes.length || isRunning) return;

    const snapshot = nodes.map((node, index) => normalizeNode(node, index));
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;

    let usageCursor = energy.usage;
    let previousOutputUrl = "";
    let previousFrameCache = "";
    const promptTokens: Record<string, string> = {};

    setIsRunning(true);
    setFlowStatus("Executando pipeline...");
    setRunLog([]);
    resetFlowRunVisuals();
    pushLog(`Flow \"${flowName}\" iniciado com ${snapshot.length} etapa(s).`);

    const shouldStop = () => runTokenRef.current !== token;

    async function resolvePreviousFrame() {
      if (!previousOutputUrl) return "";
      if (previousFrameCache) return previousFrameCache;

      const frame = await captureFrameFromVideo(previousOutputUrl).catch(() => "");
      previousFrameCache = frame || previousOutputUrl;
      return previousFrameCache;
    }

    try {
      for (let index = 0; index < snapshot.length; index += 1) {
        const node = snapshot[index];

        if (shouldStop()) {
          throw new Error("Execucao interrompida pelo usuario.");
        }

        patchNode(node.id, {
          status: "running",
          statusText: "Executando",
          error: "",
          renderedPrompt: "",
        });
        pushLog(`Etapa ${index + 1} (${node.name}) iniciada.`);

        const tokenContext = {
          prev_url: previousOutputUrl,
          ...promptTokens,
        };

        const basePrompt = applyPromptTokens(node.prompt, tokenContext);
        let promptForAttempt = basePrompt;
        let outputUrl = "";
        let lastError = "";

        for (let attempt = 0; attempt <= node.retries; attempt += 1) {
          if (shouldStop()) {
            throw new Error("Execucao interrompida pelo usuario.");
          }

          if (attempt > 0) {
            promptForAttempt = mutatePrompt(basePrompt, attempt);
            patchNode(node.id, {
              statusText: `Retry ${attempt}/${node.retries}`,
            });
            pushLog(`Etapa ${index + 1} em retry ${attempt}/${node.retries}.`);
          }

          try {
            let referenceInput = "";
            if (node.referenceMode === "upload") {
              referenceInput = node.referenceUpload || "";
            } else if (node.referenceMode === "url") {
              referenceInput = node.referenceUrl.trim();
            } else if (node.referenceMode === "previous") {
              patchNode(node.id, { statusText: "Capturando frame da etapa anterior" });
              referenceInput = await resolvePreviousFrame();
            }

            if (node.api === "video_api") {
              if (!promptForAttempt.trim()) {
                throw new Error("A etapa de video exige um prompt valido.");
              }

              if (String(energy.plan) === "free") {
                throw new Error("Plano Free nao permite geracao de video nesta automacao.");
              }

              const stepCost = VIDEO_PROVIDER_COST[node.provider];
              if (usageCursor + stepCost > energy.limit) {
                throw new Error("Energia insuficiente para continuar o flow.");
              }

              const response = await fetch("/api/generate-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: promptForAttempt,
                  provider: node.provider,
                  aspectRatio: node.aspectRatio,
                  duration: node.duration,
                  referenceImage: referenceInput || undefined,
                }),
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(
                  typeof data?.error === "string"
                    ? data.error
                    : "Falha ao gerar video nesta etapa."
                );
              }

              if (typeof data?.videoUrl !== "string" || !data.videoUrl.trim()) {
                throw new Error("API de video nao retornou URL valida.");
              }

              outputUrl = data.videoUrl;
              usageCursor += stepCost;
              energy.registerUsage(stepCost, {
                path: "/gerar-video",
                label: `Flow Studio • ${VIDEO_PROVIDER_LABEL[node.provider]}`,
              });
            } else {
              const stepCost = LOOP_COST;
              if (usageCursor + stepCost > energy.limit) {
                throw new Error("Energia insuficiente para rodar a etapa Loop Ads.");
              }

              let productImage = "";
              if (node.withProduct) {
                if (node.productSource === "url") {
                  productImage = node.productUrl.trim();
                } else if (node.productSource === "upload") {
                  productImage = node.productUpload || "";
                } else {
                  productImage = (await resolvePreviousFrame()) || previousOutputUrl;
                }

                if (!productImage) {
                  throw new Error(
                    "Etapa Loop Ads com produto ativo exige URL/upload ou saida anterior."
                  );
                }
              }

              const loopResponse = await fetch("/api/loop-ads/create", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(user?.uid ? { "x-merse-uid": user.uid } : {}),
                },
                body: JSON.stringify({
                  preset: node.loopPreset,
                  background_mode: LOOP_PRESET_BG[node.loopPreset],
                  element: LOOP_PRESET_ELEMENT[node.loopPreset],
                  scenes: node.loopScenes,
                  seconds_per_scene: node.loopSecondsPerScene,
                  fps: 24,
                  width: 720,
                  height: 1280,
                  particles: true,
                  particle_style: "mixed",
                  motion_intensity: 0.9,
                  loop_fade: 0.35,
                  title: node.name.slice(0, 100) || `Etapa ${index + 1}`,
                  subtitle:
                    promptForAttempt.slice(0, 140) ||
                    "Flow Studio • Loop Ads Auto",
                  text_anim: "fade",
                  with_product: node.withProduct,
                  product_image: node.withProduct ? productImage : undefined,
                  remove_bg: true,
                  batch_count: 1,
                  batch_start: 0,
                }),
              });

              const created = await loopResponse.json().catch(() => ({}));
              if (!loopResponse.ok || typeof created?.id !== "string") {
                throw new Error(
                  typeof created?.error === "string"
                    ? created.error
                    : "Falha ao criar job do Loop Ads nesta etapa."
                );
              }

              patchNode(node.id, { statusText: "Loop job criado, aguardando render" });
              const outputs = await pollLoopPrediction({
                predictionId: created.id,
                shouldStop,
                onStatus: (status) => patchNode(node.id, { statusText: `Loop: ${status}` }),
              });

              outputUrl = outputs[0];
              usageCursor += stepCost;
              energy.registerUsage(stepCost, {
                path: "/gerar-video",
                label: "Flow Studio • Loop Ads",
              });
            }

            break;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Falha inesperada na etapa.";
            lastError = message;

            if (attempt >= node.retries) {
              break;
            }

            await sleep(550);
          }
        }

        if (!outputUrl) {
          patchNode(node.id, {
            status: "error",
            statusText: node.continueOnError ? "Erro (continuando)" : "Erro",
            error: lastError || "Etapa falhou sem detalhe.",
          });
          pushLog(`Etapa ${index + 1} falhou: ${lastError || "erro desconhecido"}.`);

          if (node.continueOnError) {
            continue;
          }

          throw new Error(lastError || `Etapa ${index + 1} falhou.`);
        }

        promptTokens[`step_${index + 1}_url`] = outputUrl;
        if (node.autoPassOutput) {
          previousOutputUrl = outputUrl;
          previousFrameCache = "";
        }

        patchNode(node.id, {
          status: "done",
          statusText: "Concluido",
          outputUrl,
          error: "",
          renderedPrompt: promptForAttempt,
        });
        pushLog(`Etapa ${index + 1} concluida com sucesso.`);

        void appendUserCreations(
          userKey,
          [
            {
              id: generateCreationId("video"),
              type: "video",
              prompt: promptForAttempt || node.prompt,
              createdAt: new Date().toISOString(),
              previewUrl: outputUrl,
              downloadUrl: outputUrl,
              meta: {
                modulo: "loop-flow-studio",
                flowName,
                stepIndex: index + 1,
                api: node.api,
                nodeName: node.name,
              },
            },
          ],
          { userId: user?.uid }
        );
      }

      if (shouldStop()) {
        throw new Error("Execucao interrompida pelo usuario.");
      }

      setFlowStatus("Flow concluido. Todas as etapas processadas.");
      pushLog("Pipeline finalizado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha geral durante a execucao do flow.";
      setFlowStatus(`Flow interrompido: ${message}`);
      pushLog(`Pipeline interrompido: ${message}`);
    } finally {
      setIsRunning(false);
    }
  }

  const estimatedCost = useMemo(() => {
    return nodes.reduce((total, node) => {
      if (node.api === "loop_ads_api") return total + LOOP_COST;
      return total + VIDEO_PROVIDER_COST[node.provider];
    }, 0);
  }, [nodes]);

  const graphState = useMemo(() => {
    const nodeWidth = 250;
    const nodeHeight = 172;
    const colGap = 96;
    const rowGap = 94;
    const columns = Math.min(3, Math.max(1, nodes.length));
    const rows = Math.ceil(nodes.length / columns);
    const layout: GraphNodeLayout[] = nodes.map((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const zigzag = col % 2 === 0 ? 0 : 22;
      return {
        nodeId: node.id,
        index,
        x: 58 + col * (nodeWidth + colGap),
        y: 58 + row * (nodeHeight + rowGap) + zigzag,
        width: nodeWidth,
        height: nodeHeight,
      };
    });

    const width = columns * nodeWidth + Math.max(0, columns - 1) * colGap + 116;
    const height = rows * nodeHeight + Math.max(0, rows - 1) * rowGap + 116;
    return { layout, width, height, nodeWidth, nodeHeight };
  }, [nodes]);

  const layoutByNodeId = useMemo(() => {
    return new Map(graphState.layout.map((item) => [item.nodeId, item] as const));
  }, [graphState.layout]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  return (
    <div className="space-y-5">
      {!canvasOnly ? (
        <div className="rounded-3xl border border-white/10 bg-[#0a0f16]/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Flow Studio</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Automacao Cinematica (n8n-style)</h2>
              <p className="mt-2 text-sm text-white/70">
                Conecte etapas de prompt/video, encadeie saidas, escolha APIs e rode um pipeline completo.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-xs text-white/70">
              Energia: {energy.usage}/{energy.limit} • Estimado: {estimatedCost}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
            <input
              value={flowName}
              onChange={(event) => setFlowName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none"
              placeholder="Nome do blueprint"
            />

            <button
              type="button"
              onClick={addNode}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:bg-white/15"
            >
              + Etapa
            </button>

            <button
              type="button"
              onClick={() => {
                setNodes([createDefaultNode(1)]);
                setRunLog([]);
                setFlowStatus("Blueprint reiniciado.");
              }}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:bg-white/15"
            >
              Novo
            </button>

            <button
              type="button"
              onClick={isRunning ? stopExecution : runFlow}
              className={cn(
                "rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white",
                isRunning
                  ? "border border-red-400/45 bg-red-500/20 hover:bg-red-500/25"
                  : "border border-blue-400/60 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500"
              )}
            >
              {isRunning ? "Parar" : "Rodar flow"}
            </button>

            <button
              type="button"
              onClick={() => {
                const payload = { flowName, nodes };
                const encoded = encodeURIComponent(JSON.stringify(payload));
                const url = `data:application/json;charset=utf-8,${encoded}`;
                const link = document.createElement("a");
                link.href = url;
                link.download = `${flowName.replace(/\s+/g, "-").toLowerCase() || "merse-flow"}.json`;
                link.click();
              }}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:bg-white/15"
            >
              Exportar
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/70">
            <div className="flex flex-wrap items-center gap-2">
              <PiSparkleFill className="text-cyan-300" />
              <span>{flowStatus}</span>
            </div>
            <div className="mt-2 text-[11px] text-white/50">
              Tokens no prompt: <code>{"{{prev_url}}"}</code>, <code>{"{{step_1_url}}"}</code>,
              <code>{" {{step_2_url}}"}</code>...
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-[#0a0f16]/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/70">Canvas Workflow</p>
            <p className="mt-1 text-[11px] text-white/55">
              Clique no no para abrir os detalhes abaixo. Conexoes mostram o fluxo entre etapas.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-xs text-white/70">
            Energia: {energy.usage}/{energy.limit} • Estimado: {estimatedCost}
          </div>
        </div>

        {canvasOnly ? (
          <>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
              <input
                value={flowName}
                onChange={(event) => setFlowName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none"
                placeholder="Nome do blueprint"
              />

              <button
                type="button"
                onClick={addNode}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:bg-white/15"
              >
                + Etapa
              </button>

              <button
                type="button"
                onClick={() => {
                  setNodes([createDefaultNode(1)]);
                  setRunLog([]);
                  setFlowStatus("Blueprint reiniciado.");
                }}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:bg-white/15"
              >
                Novo
              </button>

              <button
                type="button"
                onClick={isRunning ? stopExecution : runFlow}
                className={cn(
                  "rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white",
                  isRunning
                    ? "border border-red-400/45 bg-red-500/20 hover:bg-red-500/25"
                    : "border border-blue-400/60 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500"
                )}
              >
                {isRunning ? "Parar" : "Rodar flow"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const payload = { flowName, nodes };
                  const encoded = encodeURIComponent(JSON.stringify(payload));
                  const url = `data:application/json;charset=utf-8,${encoded}`;
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${flowName.replace(/\s+/g, "-").toLowerCase() || "merse-flow"}.json`;
                  link.click();
                }}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:bg-white/15"
              >
                Exportar
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/70">
              <div className="flex flex-wrap items-center gap-2">
                <PiSparkleFill className="text-cyan-300" />
                <span>{flowStatus}</span>
              </div>
              <div className="mt-2 text-[11px] text-white/50">
                Tokens no prompt: <code>{"{{prev_url}}"}</code>, <code>{"{{step_1_url}}"}</code>,
                <code>{" {{step_2_url}}"}</code>...
              </div>
            </div>
          </>
        ) : null}

        <div className="mt-3 overflow-auto rounded-2xl border border-white/10 bg-[#080b12]">
          <div
            className="relative min-w-[760px]"
            style={{ width: graphState.width, height: graphState.height }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
                backgroundSize: "34px 34px",
              }}
            />

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${graphState.width} ${graphState.height}`}
              fill="none"
            >
              {nodes.slice(0, -1).map((node, index) => {
                const from = layoutByNodeId.get(node.id);
                const to = layoutByNodeId.get(nodes[index + 1].id);
                if (!from || !to) return null;
                return (
                  <path
                    key={`${node.id}-${nodes[index + 1].id}`}
                    d={buildFlowEdgePath(from, to)}
                    stroke={node.autoPassOutput ? "rgba(52,211,153,0.56)" : "rgba(96,165,250,0.56)"}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {graphState.layout.map((layout) => {
              const node = nodes[layout.index];
              const isSelected = node.id === selectedNodeId;
              const preview = resolveNodePreview(node);
              const isPreviewVideo = Boolean(node.outputUrl);

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    const card = nodeCardRefs.current[node.id];
                    card?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={cn(
                    "absolute overflow-hidden rounded-2xl border text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition",
                    isSelected
                      ? "border-cyan-300/70 bg-cyan-500/15"
                      : "border-white/15 bg-black/60 hover:border-white/35 hover:bg-black/50"
                  )}
                  style={{
                    left: layout.x,
                    top: layout.y,
                    width: layout.width,
                    height: layout.height,
                  }}
                >
                  <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-400" />
                  <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-400" />

                  <div className="flex h-full flex-col p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.24em] text-white/75">
                        Etapa {layout.index + 1}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]",
                          node.status === "done"
                            ? "border-emerald-400/45 text-emerald-200"
                            : node.status === "running"
                            ? "border-cyan-400/45 text-cyan-100"
                            : node.status === "error"
                            ? "border-red-400/45 text-red-200"
                            : "border-white/20 text-white/65"
                        )}
                      >
                        {node.api === "video_api" ? "Video" : "Loop"}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-white">{node.name}</p>
                    <p className="line-clamp-1 text-[11px] text-white/55">{node.statusText}</p>

                    <div className="mt-2 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/35">
                      {isPreviewVideo ? (
                        <div className="flex h-full items-center justify-center text-white/50">
                          <PiVideoFill className="text-xl" />
                        </div>
                      ) : preview ? (
                        <img src={preview} alt={node.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.24em] text-white/35">
                          sem preview
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
          {selectedNode ? (
            <>
              <span className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-cyan-100">
                Selecionado: {selectedNode.name}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                API: {selectedNode.api === "video_api" ? "Merse Video API" : "Loop Ads API"}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                Status: {selectedNode.statusText}
              </span>
            </>
          ) : (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              Selecione um no no canvas.
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {nodes.map((node, index) => {
          const isVideoApi = node.api === "video_api";

          return (
            <div
              key={node.id}
              ref={(element) => {
                nodeCardRefs.current[node.id] = element;
              }}
              onClick={() => setSelectedNodeId(node.id)}
              className={cn(
                "cursor-pointer rounded-3xl border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-2xl",
                node.status === "running"
                  ? "border-cyan-400/40 bg-cyan-500/5"
                  : node.status === "done"
                  ? "border-emerald-400/30 bg-emerald-500/5"
                  : node.status === "error"
                  ? "border-red-400/40 bg-red-500/5"
                  : "border-white/10 bg-[#0a0f16]/78",
                selectedNodeId === node.id ? "ring-2 ring-cyan-300/45" : ""
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs text-white/75">
                    Etapa {index + 1}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      node.status === "done"
                        ? "border-emerald-400/35 text-emerald-200"
                        : node.status === "running"
                        ? "border-cyan-400/45 text-cyan-100"
                        : node.status === "error"
                        ? "border-red-400/45 text-red-200"
                        : "border-white/15 text-white/70"
                    )}
                  >
                    {node.statusText}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveNode(node.id, "up")}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveNode(node.id, "down")}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateNode(node.id)}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeNode(node.id)}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/15"
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/65">Nome da etapa</span>
                  <input
                    value={node.name}
                    onChange={(event) => patchNode(node.id, { name: event.target.value })}
                    className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/65">API</span>
                  <select
                    value={node.api}
                    onChange={(event) => patchNode(node.id, { api: event.target.value as FlowApi })}
                    className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                  >
                    <option value="video_api">Merse Video API (/api/generate-video)</option>
                    <option value="loop_ads_api">Loop Ads API (/api/loop-ads/create)</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 grid gap-1">
                <span className="text-xs uppercase tracking-[0.22em] text-white/65">Prompt / instrucao</span>
                <textarea
                  value={node.prompt}
                  onChange={(event) => patchNode(node.id, { prompt: event.target.value })}
                  className="min-h-[96px] rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                  placeholder="Ex.: produto flutuando em macro shot, neon cyan, camera orbitando..."
                />
              </label>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/65">Referencia</span>
                  <select
                    value={node.referenceMode}
                    onChange={(event) =>
                      patchNode(node.id, { referenceMode: event.target.value as ReferenceMode })
                    }
                    className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                  >
                    <option value="none">Sem referencia</option>
                    <option value="upload">Upload</option>
                    <option value="url">URL</option>
                    <option value="previous">Saida da etapa anterior</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/65">Retries</span>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={node.retries}
                    onChange={(event) =>
                      patchNode(node.id, {
                        retries: clampNumber(Number(event.target.value), 0, 4, node.retries),
                      })
                    }
                    className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={node.autoPassOutput}
                    onChange={(event) => patchNode(node.id, { autoPassOutput: event.target.checked })}
                  />
                  Passar saida adiante
                </label>

                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={node.continueOnError}
                    onChange={(event) =>
                      patchNode(node.id, { continueOnError: event.target.checked })
                    }
                  />
                  Continuar se falhar
                </label>
              </div>

              {node.referenceMode === "url" ? (
                <label className="mt-3 grid gap-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/65">URL da referencia</span>
                  <input
                    value={node.referenceUrl}
                    onChange={(event) => patchNode(node.id, { referenceUrl: event.target.value })}
                    className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                    placeholder="https://..."
                  />
                </label>
              ) : null}

              {node.referenceMode === "upload" ? (
                <label className="mt-3 grid gap-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/65">Upload da referencia</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleUpload(node.id, "referenceUpload", event.target.files?.[0] || null)
                    }
                    className="text-xs text-white/80"
                  />
                </label>
              ) : null}

              {isVideoApi ? (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.22em] text-white/65">Provider</span>
                    <select
                      value={node.provider}
                      onChange={(event) =>
                        patchNode(node.id, { provider: event.target.value as ProviderKey })
                      }
                      className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                    >
                      {Object.entries(VIDEO_PROVIDER_LABEL).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.22em] text-white/65">Aspect ratio</span>
                    <select
                      value={node.aspectRatio}
                      onChange={(event) =>
                        patchNode(node.id, { aspectRatio: event.target.value as "16:9" | "9:16" })
                      }
                      className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                    >
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.22em] text-white/65">Duracao</span>
                    <input
                      type="number"
                      min={4}
                      max={20}
                      step={2}
                      value={node.duration}
                      onChange={(event) =>
                        patchNode(node.id, {
                          duration: clampNumber(Number(event.target.value), 4, 20, node.duration, 2),
                        })
                      }
                      className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-1">
                      <span className="text-xs uppercase tracking-[0.22em] text-white/65">Preset Loop</span>
                      <select
                        value={node.loopPreset}
                        onChange={(event) =>
                          patchNode(node.id, {
                            loopPreset: event.target.value as FlowNode["loopPreset"],
                          })
                        }
                        className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                      >
                        <option value="ecom">ecom</option>
                        <option value="cosmic">cosmic</option>
                        <option value="minimal">minimal</option>
                        <option value="premium">premium</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs uppercase tracking-[0.22em] text-white/65">Cenas</span>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={node.loopScenes}
                        onChange={(event) =>
                          patchNode(node.id, {
                            loopScenes: clampNumber(
                              Number(event.target.value),
                              3,
                              10,
                              node.loopScenes
                            ),
                          })
                        }
                        className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs uppercase tracking-[0.22em] text-white/65">Seg/cena</span>
                      <input
                        type="number"
                        min={0.6}
                        max={3}
                        step={0.1}
                        value={node.loopSecondsPerScene}
                        onChange={(event) =>
                          patchNode(node.id, {
                            loopSecondsPerScene: clampNumber(
                              Number(event.target.value),
                              0.6,
                              3,
                              node.loopSecondsPerScene,
                              0.1
                            ),
                          })
                        }
                        className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={node.withProduct}
                      onChange={(event) => patchNode(node.id, { withProduct: event.target.checked })}
                    />
                    Incluir produto na etapa
                  </label>

                  {node.withProduct ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.22em] text-white/65">Fonte do produto</span>
                        <select
                          value={node.productSource}
                          onChange={(event) =>
                            patchNode(node.id, { productSource: event.target.value as ProductSource })
                          }
                          className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                        >
                          <option value="url">URL publica</option>
                          <option value="upload">Upload</option>
                          <option value="previous">Saida da etapa anterior</option>
                        </select>
                      </label>

                      {node.productSource === "url" ? (
                        <label className="grid gap-1 md:col-span-2">
                          <span className="text-xs uppercase tracking-[0.22em] text-white/65">URL do produto</span>
                          <input
                            value={node.productUrl}
                            onChange={(event) =>
                              patchNode(node.id, { productUrl: event.target.value })
                            }
                            className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 outline-none"
                            placeholder="https://..."
                          />
                        </label>
                      ) : null}

                      {node.productSource === "upload" ? (
                        <label className="grid gap-1 md:col-span-2">
                          <span className="text-xs uppercase tracking-[0.22em] text-white/65">Upload do produto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleUpload(node.id, "productUpload", event.target.files?.[0] || null)
                            }
                            className="text-xs text-white/80"
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              {node.error ? (
                <div className="mt-3 rounded-2xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {node.error}
                </div>
              ) : null}

              {node.outputUrl ? (
                <div className="mt-4 grid gap-3 md:grid-cols-[170px_minmax(0,1fr)]">
                  <video
                    src={node.outputUrl}
                    className="aspect-[9/16] w-full rounded-2xl border border-white/10 bg-black/40 object-cover"
                    controls
                    muted
                    playsInline
                  />
                  <div className="space-y-2 text-xs text-white/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                        Output pronto
                      </span>
                      <a
                        href={node.outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/80 hover:bg-white/15"
                      >
                        Abrir video
                      </a>
                    </div>
                    {node.renderedPrompt ? (
                      <p className="rounded-2xl border border-white/10 bg-black/25 p-2 text-[11px] text-white/60">
                        Prompt usado: {node.renderedPrompt}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!canvasOnly ? (
        <div className="rounded-3xl border border-white/10 bg-[#0a0f16]/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
            <PiCodeFill className="text-cyan-300" />
            Log de execucao
          </div>

          <div className="max-h-56 space-y-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-white/65">
            {runLog.length === 0 ? (
              <p className="text-white/50">Nenhuma execucao ainda.</p>
            ) : (
              runLog.map((line) => (
                <p key={line}>{line}</p>
              ))
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1">
              <PiVideoFill /> Video API por etapa
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1">
              <PiCodeFill /> Loop Ads API por etapa
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1">
              <PiCopySimpleFill /> Prompt tokens dinamicos
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1">
              <PiFlameFill /> Auto retries com prompt healing
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1">
              <PiDownloadSimpleFill /> Export JSON blueprint
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1">
              <PiCheckCircleFill /> Encadeamento com frame da etapa anterior
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
