"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useEnergy } from "@/contexts/EnergyContext";
import { db } from "@/lib/firebaseClient";
import {
  appendUserCreations,
  generateCreationId,
  getUserStorageKey,
} from "@/lib/creations";
import LoopFlowStudio from "./LoopFlowStudio";

type Preset = "ecom" | "cosmic" | "minimal" | "premium";
type ElementMode = "none" | "orb" | "chroma_creature" | "mixed";
type ParticleStyle = "dust" | "comet" | "mixed";
type PaletteMode = "auto" | "manual";
type BackgroundMode = "studio_glass" | "cosmic_nebula" | "packshot_studio";
type TextAnim = "none" | "fade" | "slide" | "type";
type Niche = "custom" | "bebidas" | "cosmeticos" | "tech" | "moda" | "servicos";
const COST_PER_LOOP = 26;

type LoopJobConfig = {
  preset?: Preset;
  background_mode?: BackgroundMode;
  element?: ElementMode;
  scenes?: number;
  seconds_per_scene?: number;
  fps?: number;
  width?: number;
  height?: number;
  batch_count?: number;
  seed?: number;
  with_product?: boolean;
};

function clampInt(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampFloat(
  value: number,
  min: number,
  max: number,
  fallback: number,
  precision = 2
) {
  if (!Number.isFinite(value)) return fallback;
  const clamped = Math.min(max, Math.max(min, value));
  return Number(clamped.toFixed(precision));
}

function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

function normalizeOutputUrls(payload: unknown): string[] {
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

function extractErrorMessage(value: unknown, fallback: string) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

/**
 * Opcional: upload do arquivo pro Firebase Storage e retornar URL publica.
 * Se voce ja tem uma funcao de upload no seu projeto, troque esta funcao por ela.
 */
async function uploadToFirebaseStorageIfAvailable(
  file: File
): Promise<string | null> {
  try {
    // Tenta usar firebase client se existir no projeto
    // Voce pode criar lib/firebaseClient.ts e exportar storage/auth la
    const mod = await import("@/lib/firebaseClient").catch(() => null as any);
    if (!mod?.storage) return null;

    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    const path = `merse/loop-ads/products/${Date.now()}-${file.name}`;
    const r = ref(mod.storage, path);
    await uploadBytes(r, file);
    return await getDownloadURL(r);
  } catch {
    return null;
  }
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(new Error("Nao foi possivel ler o arquivo de produto."));
    reader.readAsDataURL(file);
  });
}

/**
 * Opcional: salvar historico no Firestore (se voce tiver Firebase configurado).
 * Se nao tiver, a UI salva no localStorage automaticamente.
 */
async function saveHistoryIfAvailable(entry: any) {
  try {
    const mod = await import("@/lib/firebaseClient").catch(() => null as any);
    if (!mod?.db || !mod?.auth) return false;

    const { addDoc, collection, serverTimestamp } = await import(
      "firebase/firestore"
    );

    const uid = mod.auth.currentUser?.uid ?? null;
    await addDoc(collection(mod.db, "loopAdsJobs"), {
      ...entry,
      uid,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}

type LoopAdsClientProps = {
  embedded?: boolean;
  onClose?: () => void;
};

export default function LoopAdsClient({
  embedded = false,
  onClose,
}: LoopAdsClientProps) {
  const { user } = useAuth();
  const energy = useEnergy();

  const [preset, setPreset] = useState<Preset>("ecom");
  const [niche, setNiche] = useState<Niche>("custom");
  const [backgroundMode, setBackgroundMode] =
    useState<BackgroundMode>("studio_glass");
  const [textAnim, setTextAnim] = useState<TextAnim>("fade");
  const [withProduct, setWithProduct] = useState<boolean>(false);

  const [productUrl, setProductUrl] = useState<string>("");
  const [productFile, setProductFile] = useState<File | null>(null);

  const [title, setTitle] = useState("MERSE");
  const [subtitle, setSubtitle] = useState("Loop Ads Engine");

  const [scenes, setScenes] = useState(5);
  const [secondsPerScene, setSecondsPerScene] = useState(1.0);
  const [fps, setFps] = useState(24);

  const [seedBase, setSeedBase] = useState<number>(0);
  const [variationCount, setVariationCount] = useState<number>(5);

  const [motion, setMotion] = useState(0.9);
  const [loopFade, setLoopFade] = useState(0.35);

  const [particles, setParticles] = useState(true);
  const [particleStyle, setParticleStyle] = useState<ParticleStyle>("mixed");
  const [element, setElement] = useState<ElementMode>("mixed");

  const [reflection, setReflection] = useState<boolean>(true);
  const [reflectionStrength, setReflectionStrength] = useState<number>(0.22);

  const [paletteMode, setPaletteMode] = useState<PaletteMode>("auto");
  const [manualColors, setManualColors] = useState(
    "#00D1FF,#8A2BE2,#FF2BD6,#00FFB2,#FFB200"
  );

  const [width, setWidth] = useState(720);
  const [height, setHeight] = useState(1280);

  const [status, setStatus] = useState<
    "idle" | "uploading" | "creating" | "running" | "done" | "error"
  >("idle");
  const [statusText, setStatusText] = useState<string>("");
  const [predictionId, setPredictionId] = useState<string>("");
  const [outputUrl, setOutputUrl] = useState<string>("");

  const [history, setHistory] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [batchOutputs, setBatchOutputs] = useState<string[]>([]);
  const [autoRank, setAutoRank] = useState(true);
  const [rankingStatus, setRankingStatus] = useState<
    "idle" | "ranking" | "done" | "fallback"
  >("idle");
  const [rankedOutputs, setRankedOutputs] = useState<string[]>([]);
  const [bestOutput, setBestOutput] = useState<string>("");
  const [studioMode] = useState<"loop" | "flow">("flow");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedJobIdRef = useRef<string | null>(null);
  const consumedJobIdsRef = useRef<Set<string>>(new Set());

  const userKey = useMemo(
    () => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined),
    [user?.email, user?.uid]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("merse_loop_ads_history");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const firestore = db;
    if (!jobId || !firestore) return;

    const unsub = onSnapshot(doc(firestore, "loopAdsJobs", jobId), (snap) => {
      const data: any = snap.data();
      if (!data) return;

      if (data.status) {
        setStatusText(`${data.status}`);
      }

      if (data.status === "succeeded") {
        applySucceededJob({
          id: data.id ?? jobId,
          output: data.output,
          config: data.config ?? {},
        });
      }

      if (data.status === "failed" || data.status === "canceled") {
        setStatus("error");
        setStatusText(extractErrorMessage(data.error, "Falhou."));
      }
    });

    return () => unsub();
  }, [jobId]);

  useEffect(() => {
    if (!predictionId || status !== "running") return;

    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/loop-ads/status?id=${encodeURIComponent(predictionId)}`,
          { cache: "no-store" }
        );
        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok) {
          setStatus("error");
          setStatusText(
            typeof data?.error === "string"
              ? data.error
              : "Erro ao consultar status do loop."
          );
          return;
        }

        if (typeof data?.status === "string") {
          setStatusText(data.status);
        }

        if (data?.status === "succeeded") {
          const ok = applySucceededJob({
            id: typeof data?.id === "string" ? data.id : predictionId,
            output: data.output,
            config:
              data?.config && typeof data.config === "object"
                ? (data.config as LoopJobConfig)
                : {},
          });
          if (!ok) {
            setStatus("error");
            setStatusText("Loop concluido sem URL de video no retorno.");
          }
          return;
        }

        if (data?.status === "failed" || data?.status === "canceled") {
          setStatus("error");
          setStatusText(extractErrorMessage(data?.error, "Falhou."));
          return;
        }

        timer = window.setTimeout(poll, 3200);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setStatusText(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao consultar status do loop."
        );
      }
    };

    timer = window.setTimeout(poll, 1200);

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [predictionId, status]);

  useEffect(() => {
    if (!autoRank) return;
    if (!batchOutputs || batchOutputs.length === 0) return;

    let cancelled = false;

    (async () => {
      setRankingStatus("ranking");

      const ranked = await rankOutputs(batchOutputs, {
        withProduct,
        productX: 0.64,
        productY: 0.5,
      }).catch(() => null);

      if (cancelled) return;

      if (!ranked) {
        // fallback: mantem ordem original
        setRankingStatus("fallback");
        setRankedOutputs(batchOutputs);
        setBestOutput(batchOutputs[0]);
        setOutputUrl(batchOutputs[0]);
        return;
      }

      setRankingStatus("done");
      setRankedOutputs(ranked);
      setBestOutput(ranked[0]);
      setOutputUrl(ranked[0]);
      setTimeout(() => videoRef.current?.play().catch(() => {}), 200);
    })();

    return () => {
      cancelled = true;
    };
  }, [batchOutputs, autoRank]);

  useEffect(() => {
    if (autoRank) return;
    setRankingStatus("idle");
    setRankedOutputs([]);
    setBestOutput("");
  }, [autoRank]);

  const safeScenes = useMemo(
    () => clampInt(scenes, 3, 10, 5),
    [scenes]
  );
  const safeSecondsPerScene = useMemo(
    () => clampFloat(secondsPerScene, 0.6, 3, 1, 2),
    [secondsPerScene]
  );
  const safeVariationCount = useMemo(
    () => clampInt(variationCount, 1, 8, 1),
    [variationCount]
  );

  const totalSeconds = useMemo(
    () => Number((safeScenes * safeSecondsPerScene).toFixed(2)),
    [safeScenes, safeSecondsPerScene]
  );

  const singleLoopCost = COST_PER_LOOP;
  const batchLoopCost = useMemo(
    () => COST_PER_LOOP + Math.max(0, safeVariationCount - 1) * 3,
    [safeVariationCount]
  );
  const singleUsageExceeds = useMemo(
    () => energy.usage + singleLoopCost > energy.limit,
    [energy.limit, energy.usage, singleLoopCost]
  );
  const batchUsageExceeds = useMemo(
    () => energy.usage + batchLoopCost > energy.limit,
    [batchLoopCost, energy.limit, energy.usage]
  );

  const isBusy =
    status === "uploading" || status === "creating" || status === "running";

  function computeCostFromConfig(config: LoopJobConfig) {
    const batchCountRaw = Number(config?.batch_count);
    const batchCount = Number.isFinite(batchCountRaw)
      ? Math.min(8, Math.max(1, Math.round(batchCountRaw)))
      : 1;
    return COST_PER_LOOP + Math.max(0, batchCount - 1) * 3;
  }

  function registerUsageAndCreation(
    id: string,
    outputs: string[],
    config: LoopJobConfig
  ) {
    if (!id || consumedJobIdsRef.current.has(id)) return;
    consumedJobIdsRef.current.add(id);

    energy.registerUsage(computeCostFromConfig(config), {
      path: "/gerar-video",
      label: "Loop Ads Engine",
    });

    const records = outputs.slice(0, 4).map((url, index) => ({
      id: generateCreationId("video"),
      type: "video" as const,
      prompt: `${title} - ${subtitle}`,
      createdAt: new Date().toISOString(),
      previewUrl: url,
      downloadUrl: url,
      meta: {
        modulo: "loop-ads",
        batchIndex: index + 1,
        preset: String(config?.preset ?? preset),
        cenario: String(config?.background_mode ?? backgroundMode),
        comProduto: Boolean(config?.with_product ?? withProduct),
        scenes: Number(config?.scenes ?? scenes),
      },
    }));

    void appendUserCreations(userKey, records, { userId: user?.uid });
  }

  function pushHistory(entry: any) {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try {
        localStorage.setItem("merse_loop_ads_history", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function applySucceededJob({
    id,
    output,
    config,
  }: {
    id: string;
    output: unknown;
    config?: LoopJobConfig;
  }) {
    const outputs = normalizeOutputUrls(output);
    if (!outputs.length) return false;
    const cfg = config ?? {};

    setBatchOutputs(outputs);
    setOutputUrl(outputs[0]);
    setStatus("done");
    setStatusText("Pronto (batch).");
    registerUsageAndCreation(id, outputs, cfg);

    if (id && lastSavedJobIdRef.current !== id) {
      lastSavedJobIdRef.current = id;
      const entry = {
        id,
        out: outputs[0],
        preset: cfg.preset ?? preset,
        backgroundMode: cfg.background_mode ?? backgroundMode,
        withProduct: cfg.with_product ?? withProduct,
        title,
        subtitle,
        textAnim,
        scenes: cfg.scenes ?? scenes,
        secondsPerScene: cfg.seconds_per_scene ?? secondsPerScene,
        fps: cfg.fps ?? fps,
        width: cfg.width ?? width,
        height: cfg.height ?? height,
        seedBase: cfg.seed ?? seedBase,
        variation: 0,
        motion,
        loopFade,
        particles,
        particleStyle,
        element: cfg.element ?? element,
        reflection,
        reflectionStrength,
        ts: Date.now(),
      };
      pushHistory(entry);
      saveHistoryIfAvailable(entry);
    }

    setTimeout(() => videoRef.current?.play().catch(() => {}), 200);
    return true;
  }

  async function createLoopJob(payload: Record<string, unknown>) {
    const response = await fetch("/api/loop-ads/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user?.uid ? { "x-merse-uid": user.uid } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Erro ao criar job no Loop Ads Engine."
      );
    }

    return data as {
      id: string;
      status?: string;
      webhook?: string;
      config?: LoopJobConfig;
    };
  }

  function applyNicheTemplate(n: Niche) {
    setNiche(n);
    if (n === "custom") return;
    if (n === "bebidas") {
      setPreset("ecom");
      setBackgroundMode("studio_glass");
      setElement("mixed");
      setParticles(true);
      setParticleStyle("mixed");
      setMotion(0.85);
      setLoopFade(0.35);
      setTitle("Chroma Drink");
      setSubtitle("Refresh - Infinite loop");
    } else if (n === "cosmeticos") {
      setPreset("premium");
      setBackgroundMode("packshot_studio");
      setElement("orb");
      setParticles(false);
      setMotion(0.92);
      setLoopFade(0.38);
      setTitle("Glow Serum");
      setSubtitle("Luxury loop ad");
    } else if (n === "tech") {
      setPreset("premium");
      setBackgroundMode("studio_glass");
      setElement("orb");
      setParticles(true);
      setParticleStyle("comet");
      setMotion(0.95);
      setLoopFade(0.35);
      setTitle("Neo Tech");
      setSubtitle("Ultra clean motion");
    } else if (n === "moda") {
      setPreset("ecom");
      setBackgroundMode("cosmic_nebula");
      setElement("chroma_creature");
      setParticles(true);
      setParticleStyle("mixed");
      setMotion(0.88);
      setLoopFade(0.35);
      setTitle("Drop Collection");
      setSubtitle("New season - loop");
    } else if (n === "servicos") {
      setPreset("minimal");
      setBackgroundMode("studio_glass");
      setElement("none");
      setParticles(false);
      setMotion(0.6);
      setLoopFade(0.3);
      setTitle("Your Brand");
      setSubtitle("Clean loop banner");
    }
  }

  async function resolveProductUrl(): Promise<string | null> {
    let finalProductUrl = productUrl.trim();

    // Se produto ativado e tem arquivo, tenta upar no Firebase
    if (withProduct && productFile) {
      if (productFile.size > 8 * 1024 * 1024) {
        setStatus("error");
        setStatusText("Use arquivo de produto ate 8MB para gerar o loop.");
        return null;
      }

      setStatus("uploading");
      setStatusText("Enviando produto...");
      const up = await uploadToFirebaseStorageIfAvailable(productFile);

      if (up) {
        finalProductUrl = up;
        setProductUrl(up);
      } else {
        const inline = await readFileAsDataUrl(productFile).catch(() => "");
        if (inline.startsWith("data:image/")) {
          finalProductUrl = inline;
        } else {
          // Se nao tem Firebase, o usuario precisa fornecer URL publica manual
          setStatus("error");
          setStatusText(
            "Upload nao disponivel. Cole uma URL publica do produto (ou configure Firebase Storage)."
          );
          return null;
        }
      }
    }

    if (withProduct && !finalProductUrl) {
      setStatus("error");
      setStatusText("Faltou a URL publica do produto.");
      return null;
    }

    return finalProductUrl;
  }

  function normalizeLoopInputs() {
    const normalized = {
      scenes: clampInt(scenes, 3, 10, 5),
      secondsPerScene: clampFloat(secondsPerScene, 0.6, 3, 1, 2),
      fps: clampInt(fps, 12, 60, 24),
      width: clampInt(width, 512, 1080, 720),
      height: clampInt(height, 512, 1920, 1280),
      motion: clampFloat(motion, 0, 1, 0.9, 2),
      loopFade: clampFloat(loopFade, 0.1, 0.8, 0.35, 2),
      reflectionStrength: clampFloat(reflectionStrength, 0, 0.8, 0.22, 2),
      seed: clampInt(seedBase, 0, 2_147_483_647, 0),
      variationCount: clampInt(variationCount, 1, 8, 1),
    };

    if (normalized.scenes !== scenes) setScenes(normalized.scenes);
    if (normalized.secondsPerScene !== secondsPerScene) {
      setSecondsPerScene(normalized.secondsPerScene);
    }
    if (normalized.fps !== fps) setFps(normalized.fps);
    if (normalized.width !== width) setWidth(normalized.width);
    if (normalized.height !== height) setHeight(normalized.height);
    if (normalized.motion !== motion) setMotion(normalized.motion);
    if (normalized.loopFade !== loopFade) setLoopFade(normalized.loopFade);
    if (normalized.reflectionStrength !== reflectionStrength) {
      setReflectionStrength(normalized.reflectionStrength);
    }
    if (normalized.variationCount !== variationCount) {
      setVariationCount(normalized.variationCount);
    }

    return normalized;
  }

  async function handleGenerate() {
    if (singleUsageExceeds) {
      setStatus("error");
      setStatusText("Energia insuficiente para criar novo loop.");
      return;
    }

    setOutputUrl("");
    setPredictionId("");
    setJobId("");
    setBatchOutputs([]);
    setRankedOutputs([]);
    setBestOutput("");
    setRankingStatus("idle");
    setStatus("creating");
    setStatusText("Preparando...");

    const normalized = normalizeLoopInputs();
    const finalProductUrl = await resolveProductUrl();
    if (withProduct && !finalProductUrl) return;

    setStatus("creating");
    setStatusText("Criando job no Replicate...");

    const payload: any = {
      preset,
      background_mode: backgroundMode,
      with_product: withProduct,
      product_image: withProduct ? finalProductUrl || undefined : undefined,
      remove_bg: true,

      title,
      subtitle,
      text_anim: textAnim,

      scenes: normalized.scenes,
      seconds_per_scene: normalized.secondsPerScene,
      fps: normalized.fps,
      width: normalized.width,
      height: normalized.height,

      seed: normalized.seed,
      batch_count: 1,
      batch_start: 0,

      motion_intensity: normalized.motion,
      loop_fade: normalized.loopFade,

      particles,
      particle_style: particleStyle,
      element,

      reflection,
      reflection_strength: normalized.reflectionStrength,

      palette_mode: paletteMode,
      manual_colors: paletteMode === "manual" ? manualColors : undefined,
    };

    try {
      const created = await createLoopJob(payload);
      setPredictionId(created.id);
      setJobId(created.id);
      setStatus("running");
      setStatusText(
        created.webhook === "disabled"
          ? "Gerando video (polling ativo)..."
          : "Gerando video..."
      );
    } catch (error) {
      setStatus("error");
      setStatusText(
        error instanceof Error
          ? error.message
          : "Erro ao criar prediction."
      );
    }
  }

  async function handleGenerateVariations() {
    if (batchUsageExceeds) {
      setStatus("error");
      setStatusText("Energia insuficiente para gerar variacoes.");
      return;
    }

    setOutputUrl("");
    setPredictionId("");
    setJobId("");
    setBatchOutputs([]);
    setRankedOutputs([]);
    setBestOutput("");
    setRankingStatus("idle");

    const normalized = normalizeLoopInputs();

    // se seedBase = 0, cria uma seed automatica (pra variacoes consistentes)
    const baseSeed =
      normalized.seed > 0
        ? normalized.seed
        : Math.floor(Date.now() % 1000000000);
    setSeedBase(baseSeed);

    setStatus("creating");
    setStatusText("Criando batch...");

    const finalProductUrl = await resolveProductUrl();
    if (withProduct && !finalProductUrl) return;

    try {
      const created = await createLoopJob({
        preset,
        background_mode: backgroundMode,
        element,
        particles,
        particle_style: particleStyle,

        scenes: normalized.scenes,
        seconds_per_scene: normalized.secondsPerScene,
        fps: normalized.fps,
        width: normalized.width,
        height: normalized.height,
        motion_intensity: normalized.motion,
        loop_fade: normalized.loopFade,

        with_product: withProduct,
        remove_bg: true,
        product_image: withProduct ? finalProductUrl || undefined : undefined,

        title,
        subtitle,
        palette_mode: paletteMode,
        manual_colors: paletteMode === "manual" ? manualColors : undefined,

        reflection,
        reflection_strength: normalized.reflectionStrength,
        text_anim: textAnim,

        seed: baseSeed,
        batch_count: normalized.variationCount,
        batch_start: 0,
      });
      setPredictionId(created.id);
      setJobId(created.id);
      setStatus("running");
      setStatusText(
        created.webhook === "disabled"
          ? "Gerando (batch, polling ativo)..."
          : "Gerando (batch)..."
      );
    } catch (error) {
      setStatus("error");
      setStatusText(
        error instanceof Error ? error.message : "Erro ao criar batch."
      );
    }
  }

  function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
  }

  function luminance(r: number, g: number, b: number) {
    // Rec.709
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function scoreImageData(
    img: ImageData,
    opts: { withProduct: boolean; productX: number; productY: number }
  ) {
    const { data, width, height } = img;

    // Global metrics
    let sum = 0;
    let sum2 = 0;

    // Edge density (sharpness proxy)
    let edges = 0;
    let samples = 0;

    // Text region (left/top)
    const tx1 = Math.floor(width * 0.08);
    const ty1 = Math.floor(height * 0.18);
    const tx2 = Math.floor(width * 0.58);
    const ty2 = Math.floor(height * 0.36);

    // Product region (near productX/Y)
    const px = Math.floor(width * opts.productX);
    const py = Math.floor(height * opts.productY);
    const pw = Math.floor(width * 0.3);
    const ph = Math.floor(height * 0.36);
    const px1 = Math.max(0, px - Math.floor(pw / 2));
    const py1 = Math.max(0, py - Math.floor(ph / 2));
    const px2 = Math.min(width, px1 + pw);
    const py2 = Math.min(height, py1 + ph);

    // Text legibility
    let textMean = 0;
    let textVar = 0;
    let textN = 0;

    // Product presence via edges
    let prodEdges = 0;
    let prodN = 0;

    // Downsample step
    const step = 3;

    const lumAt = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return luminance(data[i], data[i + 1], data[i + 2]);
    };

    for (let y = 0; y < height - step; y += step) {
      for (let x = 0; x < width - step; x += step) {
        const L = lumAt(x, y);
        sum += L;
        sum2 += L * L;

        // Edge: neighbor diffs
        const Lx = lumAt(x + step, y);
        const Ly = lumAt(x, y + step);
        const g = Math.abs(L - Lx) + Math.abs(L - Ly);
        if (g > 0.08) edges++;

        samples++;

        if (x >= tx1 && x < tx2 && y >= ty1 && y < ty2) {
          textMean += L;
          textVar += L * L;
          textN++;
        }

        if (opts.withProduct && x >= px1 && x < px2 && y >= py1 && y < py2) {
          if (g > 0.08) prodEdges++;
          prodN++;
        }
      }
    }

    const mean = sum / Math.max(1, samples);
    const var_ = sum2 / Math.max(1, samples) - mean * mean;
    const std = Math.sqrt(Math.max(0, var_));

    // Exposure penalties
    const over = mean > 0.78 ? mean - 0.78 : 0;
    const under = mean < 0.18 ? 0.18 - mean : 0;
    const exposurePenalty = (over + under) * 2.2;

    const tMean = textMean / Math.max(1, textN);
    const tVar = textVar / Math.max(1, textN) - tMean * tMean;
    const tStd = Math.sqrt(Math.max(0, tVar));
    const textScore = clamp01((tStd - 0.05) / 0.18);

    const edgeDensity = edges / Math.max(1, samples);
    const sharpnessScore = clamp01((edgeDensity - 0.015) / 0.06);

    let productScore = 0.5;
    if (opts.withProduct) {
      const pEdgeDensity = prodEdges / Math.max(1, prodN);
      productScore = clamp01((pEdgeDensity - 0.012) / 0.06);
    }

    const score =
      std * 1.2 +
      textScore * 0.9 +
      sharpnessScore * 0.7 +
      productScore * (opts.withProduct ? 0.9 : 0.0) -
      exposurePenalty;

    return score;
  }

  async function grabFrameAndScore(
    url: string,
    opts: { withProduct: boolean; productX: number; productY: number }
  ) {
    return new Promise<number>((resolve, reject) => {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = url;

      const cleanup = () => {
        v.pause();
        v.src = "";
      };

      v.addEventListener("error", () => {
        cleanup();
        reject(new Error("video_error"));
      });

      v.addEventListener("loadedmetadata", async () => {
        try {
          const t = Math.min(0.6, Math.max(0.05, (v.duration || 1) * 0.15));
          v.currentTime = t;
        } catch (e) {
          cleanup();
          reject(e);
        }
      });

      v.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          const w = 240;
          const h = Math.round((w * v.videoHeight) / Math.max(1, v.videoWidth));
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("no_ctx");
          ctx.drawImage(v, 0, 0, w, h);

          const img = ctx.getImageData(0, 0, w, h);
          const score = scoreImageData(img, opts);

          cleanup();
          resolve(score);
        } catch (e) {
          cleanup();
          reject(e);
        }
      });
    });
  }

  async function rankOutputs(
    urls: string[],
    opts: { withProduct: boolean; productX: number; productY: number }
  ) {
    const results = await Promise.allSettled(
      urls.map(async (u) => ({ url: u, score: await grabFrameAndScore(u, opts) }))
    );

    const ok = results
      .filter(
        (r): r is PromiseFulfilledResult<{ url: string; score: number }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    if (ok.length < Math.max(1, Math.floor(urls.length * 0.6))) {
      return null;
    }

    ok.sort((a, b) => b.score - a.score);
    return ok.map((x) => x.url);
  }

  const gallery = rankedOutputs.length ? rankedOutputs : batchOutputs;
  const isFlowStudioMode = studioMode === "flow";
  const canvasGridPattern =
    "linear-gradient(rgba(51,65,85,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,0.28) 1px, transparent 1px)";
  const shellClassName = cn(
    "relative text-white",
    embedded
      ? isFlowStudioMode
        ? "min-h-[calc(100vh-8.5rem)]"
        : "overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6"
      : "min-h-screen bg-black px-6 pb-20 pt-28"
  );

  return (
    <div className={shellClassName}>
      {embedded && isFlowStudioMode ? (
        <>
          <div className="pointer-events-none fixed inset-0 -z-20 bg-[#04070d]" />
          <div
            className="pointer-events-none fixed inset-0 -z-20 opacity-[0.72]"
            style={{
              backgroundImage: canvasGridPattern,
              backgroundSize: "40px 40px",
            }}
          />
          <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_48%_15%,rgba(14,165,233,0.14),transparent_44%),radial-gradient(circle_at_50%_85%,rgba(37,99,235,0.12),transparent_58%)]" />
        </>
      ) : !embedded ? (
        <>
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_60%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.22),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_30%_30%,rgba(129,140,248,0.32),transparent_60%),radial-gradient(circle_at_70%_40%,rgba(236,72,153,0.28),transparent_60%)] blur-3xl opacity-80" />
        </>
      ) : null}

      <div
        className={cn(
          "relative mx-auto",
          isFlowStudioMode
            ? "w-full max-w-[1400px] px-2 py-2 sm:px-3 sm:py-3"
            : embedded
              ? "max-w-6xl px-0 py-0"
              : "max-w-6xl px-4 py-8"
        )}
      >
        {isFlowStudioMode ? (
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-[24px]">
            <div className="absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_50%_6%,rgba(14,165,233,0.1),transparent_40%),radial-gradient(circle_at_80%_76%,rgba(30,64,175,0.12),transparent_52%)]" />
            <div
              className="absolute inset-0 rounded-[24px] opacity-[0.62]"
              style={{
                backgroundImage: canvasGridPattern,
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {embedded ? (
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/75">
              Loop Ads
            </span>
          ) : (
            <Link
              href="/gerar"
              className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/75 transition hover:border-white/40 hover:bg-white/20 hover:text-white"
            >
              Voltar
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-xs text-white/70">
              Energia: {energy.usage}/{energy.limit} • Loop: {singleLoopCost} créditos • Batch:{" "}
              {batchLoopCost}
            </div>
            {embedded && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:bg-white/20 hover:text-white"
              >
                Fechar aba
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Loop Automation Studio</h1>
              <p className="text-sm text-white/70">
                Sistema de automacao com etapas encadeadas, prompt + imagem + escolha de API por no.
              </p>
            </div>
            <div className="rounded-full border border-blue-400/45 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
              Flow-first mode
            </div>
          </div>

          <div className="text-xs text-white/70">
            Status: <span className="text-white">Modo automacao ativo</span> • Prompt chaining • Retry • Multi API
          </div>
        </div>

        {studioMode === "flow" ? (
          <div className="mt-6">
            <LoopFlowStudio />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
          {/* Preview */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Preview</div>
              {outputUrl ? (
                <a
                  href={outputUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-white/80 hover:text-white underline"
                >
                  Baixar MP4
                </a>
              ) : null}
            </div>

            <div className="mt-3 aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {outputUrl ? (
                <video
                  ref={videoRef}
                  src={outputUrl}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  controls
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/50">
                  Gere um video para aparecer aqui.
                </div>
              )}
            </div>
            {bestOutput && outputUrl === bestOutput ? (
              <div className="mt-2 text-xs text-white/60">
                Best ranked
              </div>
            ) : null}

            {gallery.length > 0 ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Variacoes</div>
                  <div className="flex items-center gap-3 text-xs text-white/70">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoRank}
                        onChange={(e) => setAutoRank(e.target.checked)}
                      />
                      Auto-rank
                    </label>
                    <span>
                      {rankingStatus === "ranking"
                        ? "ranking..."
                        : rankingStatus === "done"
                        ? "rank ok"
                        : rankingStatus === "fallback"
                        ? "fallback"
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {gallery.map((url, idx) => {
                    const isBest = bestOutput ? url === bestOutput : idx === 0;
                    return (
                      <button
                        key={url}
                        onClick={() => {
                          setOutputUrl(url);
                          setTimeout(
                            () => videoRef.current?.play().catch(() => {}),
                            200
                          );
                        }}
                        className={[
                          "relative rounded-2xl border bg-white/5 p-2 text-left hover:bg-white/10",
                          isBest
                            ? "border-white/40 ring-2 ring-white/20"
                            : "border-white/10",
                        ].join(" ")}
                      >
                        {isBest ? (
                          <div className="absolute left-2 top-2 rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">
                            BEST
                          </div>
                        ) : null}

                        <video
                          src={url}
                          className="aspect-[9/16] w-full rounded-xl object-cover"
                          muted
                          playsInline
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Historico */}
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Historico</div>
              <div className="grid grid-cols-1 gap-2">
                {history.length === 0 ? (
                  <div className="text-sm text-white/60">
                    Sem historico ainda.
                  </div>
                ) : (
                  history.map((h, idx) => (
                    <button
                      key={h.id + idx}
                      onClick={() => {
                        setPreset(h.preset);
                        setBackgroundMode(h.backgroundMode ?? backgroundMode);
                        setWithProduct(h.withProduct);
                        setTitle(h.title);
                        setSubtitle(h.subtitle);
                        setTextAnim(h.textAnim ?? textAnim);
                        setScenes(h.scenes);
                        setSecondsPerScene(h.secondsPerScene);
                        setFps(h.fps);
                        setWidth(h.width);
                        setHeight(h.height);
                        setSeedBase(h.seedBase ?? seedBase);
                        setMotion(h.motion);
                        setLoopFade(h.loopFade);
                        setParticles(h.particles);
                        setParticleStyle(h.particleStyle);
                        setElement(h.element);
                        setReflection(h.reflection ?? reflection);
                        setReflectionStrength(
                          h.reflectionStrength ?? reflectionStrength
                        );
                        setOutputUrl(h.out);
                        setStatus("done");
                        setStatusText("Carregado do historico.");
                        setTimeout(
                          () => videoRef.current?.play().catch(() => {}),
                          200
                        );
                      }}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                    >
                      <div className="text-xs text-white/60">
                        {new Date(h.ts).toLocaleString()}
                      </div>
                      <div className="text-sm">
                        <span className="text-white">{h.preset}</span>{" "}
                        <span className="text-white/60">
                          - {h.scenes} cenas - {h.secondsPerScene}s -{" "}
                          {h.width}x{h.height}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="text-sm font-medium">Configuracoes</div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-white/70">Nicho (template)</span>
                <select
                  value={niche}
                  onChange={(e) => applyNicheTemplate(e.target.value as Niche)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                >
                  <option value="custom">custom</option>
                  <option value="bebidas">bebidas</option>
                  <option value="cosmeticos">cosmeticos</option>
                  <option value="tech">tech</option>
                  <option value="moda">moda</option>
                  <option value="servicos">servicos</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Preset</span>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as Preset)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                >
                  <option value="ecom">ecom (ads/landing)</option>
                  <option value="cosmic">cosmic (Merse vibes)</option>
                  <option value="minimal">minimal (limpo)</option>
                  <option value="premium">premium (glow)</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Cenario</span>
                <select
                  value={backgroundMode}
                  onChange={(e) =>
                    setBackgroundMode(e.target.value as BackgroundMode)
                  }
                  className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                >
                  <option value="studio_glass">studio_glass</option>
                  <option value="cosmic_nebula">cosmic_nebula</option>
                  <option value="packshot_studio">packshot_studio</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Titulo</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Subtitulo</span>
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Texto animado</span>
                <select
                  value={textAnim}
                  onChange={(e) => setTextAnim(e.target.value as TextAnim)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                >
                  <option value="fade">fade</option>
                  <option value="slide">slide</option>
                  <option value="type">type</option>
                  <option value="none">none</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-white/70">Cenas</span>
                  <input
                    type="number"
                    value={scenes}
                    onChange={(e) => setScenes(Number(e.target.value))}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-white/70">Seg/cena</span>
                  <input
                    type="number"
                    step="0.1"
                    value={secondsPerScene}
                    onChange={(e) => setSecondsPerScene(Number(e.target.value))}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  />
                </label>
              </div>

              <div className="text-xs text-white/60">
                Total: <span className="text-white">{totalSeconds}s</span>
                {" "}(ex.: 5 cenas x 1s = 5s)
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-white/70">FPS</span>
                  <input
                    type="number"
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-white/70">Resolucao</span>
                  <select
                    value={`${width}x${height}`}
                    onChange={(e) => {
                      const [w, h] = e.target.value.split("x").map(Number);
                      setWidth(w);
                      setHeight(h);
                    }}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  >
                    <option value="720x1280">720x1280 (leve)</option>
                    <option value="1080x1920">1080x1920 (pesado)</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Motion</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={motion}
                  onChange={(e) => setMotion(Number(e.target.value))}
                />
                <span className="text-xs text-white/60">
                  {motion.toFixed(2)}
                </span>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Loop fade (seamless)</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.01"
                  value={loopFade}
                  onChange={(e) => setLoopFade(Number(e.target.value))}
                />
                <span className="text-xs text-white/60">
                  {loopFade.toFixed(2)}s
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-white/70">Elemento passando</span>
                  <select
                    value={element}
                    onChange={(e) => setElement(e.target.value as ElementMode)}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  >
                  <option value="mixed">mixed</option>
                  <option value="orb">orb</option>
                  <option value="chroma_creature">chroma_creature</option>
                  <option value="none">none</option>
                </select>
              </label>

                <label className="grid gap-1">
                  <span className="text-xs text-white/70">Particulas</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={particles}
                      onChange={(e) => setParticles(e.target.checked)}
                    />
                    <select
                      value={particleStyle}
                      onChange={(e) =>
                        setParticleStyle(e.target.value as ParticleStyle)
                      }
                      disabled={!particles}
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none disabled:opacity-50"
                    >
                      <option value="mixed">mixed</option>
                      <option value="dust">dust</option>
                      <option value="comet">comet</option>
                    </select>
                  </div>
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-xs text-white/70">Paleta</span>
                <select
                  value={paletteMode}
                  onChange={(e) => setPaletteMode(e.target.value as PaletteMode)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                >
                  <option value="auto">auto (puxa do produto)</option>
                  <option value="manual">manual</option>
                </select>
              </label>

              {paletteMode === "manual" ? (
                <label className="grid gap-1">
                  <span className="text-xs text-white/70">Cores (hex)</span>
                  <input
                    value={manualColors}
                    onChange={(e) => setManualColors(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                  />
                  <span className="text-xs text-white/60">
                    Ex.: #00D1FF,#8A2BE2,#FF2BD6,#00FFB2,#FFB200
                  </span>
                </label>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Reflexo do produto</div>
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={reflection}
                      onChange={(e) => setReflection(e.target.checked)}
                    />
                    Ativar
                  </label>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-white/70">Intensidade</span>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.01"
                    value={reflectionStrength}
                    onChange={(e) =>
                      setReflectionStrength(Number(e.target.value))
                    }
                    className="w-full"
                    disabled={!reflection}
                  />
                  <div className="text-xs text-white/60">
                    {reflectionStrength.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="text-sm font-medium">Variacoes</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs text-white/70">Seed base</span>
                    <input
                      type="number"
                      value={seedBase}
                      onChange={(e) => setSeedBase(Number(e.target.value))}
                      className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-white/70">Qtd</span>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={variationCount}
                      onChange={(e) => setVariationCount(Number(e.target.value))}
                      className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                    />
                  </label>
                </div>

                <button
                  onClick={handleGenerateVariations}
                  disabled={isBusy || batchUsageExceeds}
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                >
                  Gerar variacoes
                </button>
              </div>

              <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Produto</div>
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={withProduct}
                      onChange={(e) => setWithProduct(e.target.checked)}
                    />
                    Ativar
                  </label>
                </div>

                {withProduct ? (
                  <div className="mt-3 grid gap-3">
                    <label className="grid gap-1">
                      <span className="text-xs text-white/70">
                        Upload (Firebase Storage)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setProductFile(e.target.files?.[0] || null)
                        }
                        className="text-xs"
                      />
                      <span className="text-xs text-white/60">
                        Se nao tiver Firebase Storage configurado, use URL
                        publica abaixo.
                      </span>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs text-white/70">
                        URL publica do produto
                      </span>
                      <input
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        placeholder="https://..."
                        className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            {status === "error" ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {statusText || "Erro."}
              </div>
            ) : null}

            {(singleUsageExceeds || batchUsageExceeds) && (
              <div className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-3 text-xs uppercase tracking-[0.2em] text-amber-100">
                Creditos insuficientes para novas geracoes.
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <MerseLoadingOverlay
        active={studioMode === "loop" && isBusy}
        label="Gerando Loop Ads..."
        sublabel="Renderizando cenas, crossfade e variacoes no motor Merse."
      />
    </div>
  );
}
