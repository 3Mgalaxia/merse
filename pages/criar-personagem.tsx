import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  PiBracketsAngleFill,
  PiBrainFill,
  PiDownloadSimpleFill,
  PiLightningFill,
  PiRobotFill,
  PiSparkleFill,
  PiStarFourFill,
  PiTrashSimpleFill,
  PiUploadSimpleFill,
} from "react-icons/pi";

type Archetype = {
  id: string;
  label: string;
  description: string;
  skills: string[];
};

const ARCHETYPES: Archetype[] = [
  {
    id: "explorer",
    label: "Explorador Cósmico",
    description: "Navegador de nebulosas, especialista em descobrir novos mundos.",
    skills: ["Mapeamento astral", "Sobrevivência interplanetária", "Diplomacia universal"],
  },
  {
    id: "engineer",
    label: "Engenheiro de Fótons",
    description: "Constrói dispositivos luminosos e otimiza sistemas energéticos.",
    skills: ["Tecnologia Merse", "Análise espectral", "Criação de portais"],
  },
  {
    id: "oracle",
    label: "Oráculo IA",
    description: "Entidade híbrida que prevê tendências criativas em múltiplos universos.",
    skills: ["Predição narrativa", "Sintonia neural", "Curadoria de estilos"],
  },
];

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
  referenceImage?: string;
  createdAt: string;
};

const CURRENT_USER_ID = "demo-user";
const STORAGE_KEY = `merse.personas.${CURRENT_USER_ID}`;

const DEFAULT_PERSONA: Persona = {
  id: "",
  name: "Nova Astris",
  age: "27",
  pronouns: "Ela/Dela",
  archetype: ARCHETYPES[0],
  personality: "Curiosa, destemida, fala com energia contagiante e sempre tem novas ideias.",
  appearance:
    "Cabelo prateado com reflexos violetas, olhos luminescentes, traje Merse com painéis holográficos.",
  origin: "Estação orbital Merse Prime • Cluster de Andrômeda",
  abilities: ["Leitora de campos de energia", "Pilota drones interdimensionais"],
  energy: 72,
  traits: "Ama explorar megacidades futuristas, coleciona cristais sonoros, tem medo de águas profundas.",
  createdAt: new Date().toISOString(),
};

function createPersonaId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadPersonas(): Persona[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedInitialPersonas();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Persona[]) : seedInitialPersonas();
  } catch {
    return seedInitialPersonas();
  }
}

function persistPersonas(personas: Persona[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
}

function seedInitialPersonas(): Persona[] {
  const persona = { ...DEFAULT_PERSONA, id: createPersonaId() };
  persistPersonas([persona]);
  return [persona];
}

export default function CriarPersonagem() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [persona, setPersona] = useState<Persona>(() => ({
    ...DEFAULT_PERSONA,
    id: createPersonaId(),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPersonas(loadPersonas());
  }, []);

  useEffect(() => {
    persistPersonas(personas);
  }, [personas]);

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
      abilities: archetype.skills.slice(0, 2),
    }));
  };

  const handleAbilityToggle = (ability: string) => {
    setPersona((prev) => {
      const exists = prev.abilities.includes(ability);
      return {
        ...prev,
        abilities: exists
          ? prev.abilities.filter((item) => item !== ability)
          : [...prev.abilities, ability],
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const newPersona: Persona = {
      ...persona,
      id: createPersonaId(),
      createdAt: new Date().toISOString(),
    };
    setPersonas((prev) => [newPersona, ...prev]);
    setPersona({
      ...DEFAULT_PERSONA,
      id: createPersonaId(),
      referenceImage: undefined,
    });
    setTimeout(() => setIsSaving(false), 600);
  };

  const handleClearHistory = () => {
    setPersonas([]);
    persistPersonas([]);
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
              Crie personas para seus universos Merse
            </h1>
            <p className="max-w-2xl text-sm text-white/70">
              Defina arquétipos, habilidades e histórias para alimentar seus projetos com personagens
              consistentes. Tudo fica salvo por usuário.
            </p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
            <PiStarFourFill className="text-2xl text-purple-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Último personagem</p>
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
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Recomendações</p>
                <ul className="space-y-2 text-sm text-white/70">
                  <li>• Combine com banners Runway e Photon Forge para visualizar o personagem.</li>
                  <li>• Utilize as habilidades como base para prompts no Prompt Lab.</li>
                  <li>• Ajuste energia cósmica para equilibrar seus times criativos.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/65 transition hover:border-red-400/60 hover:text-red-200"
              >
                <PiTrashSimpleFill />
                Limpar histórico
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
                    Aparência
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
                    Traços marcantes
                    <textarea
                      value={persona.traits}
                      onChange={(event) => handleInputChange("traits", event.target.value)}
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    <span className="flex items-center gap-2">
                      <PiUploadSimpleFill className="text-purple-300" />
                      Referência visual
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
                          alt="Referência visual"
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
                          Ajuda a manter consistência na hora de gerar imagens ou vídeos.
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="group flex items-center justify-center gap-3 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(168,85,247,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PiSparkleFill className={`text-xl transition ${isSaving ? "animate-spin" : ""}`} />
                  {isSaving ? "Registrando..." : "Salvar persona"}
                </button>
              </form>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {personas.map((saved) => (
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

                    {saved.referenceImage && (
                      <img
                        src={saved.referenceImage}
                        alt={`Referência de ${saved.name}`}
                        className="h-40 w-full rounded-2xl object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                      />
                    )}

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs uppercase tracking-[0.3em] text-white/55">
                      <div className="flex items-center justify-between">
                        <span>{saved.archetype.label}</span>
                        <span>
                          Energia{" "}
                          <span className="text-white/80">
                            {saved.energy}
                            %
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-white/80">
                      <p>
                        <strong>Personalidade:</strong> {saved.personality}
                      </p>
                      <p>
                        <strong>Aparência:</strong> {saved.appearance}
                      </p>
                      <p>
                        <strong>Origem:</strong> {saved.origin}
                      </p>
                      <p>
                        <strong>Traços:</strong> {saved.traits}
                      </p>
                      <p>
                        <strong>Habilidades:</strong> {saved.abilities.join(" • ")}
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
              ))}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
