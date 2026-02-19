import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  PiArrowsClockwiseBold,
  PiBracketsAngleFill,
  PiBrainFill,
  PiDownloadSimpleFill,
  PiLightningFill,
  PiRobotFill,
  PiSparkleFill,
  PiStarFourFill,
  PiTrashSimpleFill,
  PiUploadSimpleFill,
  PiWavesFill,
} from "react-icons/pi";

import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useEnergy } from "@/contexts/EnergyContext";
import {
  appendUserCreations,
  generateCreationId,
  getUserStorageKey,
} from "@/lib/creations";

type VisualProvider = "auto" | "openai" | "replicate";

type Archetype = {
  id: string;
  label: string;
  description: string;
  skills: string[];
};

type Persona = {
  id: string;
  name: string;
  age: string;
  pronouns: string;
  archetype: Archetype;
  personality: string;
  appearance: string;
  origin: string;
  abilities: string[];
  energy: number;
  traits: string;
  summary: string;
  tagline: string;
  loreHook: string;
  tags: string[];
  visualProvider: VisualProvider;
  referenceImage?: string;
  portraitImage?: string;
  createdAt: string;
};

type GeneratedPersonaPayload = {
  name?: unknown;
  age?: unknown;
  pronouns?: unknown;
  personality?: unknown;
  appearance?: unknown;
  origin?: unknown;
  abilities?: unknown;
  energy?: unknown;
  traits?: unknown;
  summary?: unknown;
  tagline?: unknown;
  loreHook?: unknown;
  tags?: unknown;
};

type PersonaApiResponse = {
  persona?: GeneratedPersonaPayload;
  portraitUrl?: unknown;
  providers?: {
    text?: unknown;
    image?: unknown;
  };
  warnings?: unknown;
  latencyMs?: unknown;
  error?: string;
};

const ARCHETYPES: Archetype[] = [
  {
    id: "explorer",
    label: "Explorador Cosmico",
    description: "Navegador de nebulosas, especialista em descobrir novos mundos.",
    skills: ["Mapeamento astral", "Sobrevivencia interplanetaria", "Diplomacia universal"],
  },
  {
    id: "engineer",
    label: "Engenheiro de Fotons",
    description: "Constroi dispositivos luminosos e otimiza sistemas energeticos.",
    skills: ["Tecnologia Merse", "Analise espectral", "Criacao de portais"],
  },
  {
    id: "oracle",
    label: "Oraculo IA",
    description: "Entidade hibrida que preve tendencias criativas em multiplos universos.",
    skills: ["Predicao narrativa", "Sintonia neural", "Curadoria de estilos"],
  },
];

const CURRENT_USER_FALLBACK = "demo-user";
const STORAGE_PREFIX = "merse.personas";
const COST_PER_GENERATION = 9;

function createPersonaId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildDefaultPersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: createPersonaId(),
    name: "Nova Astris",
    age: "27",
    pronouns: "Ela/Dela",
    archetype: ARCHETYPES[0]!,
    personality: "Curiosa, destemida, fala com energia contagiante e sempre tem novas ideias.",
    appearance:
      "Cabelo prateado com reflexos violetas, olhos luminescentes, traje Merse com paineis holograficos.",
    origin: "Estacao orbital Merse Prime • Cluster de Andromeda",
    abilities: ["Leitora de campos de energia", "Pilota drones interdimensionais"],
    energy: 72,
    traits: "Ama explorar megacidades futuristas, coleciona cristais sonoros, tem medo de aguas profundas.",
    summary:
      "Especialista em exploracao e narrativa visual para campanhas que conectam tecnologia e emocao.",
    tagline: "Transforma sinais cosmicos em experiencias memoraveis.",
    loreHook: "Recebeu uma missao para mapear universos criativos e abrir novas rotas para marcas.",
    tags: ["merse", "exploracao", "storytelling"],
    visualProvider: "auto",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function sanitizeText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function sanitizeList(value: unknown, maxItems: number, maxLength: number, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().replace(/\s+/g, " ").slice(0, maxLength);
    if (!normalized) continue;
    unique.add(normalized);
    if (unique.size >= maxItems) break;
  }
  const list = Array.from(unique);
  return list.length > 0 ? list : fallback;
}

function normalizeEnergy(value: unknown, fallback: number) {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? NaN);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function normalizePortrait(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "";
}

function mergePersonaFromApi(current: Persona, payload: GeneratedPersonaPayload, portraitUrl?: unknown): Persona {
  return {
    ...current,
    name: sanitizeText(payload.name, current.name, 80),
    age: sanitizeText(payload.age, current.age, 24),
    pronouns: sanitizeText(payload.pronouns, current.pronouns, 32),
    personality: sanitizeText(payload.personality, current.personality, 420),
    appearance: sanitizeText(payload.appearance, current.appearance, 480),
    origin: sanitizeText(payload.origin, current.origin, 180),
    abilities: sanitizeList(payload.abilities, 8, 80, current.abilities),
    energy: normalizeEnergy(payload.energy, current.energy),
    traits: sanitizeText(payload.traits, current.traits, 360),
    summary: sanitizeText(payload.summary, current.summary, 440),
    tagline: sanitizeText(payload.tagline, current.tagline, 180),
    loreHook: sanitizeText(payload.loreHook, current.loreHook, 360),
    tags: sanitizeList(payload.tags, 6, 36, current.tags),
    portraitImage: normalizePortrait(portraitUrl) || current.portraitImage,
  };
}

function loadPersonas(storageKey: string): Persona[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return seedInitialPersonas(storageKey);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedInitialPersonas(storageKey);
    return parsed as Persona[];
  } catch {
    return seedInitialPersonas(storageKey);
  }
}

function persistPersonas(storageKey: string, personas: Persona[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(personas));
}

function seedInitialPersonas(storageKey: string): Persona[] {
  const initial = buildDefaultPersona();
  persistPersonas(storageKey, [initial]);
  return [initial];
}

function toTagsInput(tags: string[]) {
  return tags.join(", ");
}

function parseTagsInput(value: string) {
  const tags = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 6);
}

export default function CriarPersonagem() {
  const { user } = useAuth();
  const energy = useEnergy();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserId = useMemo(() => user?.uid ?? CURRENT_USER_FALLBACK, [user?.uid]);
  const storageKey = useMemo(() => `${STORAGE_PREFIX}.${currentUserId}`, [currentUserId]);
  const userKey = useMemo(() => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined), [user?.email, user?.uid]);

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [persona, setPersona] = useState<Persona>(() => buildDefaultPersona());
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const [iaWarnings, setIaWarnings] = useState<string[]>([]);
  const [iaProvider, setIaProvider] = useState<string>("");
  const [iaLatencyMs, setIaLatencyMs] = useState<number | null>(null);

  const usageExceeds = useMemo(
    () => energy.usage + COST_PER_GENERATION > energy.limit,
    [energy.limit, energy.usage],
  );

  useEffect(() => {
    setPersonas(loadPersonas(storageKey));
  }, [storageKey]);

  useEffect(() => {
    persistPersonas(storageKey, personas);
  }, [personas, storageKey]);

  const lastSavedAt = useMemo(() => {
    const last = personas[0];
    return last ? new Date(last.createdAt) : null;
  }, [personas]);

  const handleInputChange = (field: keyof Persona, value: Persona[keyof Persona]) => {
    setPersona((prev) => ({ ...prev, [field]: value }));
  };

  const handleArchetype = (archetype: Archetype) => {
    setPersona((prev) => ({
      ...prev,
      archetype,
      abilities: archetype.skills.slice(0, 3),
    }));
  };

  const handleAbilityToggle = (ability: string) => {
    setPersona((prev) => {
      const exists = prev.abilities.includes(ability);
      return {
        ...prev,
        abilities: exists
          ? prev.abilities.filter((item) => item !== ability)
          : [...prev.abilities, ability].slice(0, 8),
      };
    });
  };

  const handleReferenceUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPersona((prev) => ({ ...prev, referenceImage: result }));
    };
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setPersona((prev) => ({ ...prev, referenceImage: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearGeneratedPortrait = () => {
    setPersona((prev) => ({ ...prev, portraitImage: undefined }));
  };

  const handleGenerateWithIA = async () => {
    const hasMinimumInput = Boolean(
      persona.name.trim() ||
      persona.personality.trim() ||
      persona.appearance.trim() ||
      persona.origin.trim() ||
      persona.traits.trim(),
    );

    if (!hasMinimumInput) {
      setIaError("Preencha ao menos nome, personalidade, aparencia, origem ou tracos antes de gerar.");
      return;
    }

    if (usageExceeds) {
      setIaError("Energia insuficiente. Voce ja atingiu o limite do seu plano.");
      return;
    }

    setIsGenerating(true);
    setIaError(null);
    setIaWarnings([]);
    setIaProvider("");
    setIaLatencyMs(null);

    try {
      const response = await fetch("/api/personagem/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.uid ? { "x-merse-uid": user.uid } : {}),
        },
        body: JSON.stringify({
          name: persona.name,
          age: persona.age,
          pronouns: persona.pronouns,
          archetype: persona.archetype,
          personality: persona.personality,
          appearance: persona.appearance,
          origin: persona.origin,
          abilities: persona.abilities,
          energy: persona.energy,
          traits: persona.traits,
          summary: persona.summary,
          tagline: persona.tagline,
          loreHook: persona.loreHook,
          tags: persona.tags,
          referenceImage: persona.referenceImage,
          visualProvider: persona.visualProvider,
        }),
      });

      const data = (await response.json().catch(() => null)) as PersonaApiResponse | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Nao foi possivel gerar a persona com IA.");
      }

      if (!data?.persona || typeof data.persona !== "object") {
        throw new Error("A resposta da API nao trouxe os dados esperados da persona.");
      }

      const nextPersona = mergePersonaFromApi(persona, data.persona, data.portraitUrl);
      setPersona(nextPersona);

      const providerText =
        typeof data.providers?.text === "string" ? data.providers.text : "fallback";
      const providerImage =
        typeof data.providers?.image === "string" ? data.providers.image : "none";
      setIaProvider(`${providerText} + ${providerImage}`);

      const warnings = Array.isArray(data.warnings)
        ? data.warnings.filter((item): item is string => typeof item === "string").slice(0, 4)
        : [];
      setIaWarnings(warnings);

      const latency = typeof data.latencyMs === "number" && Number.isFinite(data.latencyMs)
        ? Math.max(0, Math.round(data.latencyMs))
        : null;
      setIaLatencyMs(latency);

      energy.registerUsage(COST_PER_GENERATION, {
        path: "/criar-personagem",
        label: "Criador de Personas",
      });

      if (nextPersona.portraitImage) {
        void appendUserCreations(
          userKey,
          [
            {
              id: generateCreationId("image"),
              type: "image",
              prompt: nextPersona.summary || nextPersona.personality,
              createdAt: new Date().toISOString(),
              previewUrl: nextPersona.portraitImage,
              downloadUrl: nextPersona.portraitImage,
              meta: {
                modulo: "criar-personagem",
                arquetipo: nextPersona.archetype.label,
                provider: `${providerText}+${providerImage}`,
              },
            },
          ],
          { userId: user?.uid },
        ).catch((persistError) => {
          console.warn("[criar-personagem] Falha ao salvar criacao:", persistError);
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao gerar persona.";
      setIaError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const newPersona: Persona = {
      ...persona,
      id: createPersonaId(),
      createdAt: new Date().toISOString(),
    };

    setPersonas((prev) => [newPersona, ...prev]);
    setPersona(
      buildDefaultPersona({
        visualProvider: persona.visualProvider,
        referenceImage: undefined,
        portraitImage: undefined,
      }),
    );

    window.setTimeout(() => setIsSaving(false), 450);
  };

  const handleClearHistory = () => {
    setPersonas([]);
    persistPersonas(storageKey, []);
  };

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[500px] bg-[radial-gradient(circle_at_65%_30%,rgba(236,72,153,0.32),transparent_60%),radial-gradient(circle_at_30%_25%,rgba(59,130,246,0.28),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Character Forge</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              Crie personagens para seus universos Merse
            </h1>
            <p className="max-w-2xl text-sm text-white/70">
              Defina arquétipos, habilidades e historias para alimentar seus projetos com personagens
              consistentes. Agora com geracao IA para retrato e lore.
            </p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
            <PiStarFourFill className="text-2xl text-purple-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Ultimo personagem</p>
              <p>
                {lastSavedAt
                  ? new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    }).format(lastSavedAt)
                  : "Nenhum salvo ainda"}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.1)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] opacity-90" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/50">
                <span>Personas criadas</span>
                <span>{personas.length}</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Stack IA ativo</p>
                <ul className="space-y-2 text-sm text-white/70">
                  <li>• Texto: OpenAI para estruturar lore, tags e habilidades.</li>
                  <li>• Imagem: OpenAI com fallback automatico para Replicate.</li>
                  <li>• Registro: salva retratos na galeria de criações do usuario.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-xs text-white/70">
                <p className="flex items-center gap-2 uppercase tracking-[0.3em] text-white/55">
                  <PiLightningFill className="text-purple-300" />
                  Energia
                </p>
                <p className="mt-2">
                  {energy.usage}/{energy.limit} usados • {COST_PER_GENERATION} por geracao IA
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/65 transition hover:border-red-400/60 hover:text-red-200"
              >
                <PiTrashSimpleFill />
                Limpar historico
              </button>
            </div>
          </aside>

          <main className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_100px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] opacity-90" />
              <form className="relative flex flex-col gap-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Nome
                    <input
                      type="text"
                      value={persona.name}
                      onChange={(event) => handleInputChange("name", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Idade
                    <input
                      type="number"
                      min={0}
                      value={persona.age}
                      onChange={(event) => handleInputChange("age", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                </div>

                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Pronomes
                  <input
                    type="text"
                    value={persona.pronouns}
                    onChange={(event) => handleInputChange("pronouns", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </label>

                <div className="space-y-4">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    <PiRobotFill className="text-purple-300" />
                    Escolha o arquétipo
                  </span>
                  <div className="grid gap-3 md:grid-cols-3">
                    {ARCHETYPES.map((archetype) => {
                      const isActive = persona.archetype.id === archetype.id;
                      return (
                        <button
                          key={archetype.id}
                          type="button"
                          onClick={() => handleArchetype(archetype)}
                          className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                            isActive
                              ? "border-purple-300/60 bg-purple-500/10 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                              : "border-white/10 bg-black/30 text-white/70 hover:border-purple-300/40 hover:text-white"
                          }`}
                        >
                          <span className="text-sm font-semibold">{archetype.label}</span>
                          <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                            {archetype.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Personalidade
                    <textarea
                      value={persona.personality}
                      onChange={(event) => handleInputChange("personality", event.target.value)}
                      className="mt-2 min-h-[90px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Aparencia
                    <textarea
                      value={persona.appearance}
                      onChange={(event) => handleInputChange("appearance", event.target.value)}
                      className="mt-2 min-h-[90px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Origem
                    <input
                      type="text"
                      value={persona.origin}
                      onChange={(event) => handleInputChange("origin", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Tracos marcantes
                    <textarea
                      value={persona.traits}
                      onChange={(event) => handleInputChange("traits", event.target.value)}
                      className="mt-2 min-h-[80px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Tagline
                    <input
                      type="text"
                      value={persona.tagline}
                      onChange={(event) => handleInputChange("tagline", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Tags (separadas por virgula)
                    <input
                      type="text"
                      value={toTagsInput(persona.tags)}
                      onChange={(event) => handleInputChange("tags", parseTagsInput(event.target.value))}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                </div>

                <div className="grid gap-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Resumo da persona
                    <textarea
                      value={persona.summary}
                      onChange={(event) => handleInputChange("summary", event.target.value)}
                      className="mt-2 min-h-[80px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Lore hook
                    <textarea
                      value={persona.loreHook}
                      onChange={(event) => handleInputChange("loreHook", event.target.value)}
                      className="mt-2 min-h-[80px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    <PiBrainFill className="text-purple-300" />
                    Habilidades principais
                  </span>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[...new Set([...persona.archetype.skills, ...persona.abilities])].map((ability) => {
                      const isActive = persona.abilities.includes(ability);
                      return (
                        <button
                          key={ability}
                          type="button"
                          onClick={() => handleAbilityToggle(ability)}
                          className={`rounded-2xl border px-4 py-3 text-sm transition ${
                            isActive
                              ? "border-purple-300/60 bg-purple-500/10 text-white"
                              : "border-white/10 bg-black/30 text-white/65 hover:border-purple-300/40 hover:text-white"
                          }`}
                        >
                          {ability}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    <span className="flex items-center gap-2">
                      <PiLightningFill className="text-purple-300" />
                      Energia Merse
                    </span>
                    <span className="text-white/50">{persona.energy}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={persona.energy}
                    onChange={(event) => handleInputChange("energy", Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 accent-white"
                  />
                  <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                    <span>Reservado</span>
                    <span>Supernova</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      <span className="flex items-center gap-2">
                        <PiUploadSimpleFill className="text-purple-300" />
                        Referencia visual
                      </span>
                      {persona.referenceImage ? (
                        <button
                          type="button"
                          onClick={clearReference}
                          className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/50 hover:text-white"
                        >
                          remover
                        </button>
                      ) : (
                        <span className="text-white/40">png • jpg • webp</span>
                      )}
                    </div>
                    <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-purple-300/40 hover:text-white">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceUpload}
                        className="hidden"
                      />
                      {persona.referenceImage ? (
                        <div className="flex w-full flex-col items-center gap-3">
                          <img
                            src={persona.referenceImage}
                            alt="Referencia visual"
                            className="h-32 w-full rounded-xl object-cover shadow-lg"
                          />
                          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                            Atualizar imagem
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <PiUploadSimpleFill className="text-xl text-purple-300" />
                          <p className="text-xs uppercase tracking-[0.3em]">Arraste ou selecione</p>
                          <p className="text-[11px] text-white/50">
                            Ajuda a manter consistencia no retrato gerado.
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      Motor visual
                      <select
                        value={persona.visualProvider}
                        onChange={(event) => handleInputChange("visualProvider", event.target.value as VisualProvider)}
                        className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      >
                        <option value="auto">Auto (OpenAI + fallback Replicate)</option>
                        <option value="openai">Somente OpenAI</option>
                        <option value="replicate">Somente Replicate</option>
                      </select>
                    </label>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/55">
                        <PiWavesFill className="text-purple-300" />
                        Provedor usado
                      </p>
                      <p className="mt-2">{iaProvider || "Aguardando geracao..."}</p>
                      {iaLatencyMs !== null && <p className="mt-1 text-xs text-white/50">Latencia: {iaLatencyMs} ms</p>}
                    </div>

                    {persona.portraitImage && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                          <span>Retrato gerado</span>
                          <button
                            type="button"
                            onClick={clearGeneratedPortrait}
                            className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/60 transition hover:border-white/50 hover:text-white"
                          >
                            remover
                          </button>
                        </div>
                        <img
                          src={persona.portraitImage}
                          alt={`Retrato de ${persona.name}`}
                          className="h-44 w-full rounded-2xl object-cover shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {iaError && (
                  <p className="rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {iaError}
                  </p>
                )}

                {iaWarnings.length > 0 && (
                  <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {iaWarnings.map((warning, index) => (
                      <p key={`${warning}-${index}`}>• {warning}</p>
                    ))}
                  </div>
                )}

                {usageExceeds && (
                  <p className="rounded-2xl border border-amber-300/35 bg-amber-500/10 px-4 py-3 text-xs uppercase tracking-[0.22em] text-amber-100">
                    Energia insuficiente para nova geracao IA.
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleGenerateWithIA}
                    disabled={isGenerating || isSaving || usageExceeds}
                    className="group flex items-center justify-center gap-3 rounded-2xl border border-sky-400/60 bg-gradient-to-r from-sky-500/80 via-indigo-500/80 to-violet-500/80 px-8 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PiArrowsClockwiseBold className={`text-xl ${isGenerating ? "animate-spin" : ""}`} />
                    {isGenerating ? "Gerando IA..." : "Gerar com IA"}
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || isGenerating}
                    className="group flex items-center justify-center gap-3 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(168,85,247,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PiSparkleFill className={`text-xl transition ${isSaving ? "animate-spin" : ""}`} />
                    {isSaving ? "Salvando..." : "Salvar persona"}
                  </button>
                </div>
              </form>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {personas.map((saved) => {
                const previewImage = saved.portraitImage || saved.referenceImage;
                return (
                  <article
                    key={saved.id}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1 hover:border-purple-300/40"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.16),transparent_60%)] opacity-80 transition duration-300 group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-3 text-sm text-white/75">
                      <header className="flex items-center justify-between text-white">
                        <div>
                          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Persona</p>
                          <h3 className="text-lg font-semibold">{saved.name}</h3>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70">
                          <PiBracketsAngleFill />
                        </span>
                      </header>

                      {previewImage && (
                        <img
                          src={previewImage}
                          alt={`Visual de ${saved.name}`}
                          className="h-40 w-full rounded-2xl object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                        />
                      )}

                      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs uppercase tracking-[0.3em] text-white/55">
                        <div className="flex items-center justify-between">
                          <span>{saved.archetype.label}</span>
                          <span>
                            Energia <span className="text-white/80">{saved.energy}%</span>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-white/80">
                        <p>
                          <strong>Resumo:</strong> {saved.summary}
                        </p>
                        <p>
                          <strong>Tagline:</strong> {saved.tagline}
                        </p>
                        <p>
                          <strong>Lore:</strong> {saved.loreHook}
                        </p>
                        <p>
                          <strong>Personalidade:</strong> {saved.personality}
                        </p>
                        <p>
                          <strong>Aparencia:</strong> {saved.appearance}
                        </p>
                        <p>
                          <strong>Origem:</strong> {saved.origin}
                        </p>
                        <p>
                          <strong>Tracos:</strong> {saved.traits}
                        </p>
                        <p>
                          <strong>Habilidades:</strong> {saved.abilities.join(" • ")}
                        </p>
                        <p>
                          <strong>Tags:</strong> {saved.tags.join(" • ")}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/50">
                        <span>
                          {new Intl.DateTimeFormat("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "short",
                          }).format(new Date(saved.createdAt))}
                        </span>
                        <a
                          href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(saved, null, 2))}`}
                          download={`${saved.name.toLowerCase().replace(/\s+/g, "-")}-merse.json`}
                          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                        >
                          <PiDownloadSimpleFill />
                          Exportar
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </main>
        </div>
      </div>

      <MerseLoadingOverlay
        active={isGenerating}
        label="Forjando personagem com IA..."
        sublabel="Combinando lore, identidade visual e retrato no padrao Merse."
      />
    </div>
  );
}
