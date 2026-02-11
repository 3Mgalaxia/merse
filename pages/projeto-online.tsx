import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiCodeFill,
  PiFileCodeFill,
  PiFolderOpenFill,
  PiRocketLaunchFill,
  PiSparkleFill,
  PiStopFill,
  PiUploadSimpleFill,
} from "react-icons/pi";

type LoadedProjectSummary = {
  name: string;
  fileCount: number;
  mainFile: string;
  sampleFiles: string[];
  routes: string[];
  loadedAt: string;
};

type RuntimeState = {
  sessionId: string;
  stage: "uploading" | "installing" | "starting" | "ready" | "error" | "stopped";
  url: string;
  port: number;
  fileCount: number;
  logs: string[];
  error: string | null;
  startedAt: number;
  updatedAt: number;
};

type StartRuntimeResponse = {
  sessionId: string;
  stage: RuntimeState["stage"];
  url: string;
  port: number;
};

type RuntimeFileUpload = {
  path: string;
  contentBase64: string;
};

type ConversationItem = {
  id: string;
  role: "user" | "system";
  text: string;
  fileName: string | null;
  createdAt: string;
};

type SelectedElementInfo = {
  componentName: string | null;
  tagName: string;
  id: string | null;
  className: string | null;
  selectorHint: string;
  textPreview: string;
  offsetX: number;
  offsetY: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type RuntimeBridgeMessage = {
  source?: string;
  type?: string;
  payload?: unknown;
};

type PromptAttachmentPayload = {
  name: string;
  mimeType: string;
  size: number;
  contentBase64: string;
};

type BridgePromptPayload = {
  prompt: string;
  attachment?: PromptAttachmentPayload | null;
  componentName?: string | null;
  selectorHint?: string | null;
  textPreview?: string | null;
};

type BridgePromptResultPayload = {
  ok: boolean;
  message: string;
};

type FindComponentResponse = {
  componentName: string;
  files: string[];
};

type EditComponentResponse = {
  ok: true;
  filePath: string;
  message: string;
};

const IGNORED_SEGMENTS = ["node_modules", ".next", ".git", ".turbo", "dist", "build"];
const BRIDGE_SOURCE = "MERSE_RUNTIME_BRIDGE";
const PARENT_SOURCE = "MERSE_PARENT";

function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

function resolveProjectName(paths: string[]) {
  const first = paths[0] ?? "";
  const root = first.split("/").filter(Boolean)[0];
  return root || "Projeto Local";
}

function resolveSharedRoot(paths: string[]) {
  if (!paths.length) return "";
  const firstSegments = paths.map((path) => normalizePath(path).split("/").filter(Boolean)[0] ?? "");
  const candidate = firstSegments[0];
  if (!candidate) return "";
  const allMatch = firstSegments.every((segment) => segment === candidate);
  if (!allMatch) return "";

  const allHaveNestedPath = paths.every((path) => normalizePath(path).includes("/"));
  if (!allHaveNestedPath) return "";
  return candidate;
}

function stripSharedRoot(path: string, sharedRoot: string) {
  if (!sharedRoot) return normalizePath(path);
  const normalized = normalizePath(path);
  const prefix = `${sharedRoot}/`;
  if (normalized === sharedRoot) return normalized;
  if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  return normalized;
}

function detectMainFile(paths: string[]) {
  const priorities = [
    "index.html",
    "src/app/page.tsx",
    "app/page.tsx",
    "pages/index.tsx",
    "src/pages/index.tsx",
    "package.json",
  ];

  const lowerPaths = paths.map((path) => path.toLowerCase());

  for (const priority of priorities) {
    const index = lowerPaths.findIndex((path) => path === priority || path.endsWith(`/${priority}`));
    if (index >= 0) {
      return paths[index];
    }
  }

  return paths[0] ?? "arquivo não identificado";
}

function toRouteFromPagesPath(relativePath: string, prefix: "pages/" | "src/pages/") {
  const path = relativePath.slice(prefix.length);
  const lowerPath = path.toLowerCase();
  if (lowerPath.startsWith("api/")) return null;
  const match = path.match(/^(.*)\.(tsx|ts|jsx|js|mdx)$/i);
  if (!match) return null;
  let route = match[1];
  route = route.replace(/\/index$/i, "");
  route = route.replace(/^index$/i, "");
  route = route.replace(/\[(.+?)\]/g, ":$1");
  return route ? `/${route}` : "/";
}

function toRouteFromAppPath(relativePath: string, prefix: "app/" | "src/app/") {
  const path = relativePath.slice(prefix.length);
  const lowerPath = path.toLowerCase();
  if (!/\/?page\.(tsx|ts|jsx|js|mdx)$/i.test(path)) return null;
  if (lowerPath.startsWith("api/")) return null;
  let route = path.replace(/\/?page\.(tsx|ts|jsx|js|mdx)$/i, "");
  route = route.replace(/\[(.+?)\]/g, ":$1");
  return route ? `/${route}` : "/";
}

function detectProjectRoutes(paths: string[]) {
  const routes = new Set<string>();
  routes.add("/");

  for (const rawPath of paths) {
    const relativePath = normalizePath(rawPath);
    const lower = relativePath.toLowerCase();

    if (lower === "index.html" || lower.endsWith("/index.html")) {
      routes.add("/");
    }

    if (relativePath.startsWith("pages/")) {
      const route = toRouteFromPagesPath(relativePath, "pages/");
      if (route) routes.add(route);
    } else if (relativePath.startsWith("src/pages/")) {
      const route = toRouteFromPagesPath(relativePath, "src/pages/");
      if (route) routes.add(route);
    } else if (relativePath.startsWith("app/")) {
      const route = toRouteFromAppPath(relativePath, "app/");
      if (route) routes.add(route);
    } else if (relativePath.startsWith("src/app/")) {
      const route = toRouteFromAppPath(relativePath, "src/app/");
      if (route) routes.add(route);
    }
  }

  return Array.from(routes).sort((a, b) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });
}

function shouldIgnorePath(path: string) {
  const normalized = normalizePath(path).toLowerCase();
  return IGNORED_SEGMENTS.some(
    (segment) => normalized === segment || normalized.includes(`/${segment}/`) || normalized.startsWith(`${segment}/`),
  );
}

function toStatusLabel(stage: RuntimeState["stage"] | null) {
  if (stage === "uploading") return "Enviando arquivos";
  if (stage === "installing") return "Instalando dependências";
  if (stage === "starting") return "Iniciando npm run dev";
  if (stage === "ready") return "Projeto online";
  if (stage === "stopped") return "Runtime parado";
  if (stage === "error") return "Falha no runtime";
  return "Aguardando";
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = value.split(",");
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error("Não foi possível ler um arquivo da pasta selecionada."));
    };
    reader.readAsDataURL(file);
  });
}

function appendCacheBust(url: string, nonce: number) {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}mersePreview=${nonce}`;
}

export default function ProjetoOnlinePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const runtimeNoteFileRef = useRef<HTMLInputElement | null>(null);
  const stageLogRef = useRef<RuntimeState["stage"] | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const pendingBridgeResponderRef = useRef<{ target: WindowProxy; origin: string } | null>(null);

  const [summary, setSummary] = useState<LoadedProjectSummary | null>(null);
  const [selectedRoute, setSelectedRoute] = useState("/");
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [runtimeDraftText, setRuntimeDraftText] = useState("");
  const [runtimeDraftFile, setRuntimeDraftFile] = useState<File | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([]);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null);
  const [candidateFiles, setCandidateFiles] = useState<string[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [isFindingComponentFiles, setIsFindingComponentFiles] = useState(false);
  const [componentPrompt, setComponentPrompt] = useState("");
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false);
  const [moveStep, setMoveStep] = useState(8);
  const [bridgePromptQueue, setBridgePromptQueue] = useState<BridgePromptPayload | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.setAttribute("mozdirectory", "");
  }, []);

  const handleOpenFinder = () => {
    inputRef.current?.click();
  };

  const stopRuntime = useCallback(async (sessionId: string) => {
    try {
      await fetch("/api/local-runtime/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // ignore stop failures
    }
  }, []);

  const fetchRuntimeStatus = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/local-runtime/status?sessionId=${encodeURIComponent(sessionId)}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = payload?.error || "Não foi possível obter status do runtime.";
        setRuntimeError(message);
        return;
      }

      const payload = (await response.json()) as RuntimeState;
      setRuntime(payload);
      if (payload.error) {
        setRuntimeError(payload.error);
      }
    } catch {
      setRuntimeError("Falha de conexão ao consultar o runtime local.");
    }
  }, []);

  useEffect(() => {
    if (!runtime?.sessionId) return;
    if (runtime.stage === "ready" || runtime.stage === "error" || runtime.stage === "stopped") return;

    const intervalId = setInterval(() => {
      void fetchRuntimeStatus(runtime.sessionId);
    }, 2200);

    return () => clearInterval(intervalId);
  }, [fetchRuntimeStatus, runtime?.sessionId, runtime?.stage]);

  useEffect(() => {
    return () => {
      if (runtime?.sessionId) {
        void stopRuntime(runtime.sessionId);
      }
    };
  }, [runtime?.sessionId, stopRuntime]);

  const statusLabel = useMemo(() => toStatusLabel(runtime?.stage ?? null), [runtime?.stage]);
  const runtimeOrigin = useMemo(() => {
    if (!runtime?.url) return "";
    try {
      return new URL(runtime.url).origin;
    } catch {
      return "";
    }
  }, [runtime?.url]);

  const runtimePreviewUrl = useMemo(() => {
    if (!runtime?.url) return "";
    const base = runtime.url.endsWith("/") ? runtime.url.slice(0, -1) : runtime.url;
    const route = selectedRoute.startsWith("/") ? selectedRoute : `/${selectedRoute}`;
    return appendCacheBust(`${base}${route}`, previewNonce);
  }, [runtime?.url, selectedRoute, previewNonce]);

  const pushConversationItem = useCallback(
    (item: Omit<ConversationItem, "id" | "createdAt">) => {
      const nextItem: ConversationItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toLocaleTimeString("pt-BR"),
        ...item,
      };
      setConversationHistory((previous) => [nextItem, ...previous].slice(0, 120));
    },
    [],
  );

  useEffect(() => {
    if (!runtime?.stage) return;
    if (stageLogRef.current === runtime.stage) return;
    stageLogRef.current = runtime.stage;
    pushConversationItem({
      role: "system",
      text: `Status do runtime: ${toStatusLabel(runtime.stage)}.`,
      fileName: null,
    });
  }, [pushConversationItem, runtime?.stage]);

  useEffect(() => {
    if (!runtimeError) return;
    if (lastErrorRef.current === runtimeError) return;
    lastErrorRef.current = runtimeError;
    pushConversationItem({
      role: "system",
      text: runtimeError,
      fileName: null,
    });
  }, [pushConversationItem, runtimeError]);

  const resetSelectedComponentState = useCallback(() => {
    setSelectedElement(null);
    setCandidateFiles([]);
    setSelectedFilePath("");
    setComponentPrompt("");
  }, []);

  const notifyBridgePromptResult = useCallback((payload: BridgePromptResultPayload) => {
    const responder = pendingBridgeResponderRef.current;
    pendingBridgeResponderRef.current = null;
    if (!responder) return;

    try {
      responder.target.postMessage(
        {
          source: PARENT_SOURCE,
          type: "MERSE_BRIDGE_PROMPT_RESULT",
          payload,
        },
        responder.origin,
      );
    } catch {
      // ignore bridge response failures
    }
  }, []);

  const postBridgeMessage = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      const iframeWindow = previewIframeRef.current?.contentWindow;
      if (!iframeWindow) return;
      iframeWindow.postMessage(
        {
          source: PARENT_SOURCE,
          type,
          payload,
        },
        runtimeOrigin || "*",
      );
    },
    [runtimeOrigin],
  );

  const findComponentFiles = useCallback(
    async (componentName: string) => {
      if (!runtime?.sessionId) return;
      const cleanName = componentName.trim();
      if (!cleanName) return;

      setIsFindingComponentFiles(true);
      try {
        const response = await fetch("/api/local-runtime/find-component", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: runtime.sessionId,
            componentName: cleanName,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | FindComponentResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("files" in payload)) {
          const message =
            payload && "error" in payload && payload.error
              ? payload.error
              : "Não foi possível mapear o componente para arquivos.";
          throw new Error(message);
        }

        setCandidateFiles(payload.files);
        setSelectedFilePath(payload.files[0] ?? "");
        pushConversationItem({
          role: "system",
          text: payload.files.length
            ? `Componente ${cleanName} identificado. Arquivo provável: ${payload.files[0]}.`
            : `Componente ${cleanName} identificado, mas sem arquivo candidato automático.`,
          fileName: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao localizar arquivo do componente.";
        pushConversationItem({
          role: "system",
          text: message,
          fileName: null,
        });
      } finally {
        setIsFindingComponentFiles(false);
      }
    },
    [pushConversationItem, runtime?.sessionId],
  );

  useEffect(() => {
    if (runtime?.stage === "ready") return;
    setIsSelectMode(false);
    resetSelectedComponentState();
  }, [resetSelectedComponentState, runtime?.stage]);

  useEffect(() => {
    if (!runtimeOrigin || runtime?.stage !== "ready") return;

    const handleBridgeMessage = (event: MessageEvent<RuntimeBridgeMessage>) => {
      if (event.origin !== runtimeOrigin) return;
      const data = event.data;
      if (!data || data.source !== BRIDGE_SOURCE || typeof data.type !== "string") return;

      if (data.type === "BRIDGE_READY") {
        if (isSelectMode) {
          postBridgeMessage("MERSE_BRIDGE_SET_MODE", { enabled: true });
        }
        return;
      }

      if (data.type === "MODE_CHANGED") {
        const payload = (data.payload || {}) as { enabled?: unknown };
        setIsSelectMode(Boolean(payload.enabled));
        return;
      }

      if (data.type === "SELECTION_CLEARED") {
        resetSelectedComponentState();
        return;
      }

      if (data.type === "ELEMENT_SELECTED") {
        const payload = (data.payload || {}) as Partial<SelectedElementInfo>;
        const info: SelectedElementInfo = {
          componentName: typeof payload.componentName === "string" ? payload.componentName : null,
          tagName: typeof payload.tagName === "string" ? payload.tagName : "DIV",
          id: typeof payload.id === "string" ? payload.id : null,
          className: typeof payload.className === "string" ? payload.className : null,
          selectorHint: typeof payload.selectorHint === "string" ? payload.selectorHint : "element",
          textPreview: typeof payload.textPreview === "string" ? payload.textPreview : "",
          offsetX: Number(payload.offsetX ?? 0),
          offsetY: Number(payload.offsetY ?? 0),
          rect: {
            x: Number(payload.rect?.x ?? 0),
            y: Number(payload.rect?.y ?? 0),
            width: Number(payload.rect?.width ?? 0),
            height: Number(payload.rect?.height ?? 0),
          },
        };

        setSelectedElement(info);
        setCandidateFiles([]);
        setSelectedFilePath("");

        if (info.componentName) {
          pushConversationItem({
            role: "system",
            text: `Elemento selecionado: ${info.componentName} (${info.selectorHint}).`,
            fileName: null,
          });
          void findComponentFiles(info.componentName);
        } else {
          pushConversationItem({
            role: "system",
            text: `Elemento selecionado (${info.selectorHint}), sem nome de componente React detectado.`,
            fileName: null,
          });
        }
        return;
      }

      if (data.type === "ELEMENT_MOVED") {
        const payload = (data.payload || {}) as Partial<SelectedElementInfo>;
        setSelectedElement((previous) => {
          if (!previous) return previous;
          return {
            ...previous,
            offsetX: Number(payload.offsetX ?? previous.offsetX),
            offsetY: Number(payload.offsetY ?? previous.offsetY),
          };
        });
        return;
      }

      if (data.type === "PANEL_PROMPT_SUBMIT") {
        const payload = (data.payload || {}) as Partial<BridgePromptPayload>;
        const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
        const componentName =
          typeof payload.componentName === "string" && payload.componentName.trim()
            ? payload.componentName.trim()
            : null;
        const selectorHint =
          typeof payload.selectorHint === "string" && payload.selectorHint.trim() ? payload.selectorHint.trim() : null;
        const textPreview =
          typeof payload.textPreview === "string" && payload.textPreview.trim() ? payload.textPreview.trim() : null;
        const rawAttachment = payload.attachment;
        const attachment =
          rawAttachment &&
          typeof rawAttachment === "object" &&
          typeof (rawAttachment as PromptAttachmentPayload).name === "string" &&
          typeof (rawAttachment as PromptAttachmentPayload).mimeType === "string" &&
          typeof (rawAttachment as PromptAttachmentPayload).contentBase64 === "string"
            ? {
                name: (rawAttachment as PromptAttachmentPayload).name,
                mimeType: (rawAttachment as PromptAttachmentPayload).mimeType,
                size: Number((rawAttachment as PromptAttachmentPayload).size || 0),
                contentBase64: (rawAttachment as PromptAttachmentPayload).contentBase64,
              }
            : null;

        if (event.source && typeof (event.source as WindowProxy).postMessage === "function") {
          pendingBridgeResponderRef.current = {
            target: event.source as WindowProxy,
            origin: event.origin,
          };
        }

        setBridgePromptQueue({
          prompt,
          attachment,
          componentName,
          selectorHint,
          textPreview,
        });
      }
    };

    window.addEventListener("message", handleBridgeMessage as EventListener);
    return () => {
      window.removeEventListener("message", handleBridgeMessage as EventListener);
    };
  }, [
    findComponentFiles,
    isSelectMode,
    postBridgeMessage,
    pushConversationItem,
    resetSelectedComponentState,
    runtime?.stage,
    runtimeOrigin,
  ]);

  useEffect(() => {
    if (runtime?.stage !== "ready") return;
    postBridgeMessage("MERSE_BRIDGE_SET_MODE", { enabled: isSelectMode });
  }, [isSelectMode, postBridgeMessage, runtime?.stage]);

  const handlePreviewIframeLoad = () => {
    postBridgeMessage("MERSE_BRIDGE_PING");
    if (isSelectMode) {
      postBridgeMessage("MERSE_BRIDGE_SET_MODE", { enabled: true });
    }
  };

  const moveSelectedInPreview = useCallback(
    (dx: number, dy: number) => {
      if (!selectedElement) return;
      postBridgeMessage("MERSE_BRIDGE_MOVE_SELECTED", { dx, dy });
    },
    [postBridgeMessage, selectedElement],
  );

  const handleClearSelection = () => {
    resetSelectedComponentState();
    postBridgeMessage("MERSE_BRIDGE_CLEAR_SELECTION");
  };

  const applyEditPrompt = useCallback(
    async (
      prompt: string,
      shouldRecordUserPrompt = true,
      attachment: PromptAttachmentPayload | null = null,
      options?: { filePath?: string; componentName?: string; selectorHint?: string; textPreview?: string; routePath?: string },
    ) => {
      if (!runtime?.sessionId) {
        throw new Error("Runtime não disponível.");
      }
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) {
        throw new Error("Digite um prompt para editar o componente.");
      }
      const targetFilePath = options?.filePath?.trim() || selectedFilePath || "";
      const targetComponentName = options?.componentName?.trim() || selectedElement?.componentName || "Componente";
      const targetSelectorHint = options?.selectorHint?.trim() || selectedElement?.selectorHint || "";
      const targetTextPreview = options?.textPreview?.trim() || selectedElement?.textPreview || "";
      const targetRoutePath = options?.routePath?.trim() || selectedRoute || "/";

      setIsApplyingPrompt(true);
      try {
        const body: Record<string, unknown> = {
          sessionId: runtime.sessionId,
          prompt: cleanPrompt,
          componentName: targetComponentName,
          selectorHint: targetSelectorHint,
          textPreview: targetTextPreview,
          routePath: targetRoutePath,
          attachmentName: attachment?.name ?? "",
          attachmentMimeType: attachment?.mimeType ?? "",
          attachmentSize: attachment?.size ?? 0,
          attachmentBase64: attachment?.contentBase64 ?? "",
        };

        if (targetFilePath) {
          body.filePath = targetFilePath;
        }

        const response = await fetch("/api/local-runtime/edit-component", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const payload = (await response.json().catch(() => null)) as
          | EditComponentResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("ok" in payload)) {
          const message =
            payload && "error" in payload && payload.error ? payload.error : "Falha ao aplicar prompt no componente.";
          throw new Error(message);
        }

        if (shouldRecordUserPrompt) {
          pushConversationItem({
            role: "user",
            text: cleanPrompt,
            fileName: attachment?.name || targetFilePath || targetComponentName,
          });
        }

        pushConversationItem({
          role: "system",
          text: payload.message,
          fileName: payload.filePath,
        });

        setPreviewNonce((value) => value + 1);
        await fetchRuntimeStatus(runtime.sessionId);
      } finally {
        setIsApplyingPrompt(false);
      }
    },
    [
      fetchRuntimeStatus,
      pushConversationItem,
      runtime?.sessionId,
      selectedElement?.componentName,
      selectedElement?.selectorHint,
      selectedElement?.textPreview,
      selectedFilePath,
      selectedRoute,
    ],
  );

  const handleBridgePromptSubmit = useCallback(
    async (payload: BridgePromptPayload) => {
      const bridgePrompt = (payload.prompt || "").trim();
      const attachment = payload.attachment ?? null;
      const bridgeComponentName =
        typeof payload.componentName === "string" && payload.componentName.trim() ? payload.componentName.trim() : "";
      const fallbackHint =
        typeof payload.selectorHint === "string" && payload.selectorHint.trim() ? payload.selectorHint.trim() : "";
      const bridgeTextPreview =
        typeof payload.textPreview === "string" && payload.textPreview.trim() ? payload.textPreview.trim() : "";
      const effectiveComponentName = selectedElement?.componentName || bridgeComponentName || "Componente";

      if (!bridgePrompt && !attachment) {
        const message = "Mini aba: escreva um prompt ou anexe um arquivo antes de enviar.";
        pushConversationItem({
          role: "system",
          text: message,
          fileName: null,
        });
        notifyBridgePromptResult({ ok: false, message });
        return;
      }

      if (!selectedFilePath && !bridgeComponentName) {
        const message = `Mini aba: selecione um componente antes de enviar prompt${fallbackHint ? ` (${fallbackHint})` : ""}.`;
        pushConversationItem({
          role: "system",
          text: message,
          fileName: null,
        });
        notifyBridgePromptResult({ ok: false, message });
        return;
      }

      const effectivePrompt = bridgePrompt || "Use o arquivo anexado como referência e atualize o componente selecionado.";

      try {
        await applyEditPrompt(effectivePrompt, true, attachment, {
          filePath: selectedFilePath || undefined,
          componentName: effectiveComponentName,
          selectorHint: fallbackHint || selectedElement?.selectorHint || undefined,
          textPreview: bridgeTextPreview || selectedElement?.textPreview || undefined,
          routePath: selectedRoute,
        });
        notifyBridgePromptResult({ ok: true, message: "Prompt aplicado com sucesso. Atualizando preview..." });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao aplicar prompt da mini aba.";
        pushConversationItem({
          role: "system",
          text: message,
          fileName: null,
        });
        notifyBridgePromptResult({ ok: false, message });
      }
    },
    [
      applyEditPrompt,
      notifyBridgePromptResult,
      pushConversationItem,
      selectedElement?.componentName,
      selectedElement?.selectorHint,
      selectedElement?.textPreview,
      selectedFilePath,
      selectedRoute,
    ],
  );

  useEffect(() => {
    if (!bridgePromptQueue) return;
    void handleBridgePromptSubmit(bridgePromptQueue);
    setBridgePromptQueue(null);
  }, [bridgePromptQueue, handleBridgePromptSubmit]);

  const handleApplyComponentPrompt = async () => {
    try {
      await applyEditPrompt(componentPrompt, true);
      setComponentPrompt("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível editar o componente.";
      pushConversationItem({
        role: "system",
        text: message,
        fileName: null,
      });
    }
  };

  const handlePersistMovedCoordinates = async () => {
    if (!selectedElement) return;
    const componentTitle = selectedElement.componentName || selectedElement.selectorHint || "elemento selecionado";
    const movePrompt = [
      `No componente ${componentTitle}, aplique deslocamento visual permanente.`,
      `Offset X: ${selectedElement.offsetX}px.`,
      `Offset Y: ${selectedElement.offsetY}px.`,
      "Ajuste o JSX/CSS do próprio componente para refletir essa posição sem quebrar responsividade.",
    ].join(" ");

    try {
      await applyEditPrompt(movePrompt, false);
      pushConversationItem({
        role: "system",
        text: "Movimentação salva no código do componente.",
        fileName: selectedFilePath || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar posição no código.";
      pushConversationItem({
        role: "system",
        text: message,
        fileName: null,
      });
    }
  };

  const handleFolderSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const inputElement = event.currentTarget;
    const files = Array.from(inputElement.files ?? []);
    inputElement.value = "";

    if (!files.length) return;

    if (runtime?.sessionId) {
      await stopRuntime(runtime.sessionId);
      setRuntime(null);
    }
    setIsSelectMode(false);
    resetSelectedComponentState();
    setPreviewNonce(0);

    setRuntimeError(null);
    setIsPreparingUpload(true);
    setUploadProgressText("Lendo estrutura da pasta...");

    try {
      const baseCandidates = files
        .map((file) => {
          const relativePath = normalizePath(file.webkitRelativePath || file.name);
          return { file, relativePath };
        })
        .filter((entry) => entry.relativePath && !shouldIgnorePath(entry.relativePath));

      if (!baseCandidates.length) {
        throw new Error("Nenhum arquivo válido encontrado na pasta selecionada.");
      }

      const originalPaths = baseCandidates.map((entry) => entry.relativePath);
      const sharedRoot = resolveSharedRoot(originalPaths);

      const candidates = baseCandidates.map((entry) => ({
        file: entry.file,
        relativePath: stripSharedRoot(entry.relativePath, sharedRoot),
      }));

      const paths = candidates.map((entry) => entry.relativePath);
      const projectName = resolveProjectName(paths);
      const mainFile = detectMainFile(paths);
      const routes = detectProjectRoutes(paths);

      setSelectedRoute(routes[0] ?? "/");

      setSummary({
        name: projectName,
        fileCount: candidates.length,
        mainFile,
        sampleFiles: paths.slice(0, 8),
        routes,
        loadedAt: new Date().toLocaleString("pt-BR"),
      });

      const uploadFiles: RuntimeFileUpload[] = [];

      for (let index = 0; index < candidates.length; index += 1) {
        const current = candidates[index];
        const progress = `${index + 1}/${candidates.length}`;
        setUploadProgressText(`Preparando arquivos (${progress})...`);

        const contentBase64 = await fileToBase64(current.file);
        uploadFiles.push({
          path: current.relativePath,
          contentBase64,
        });
      }

      setUploadProgressText("Enviando projeto para runtime local...");

      const startResponse = await fetch("/api/local-runtime/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          files: uploadFiles,
        }),
      });

      const startPayload = (await startResponse.json().catch(() => null)) as
        | StartRuntimeResponse
        | { error?: string }
        | null;

      if (!startResponse.ok || !startPayload || !("sessionId" in startPayload)) {
        const message =
          startPayload && "error" in startPayload && startPayload.error
            ? startPayload.error
            : "Não foi possível iniciar o runtime do projeto.";
        throw new Error(message);
      }

      const initialRuntime: RuntimeState = {
        sessionId: startPayload.sessionId,
        stage: startPayload.stage,
        url: startPayload.url,
        port: startPayload.port,
        fileCount: candidates.length,
        logs: ["Sessão iniciada. Aguardando instalação e boot do npm run dev..."],
        error: null,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };

      setRuntime(initialRuntime);
      setUploadProgressText("Aguardando o servidor ficar online...");
      await fetchRuntimeStatus(startPayload.sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada ao carregar o projeto.";
      setRuntimeError(message);
      setRuntime(null);
      resetSelectedComponentState();
    } finally {
      setIsPreparingUpload(false);
    }
  };

  const handleStopRuntime = async () => {
    if (!runtime?.sessionId) return;
    await stopRuntime(runtime.sessionId);
    await fetchRuntimeStatus(runtime.sessionId);
    setIsSelectMode(false);
    resetSelectedComponentState();
  };

  const handleRuntimeNoteFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    setRuntimeDraftFile(file);
  };

  const handleAddRuntimeNote = () => {
    const cleanText = runtimeDraftText.trim();
    if (!cleanText && !runtimeDraftFile) return;

    pushConversationItem({
      role: "user",
      text: cleanText || "Arquivo enviado para contexto da conversa.",
      fileName: runtimeDraftFile?.name ?? null,
    });
    setRuntimeDraftText("");
    setRuntimeDraftFile(null);
    if (runtimeNoteFileRef.current) {
      runtimeNoteFileRef.current.value = "";
    }
  };

  return (
    <>
      <Head>
        <title>Projeto Online • Merse</title>
      </Head>

      <main className="relative min-h-screen overflow-hidden bg-[#04050d] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(76,29,149,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(76,29,149,0.28) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(167,139,250,0.16),transparent_38%),radial-gradient(circle_at_78%_78%,rgba(192,132,252,0.16),transparent_44%)]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-10">
          <section className="rounded-2xl border border-violet-300/20 bg-[#100a1d]/88 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-100/85">
              <PiSparkleFill /> Projeto Online
            </div>
            <h1 className="text-2xl font-semibold text-violet-50 md:text-3xl">Rodar projeto pelo site (modo local)</h1>
            <p className="mt-3 max-w-3xl text-sm text-violet-100/75 md:text-base">
              Selecione uma pasta inteira no Finder (ex.: <span className="font-semibold text-violet-100">merse</span>). O sistema envia os
              arquivos, instala dependências e sobe <span className="font-semibold text-violet-100">npm run dev</span> automaticamente para mostrar
              o projeto visualmente em tempo real.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-violet-300/18 bg-[#120b20]/88 p-4">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-100">
                <PiFolderOpenFill />
              </div>
              <p className="text-sm font-semibold text-violet-50">1. Abrir pasta</p>
              <p className="mt-1 text-xs text-violet-100/70">Escolha a pasta raiz do projeto direto no Finder.</p>
            </article>

            <article className="rounded-xl border border-violet-300/18 bg-[#120b20]/88 p-4">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-100">
                <PiRocketLaunchFill />
              </div>
              <p className="text-sm font-semibold text-violet-50">2. Subir runtime</p>
              <p className="mt-1 text-xs text-violet-100/70">Upload, instalação e boot automático do `npm run dev`.</p>
            </article>

            <article className="rounded-xl border border-violet-300/18 bg-[#120b20]/88 p-4">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-100">
                <PiCodeFill />
              </div>
              <p className="text-sm font-semibold text-violet-50">3. Preview visual</p>
              <p className="mt-1 text-xs text-violet-100/70">Visualize as páginas pelo navegador com logs em tempo real.</p>
            </article>
          </section>

          <section className="rounded-2xl border border-violet-300/20 bg-[#100a1d]/88 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-50">Importar Projeto</p>
                <p className="mt-1 text-xs text-violet-100/70">Clique para abrir o Finder e selecionar a pasta completa.</p>
              </div>

              <div className="flex items-center gap-2">
                {runtime?.sessionId ? (
                  <button
                    type="button"
                    onClick={handleStopRuntime}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-300/35 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30"
                  >
                    <PiStopFill className="text-base" /> Parar runtime
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleOpenFinder}
                  disabled={isPreparingUpload}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-300/35 bg-violet-500/25 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/35 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <PiUploadSimpleFill className="text-base" /> Carregar do Finder
                </button>
              </div>
            </div>

            <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFolderSelected} />

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-violet-300/20 bg-[#130d23]/85 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Status runtime</p>
                <p className="mt-2 text-sm font-semibold text-violet-50">{statusLabel}</p>
                {runtime?.url ? (
                  <p className="mt-1 break-all text-xs text-violet-100/65">{runtime.url}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-violet-300/20 bg-[#130d23]/85 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Upload</p>
                <p className="mt-2 text-sm text-violet-100/80">{uploadProgressText ?? "Aguardando pasta..."}</p>
              </div>
              <div className="rounded-lg border border-violet-300/20 bg-[#130d23]/85 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Erro</p>
                <p className="mt-2 text-sm text-rose-200/85">{runtimeError ?? "Sem erros"}</p>
              </div>
            </div>

            {summary ? (
              <div className="mt-6 rounded-xl border border-violet-300/20 bg-[#130d23]/90 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Projeto</p>
                    <p className="mt-1 text-sm font-semibold text-violet-50">{summary.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Arquivos</p>
                    <p className="mt-1 text-sm font-semibold text-violet-50">{summary.fileCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Carregado em</p>
                    <p className="mt-1 text-sm font-semibold text-violet-50">{summary.loadedAt}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Arquivo principal detectado</p>
                  <p className="mt-1 rounded-md border border-violet-300/20 bg-black/20 px-3 py-2 text-xs text-violet-100/85">
                    {summary.mainFile}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Exemplos de arquivos</p>
                  <ul className="mt-2 space-y-1">
                    {summary.sampleFiles.map((path) => (
                      <li
                        key={path}
                        className="truncate rounded-md border border-violet-300/15 bg-black/20 px-3 py-1.5 text-xs text-violet-100/80"
                      >
                        {path}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-violet-100/55">Rotas detectadas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.routes.slice(0, 16).map((route) => (
                      <span
                        key={route}
                        className="rounded-md border border-violet-300/20 bg-black/20 px-2 py-1 text-[11px] text-violet-100/80"
                      >
                        {route}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-xs text-violet-100/60">
                Nenhum projeto carregado ainda. Exemplo: selecione a pasta <span className="font-semibold text-violet-100/80">merse</span> no Finder.
              </p>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <article className="overflow-hidden rounded-2xl border border-violet-300/20 bg-[#0c0816]/90 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-300/15 px-4 py-3">
                <p className="text-sm font-semibold text-violet-50">Preview visual do projeto</p>
                <div className="flex flex-wrap items-center gap-2">
                  {summary?.routes?.length ? (
                    <select
                      value={selectedRoute}
                      onChange={(event) => setSelectedRoute(event.target.value)}
                      className="rounded-md border border-violet-300/25 bg-[#1a1230] px-2 py-1 text-xs text-violet-100 outline-none"
                    >
                      {summary.routes.map((route) => (
                        <option key={route} value={route}>
                          {route}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsSelectMode((value) => !value)}
                    disabled={runtime?.stage !== "ready"}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                      isSelectMode
                        ? "border-violet-300/50 bg-violet-500/30 text-violet-50"
                        : "border-violet-300/25 bg-violet-500/15 text-violet-100"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isSelectMode ? "Selecao ativa" : "Selecionar componente"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    disabled={!selectedElement}
                    className="rounded-md border border-violet-300/25 bg-[#1a1230] px-2 py-1 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Limpar
                  </button>
                  {runtime?.stage === "ready" ? (
                    <button
                      type="button"
                      onClick={() => window.open(runtimePreviewUrl, "_blank")}
                      className="rounded-md border border-violet-300/25 bg-[#1a1230] px-2 py-1 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/20"
                    >
                      Abrir em nova aba
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="border-b border-violet-300/15 bg-[#120b22]/85 p-3">
                <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
                  <div className="rounded-lg border border-violet-300/20 bg-black/25 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-violet-100/55">
                      Componente selecionado no preview
                    </p>
                    <p className="mt-1 text-sm font-semibold text-violet-50">
                      {selectedElement?.componentName ?? "Nenhum componente selecionado"}
                    </p>
                    <p className="mt-1 text-xs text-violet-100/75">
                      {selectedElement
                        ? `Seletor: ${selectedElement.selectorHint} • Offset atual: X ${selectedElement.offsetX}px / Y ${selectedElement.offsetY}px`
                        : "Ative o modo de seleção, clique no elemento no iframe e o sistema tenta identificar o componente automaticamente."}
                    </p>
                    {selectedElement?.textPreview ? (
                      <p className="mt-1 truncate text-xs text-violet-100/60">Texto: {selectedElement.textPreview}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-violet-100/55">API de edição: OpenAI via `.env.local`.</p>

                    <div className="mt-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-violet-100/55">Arquivo candidato</p>
                      {isFindingComponentFiles ? (
                        <p className="mt-1 text-xs text-violet-100/70">Procurando arquivo do componente...</p>
                      ) : candidateFiles.length ? (
                        <select
                          value={selectedFilePath}
                          onChange={(event) => setSelectedFilePath(event.target.value)}
                          className="mt-1 w-full rounded-md border border-violet-300/25 bg-[#1a1230] px-2 py-1.5 text-xs text-violet-100 outline-none"
                        >
                          {candidateFiles.map((filePath) => (
                            <option key={filePath} value={filePath}>
                              {filePath}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-1 text-xs text-violet-100/60">
                          Nenhum arquivo mapeado ainda. O nome do componente aparece no console da API quando detectado.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-violet-300/20 bg-black/25 p-3">
                      <p className="text-xs font-semibold text-violet-100/85">Mover no preview</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-violet-100/80">
                        <label htmlFor="move-step">Passo (px)</label>
                        <input
                          id="move-step"
                          type="number"
                          min={1}
                          max={120}
                          value={moveStep}
                          onChange={(event) => setMoveStep(Math.min(120, Math.max(1, Number(event.target.value || 1))))}
                          className="w-16 rounded border border-violet-300/25 bg-[#1a1230] px-2 py-1 text-xs text-violet-50 outline-none"
                        />
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1">
                        <span />
                        <button
                          type="button"
                          onClick={() => moveSelectedInPreview(0, -moveStep)}
                          disabled={!selectedElement}
                          className="rounded border border-violet-300/25 bg-violet-500/20 px-2 py-1 text-xs font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          ↑
                        </button>
                        <span />
                        <button
                          type="button"
                          onClick={() => moveSelectedInPreview(-moveStep, 0)}
                          disabled={!selectedElement}
                          className="rounded border border-violet-300/25 bg-violet-500/20 px-2 py-1 text-xs font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelectedInPreview(moveStep, 0)}
                          disabled={!selectedElement}
                          className="rounded border border-violet-300/25 bg-violet-500/20 px-2 py-1 text-xs font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          →
                        </button>
                        <span />
                        <button
                          type="button"
                          onClick={() => moveSelectedInPreview(0, moveStep)}
                          disabled={!selectedElement}
                          className="rounded border border-violet-300/25 bg-violet-500/20 px-2 py-1 text-xs font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          ↓
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handlePersistMovedCoordinates}
                        disabled={!selectedElement || !selectedFilePath || isApplyingPrompt}
                        className="mt-2 w-full rounded-md border border-violet-300/30 bg-violet-500/25 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/35 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Salvar posicao no codigo
                      </button>
                    </div>

                    <div className="rounded-lg border border-violet-300/20 bg-black/25 p-3">
                      <p className="text-xs font-semibold text-violet-100/85">Prompt para editar componente</p>
                      <textarea
                        value={componentPrompt}
                        onChange={(event) => setComponentPrompt(event.target.value)}
                        placeholder="Ex.: troque o icone por um foguete e deixe o botao mais minimalista."
                        className="mt-2 h-20 w-full resize-none rounded-md border border-violet-300/20 bg-[#170f27] px-2 py-1.5 text-xs text-violet-50 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyComponentPrompt}
                        disabled={!selectedFilePath || !componentPrompt.trim() || isApplyingPrompt}
                        className="mt-2 w-full rounded-md border border-violet-300/30 bg-violet-500/25 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/35 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isApplyingPrompt ? "Aplicando..." : "Aplicar no codigo"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {runtime?.stage === "ready" ? (
                <iframe
                  ref={previewIframeRef}
                  title="Projeto runtime local"
                  src={runtimePreviewUrl}
                  className="h-[68vh] w-full bg-black"
                  loading="lazy"
                  onLoad={handlePreviewIframeLoad}
                />
              ) : (
                <div className="flex h-[68vh] items-center justify-center p-6 text-center text-sm text-violet-100/65">
                  O preview aparece aqui assim que o runtime concluir a instalação e subir o servidor.
                </div>
              )}
            </article>

            <aside className="rounded-2xl border border-violet-300/20 bg-[#0f0a1b]/90 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
              <p className="mb-3 text-sm font-semibold text-violet-50">Histórico de conversas</p>
              <div className="h-[42vh] overflow-auto rounded-lg border border-violet-300/15 bg-black/30 p-3">
                {conversationHistory.length ? (
                  <div className="space-y-2">
                    {conversationHistory.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-md border p-2 text-[11px] ${
                          item.role === "user"
                            ? "ml-5 border-violet-300/25 bg-violet-500/10 text-violet-50"
                            : "mr-5 border-fuchsia-300/25 bg-fuchsia-500/10 text-fuchsia-50"
                        }`}
                      >
                        <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-violet-200/55">
                          {item.role === "user" ? "Você" : "Sistema"} • {item.createdAt}
                        </p>
                        <p className="whitespace-pre-wrap">{item.text}</p>
                        {item.fileName ? (
                          <p className="mt-1 text-violet-200/75">Arquivo: {item.fileName}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-violet-100/65">
                    Ainda sem conversa. Escreva no campo abaixo para iniciar o histórico.
                  </p>
                )}
              </div>

              <div className="mt-3 rounded-lg border border-violet-300/15 bg-black/20 p-3">
                <p className="text-xs font-semibold text-violet-100/85">Nova mensagem / Arquivo</p>
                <textarea
                  value={runtimeDraftText}
                  onChange={(event) => setRuntimeDraftText(event.target.value)}
                  placeholder="Escreva aqui o que você quer ajustar..."
                  className="mt-2 h-20 w-full resize-none rounded-md border border-violet-300/20 bg-[#170f27] px-2 py-1.5 text-xs text-violet-50 outline-none"
                />

                <input
                  ref={runtimeNoteFileRef}
                  type="file"
                  onChange={handleRuntimeNoteFileChange}
                  className="mt-2 w-full rounded-md border border-violet-300/20 bg-[#170f27] px-2 py-1 text-[11px] text-violet-50/90 file:mr-2 file:rounded file:border-0 file:bg-violet-500/30 file:px-2 file:py-1 file:text-[11px] file:text-violet-100"
                />

                <button
                  type="button"
                  onClick={handleAddRuntimeNote}
                  className="mt-2 w-full rounded-md border border-violet-300/30 bg-violet-500/25 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/35"
                >
                  Enviar para histórico
                </button>
              </div>

              <details className="mt-3 rounded-lg border border-violet-300/15 bg-black/20 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-violet-100/85">
                  Logs técnicos do runtime
                </summary>
                <pre className="mt-2 max-h-[20vh] overflow-auto whitespace-pre-wrap rounded-md border border-violet-300/15 bg-black/35 p-2 text-[10px] leading-5 text-violet-100/80">
                  {(runtime?.logs.length ? runtime.logs.join("\n") : "Aguardando logs do runtime...")}
                </pre>
              </details>
            </aside>
          </section>

          <section className="rounded-xl border border-violet-300/20 bg-[#120b20]/88 p-4 text-xs text-violet-100/70">
            <p className="flex items-center gap-2 font-semibold text-violet-50">
              <PiFileCodeFill /> Observações
            </p>
            <p className="mt-2">
              Pastas como <code>node_modules</code>, <code>.next</code>, <code>.git</code> e <code>dist</code> são ignoradas automaticamente.
              Para funcionar melhor, selecione a raiz real do projeto com <code>package.json</code>.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
