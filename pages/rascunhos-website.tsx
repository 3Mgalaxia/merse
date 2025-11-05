import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  PiBrowsersFill,
  PiListChecksFill,
  PiPaletteFill,
  PiSparkleFill,
  PiStarFourFill,
  PiUploadSimpleFill,
} from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";

type LayoutPreset = {
  id: string;
  label: string;
  description: string;
  hero: string;
  objective: string;
  details: string[];
};

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "cosmic-landing",
    label: "Galaxy Landing",
    description: "Hero cinematográfico, CTA dupla, galeria animada.",
    hero: "/banners/Merse-4.png",
    objective: "Impactar visualmente e converter.",
    details: [
      "Layout ideal para landing pages que precisam causar impacto imediato.",
      "Hero cinematográfico com vídeo ou visual 3D, slogan memorável e transições suaves.",
      "Dois CTAs principais orientando o visitante para explorar e converter.",
      "Galeria animada com exemplos do produto, recursos ou resultados.",
      "Padrões visuais com fortes contrastes, partículas de luz e blocos verticais.",
      "Recomendado para lançamentos, pitches e produtos futuristas.",
    ],
  },
  {
    id: "dashboard",
    label: "Portal Operacional",
    description: "Dashboard modular com cards e timeline viva.",
    hero: "/banners/Merse-3.png",
    objective: "Funcionalidade e controle.",
    details: [
      "Cria uma central de comando para plataformas de IA ou hubs de produtividade.",
      "Cards modulares exibindo métricas, status de geração e ações rápidas.",
      "Timeline com histórico vivo de atividades, entradas ou resultados.",
      "Organização em grade, interações claras e foco no fluxo operacional.",
      "Visual translúcido com elementos glassmorphism e animações ao passar o mouse.",
      "Indicada para áreas logadas, painéis administrativos e experiências responsivas multitarefa.",
    ],
  },
  {
    id: "storytelling",
    label: "Storytelling Imersivo",
    description: "Narrativa em capítulos com CTA final astral.",
    hero: "/banners/Merse-2.png",
    objective: "Conduzir o visitante por uma história.",
    details: [
      "Estrutura em capítulos que guia o visitante por uma jornada emocional.",
      "Cada bloco une texto, imagem e microanimações para reforçar a narrativa.",
      "Efeitos de parallax, trilhas de luz e títulos poéticos criam atmosfera imersiva.",
      "O CTA final convida o usuário para iniciar a jornada ou acessar o universo apresentado.",
      "Recomendado para campanhas de lançamento, páginas institucionais e experiências sensoriais.",
      "Foco em impacto cinematográfico, ritmo fluido e storytelling inspirador.",
    ],
  },
];

const COLOR_SYSTEMS = [
  { id: "neon", label: "Neon Galaxy", preview: "Roxo • Azul • Magenta" },
  { id: "aurora", label: "Aurora Boreal", preview: "Verde • Ciano • Lilás" },
  { id: "void", label: "Void Minimal", preview: "Preto • Cinza profundo • Branco" },
  { id: "sunset", label: "Sunset Nova", preview: "Laranja • Rosa • Roxo" },
];

const MODULE_LIBRARY = [
  { id: "hero", label: "Hero 3D animado" },
  { id: "pricing", label: "Tabela de planos" },
  { id: "workflow", label: "Workflow visual" },
  { id: "portfolio", label: "Portfólio Merse" },
  { id: "faq", label: "FAQ interativo" },
  { id: "cta", label: "Banner CTA cósmico" },
];

type FormState = {
  siteName: string;
  goal: string;
  menu: string;
  layout: LayoutPreset;
  palette: string;
  modules: string[];
  notes: string;
  heroMood: string;
};

const defaultState: FormState = {
  siteName: "Projeto Merse",
  goal: "Landing page para lançamento de IA",
  menu: "Início, Recursos, Planos, Comunidade, Contato",
  layout: LAYOUT_PRESETS[0],
  palette: COLOR_SYSTEMS[0].id,
  modules: ["hero", "pricing", "cta"],
  notes: "Foco em experiência imersiva, CTA claro e narrativa em três blocos.",
  heroMood: "Nebulosa violeta com partículas e hologramas leves",
};

const STEPS = [
  {
    id: 1,
    title: "Fundação",
    tagline: "Nome, objetivo e estrutura básica do site.",
  },
  {
    id: 2,
    title: "Identidade",
    tagline: "Escolha layout base e paleta Merse.",
  },
  {
    id: 3,
    title: "Conteúdo",
    tagline: "Selecione módulos e detalhes criativos.",
  },
];

export default function RascunhoWebsite() {
  const energy = useEnergy();
  const [state, setState] = useState<FormState>(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    highlights: string[];
    html: string;
  } | null>(null);
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);

  const paletteInfo = useMemo(
    () => COLOR_SYSTEMS.find((palette) => palette.id === state.palette),
    [state.palette],
  );
  const hasResult = Boolean(result);
  const currentStep = useMemo(
    () => STEPS.find((step) => step.id === activeStep) ?? STEPS[0],
    [activeStep],
  );

  useEffect(() => {
    setCopyStatus("idle");
  }, [result?.html, activeView]);

  const whatsappUrl = useMemo(() => {
    if (!result) return null;
    const phone = "5562982775813";
    const message = encodeURIComponent(
      [
        "Olá equipe Merse!",
        `Quero ajustar o site "${state.siteName}" que acabei de gerar pelo laboratório.`,
        "",
        "Resumo:",
        result.summary,
        "",
        "Podemos evoluir esse projeto juntos?",
      ].join("\n"),
    );
    return `https://api.whatsapp.com/send/?phone=${phone}&text=${message}&type=phone_number&app_absent=0`;
  }, [result, state.siteName]);

  const toggleModule = (moduleId: string) => {
    setState((prev) => {
      const exists = prev.modules.includes(moduleId);
      return {
        ...prev,
        modules: exists ? prev.modules.filter((id) => id !== moduleId) : [...prev.modules, moduleId],
      };
    });
  };

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (energy.plan === "free") {
      setErrorMessage("O plano Free não permite gerar blueprints de sites. Atualize seu plano para usar o laboratório Merse.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      siteName: state.siteName,
      goal: state.goal,
      menu: state.menu,
      layout: {
        id: state.layout.id,
        label: state.layout.label,
        description: state.layout.description,
        objective: state.layout.objective,
        highlights: state.layout.details,
        referenceImage: state.layout.hero,
      },
      palette: {
        id: state.palette,
        label: paletteInfo?.label ?? state.palette,
        preview: paletteInfo?.preview ?? "",
      },
      modules: state.modules.map(
        (moduleId) => MODULE_LIBRARY.find((module) => module.id === moduleId)?.label ?? moduleId,
      ),
      notes: state.notes,
      heroMood: state.heroMood,
    };

    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o blueprint agora.");
      }

      setResult(data.website);
      setActiveView("preview");
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado ao gerar blueprint.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep = (step: number) => {
    setActiveStep((prev) => {
      const next = Math.max(1, Math.min(STEPS.length, step));
      return next === prev ? prev : next;
    });
  };

  const handleNextStep = () => {
    goToStep(activeStep + 1);
  };

  const handlePrevStep = () => {
    goToStep(activeStep - 1);
  };

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[520px] bg-[radial-gradient(circle_at_65%_35%,rgba(236,72,153,0.28),transparent_60%),radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.28),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Blueprints Merse</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              Rascunho intergaláctico de websites
            </h1>
            <p className="max-w-2xl text-sm text-white/70">
              Defina tom, módulos e estética. O laboratório gera uma arquitetura pronta para apresentar
              ao cliente ou alimentar seus fluxos de IA.
            </p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
            <PiStarFourFill className="text-2xl text-purple-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Sugestão</p>
              <p>Combine o blueprint com os banners Merse para um pitch completo.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_100px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] opacity-90" />
            <form className="relative flex flex-col gap-8" onSubmit={handleSubmit}>
              <header className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">
                      Passo {activeStep} de {STEPS.length}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-white">{currentStep.title}</h3>
                    <p className="text-sm text-white/70">{currentStep.tagline}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    {STEPS.map((step) => {
                      const isDone = step.id < activeStep;
                      const isCurrent = step.id === activeStep;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => goToStep(step.id)}
                          className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border text-xs font-semibold uppercase tracking-[0.3em] transition ${
                            isCurrent
                              ? "border-purple-300/60 bg-purple-500/20 text-white"
                              : isDone
                              ? "border-purple-300/30 bg-black/30 text-purple-200"
                              : "border-white/10 bg-black/20 text-white/40 hover:border-white/25 hover:text-white/70"
                          }`}
                          aria-label={`Ir para passo ${step.id}: ${step.title}`}
                        >
                          {step.id}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:hidden">
                  {STEPS.map((step) => (
                    <span
                      key={`mobile-step-${step.id}`}
                      className={`h-1.5 flex-1 rounded-full transition ${
                        step.id <= activeStep ? "bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" : "bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              </header>

              {activeStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-white/80">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      <PiSparkleFill />
                      Identidade do projeto
                    </p>
                    <input
                      type="text"
                      value={state.siteName}
                      onChange={(event) => handleChange("siteName", event.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      placeholder="Nome do site ou produto"
                    />
                    <textarea
                      value={state.goal}
                      onChange={(event) => handleChange("goal", event.target.value)}
                      placeholder="Objetivo principal (ex.: captar leads, lançar produto, explicar solução...)"
                      className="min-h-[90px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-white/80">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      Estrutura básica
                    </p>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      Menu principal
                      <textarea
                        value={state.menu}
                        onChange={(event) => handleChange("menu", event.target.value)}
                        className="min-h-[72px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        placeholder="Separe por vírgulas • Ex.: Início, Produtos, Planos, Contato"
                      />
                    </label>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                      Estas informações ajudam o motor a organizar navegação e chamadas.
                    </p>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      <PiBrowsersFill className="text-purple-300" />
                      Layout base
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {LAYOUT_PRESETS.map((preset) => {
                        const isActive = state.layout.id === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleChange("layout", preset)}
                            className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                              isActive
                                ? "border-purple-400/60 bg-purple-500/10 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                                : "border-white/10 bg-black/30 text-white/70 hover:border-purple-300/40 hover:text-white"
                            }`}
                          >
                            <img
                              src={preset.hero}
                              alt={`Layout ${preset.label}`}
                              className="mb-3 h-24 w-full rounded-xl object-cover"
                            />
                            <p className="text-sm font-semibold">{preset.label}</p>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">{preset.description}</p>
                            <p className="mt-2 text-xs text-white/65">
                              <span className="font-semibold text-white/80">Objetivo:</span> {preset.objective}
                            </p>
                            <ul className="mt-3 space-y-2 text-xs text-white/60">
                              {preset.details.slice(0, 3).map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-300/70" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-white/75">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      Briefing do layout selecionado
                    </p>
                    <div className="space-y-3">
                      <p>
                        <span className="text-white/50">Layout:</span>{" "}
                        <span className="text-white/80">{state.layout.label}</span>
                      </p>
                      <p>
                        <span className="text-white/50">Visão geral:</span>{" "}
                        <span className="text-white/80">{state.layout.description}</span>
                      </p>
                      <p>
                        <span className="text-white/50">Objetivo principal:</span>{" "}
                        <span className="text-white/80">{state.layout.objective}</span>
                      </p>
                      <ul className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
                        {state.layout.details.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-300/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      <PiPaletteFill className="text-purple-300" />
                      Paleta Merse
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {COLOR_SYSTEMS.map((palette) => {
                        const isActive = state.palette === palette.id;
                        return (
                          <button
                            key={palette.id}
                            type="button"
                            onClick={() => handleChange("palette", palette.id)}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-purple-300/60 bg-purple-500/10 text-white shadow-[0_0_18px_rgba(168,85,247,0.3)]"
                                : "border-white/10 bg-black/30 text-white/65 hover:border-purple-300/40 hover:text-white"
                            }`}
                          >
                            <div>
                              <span className="text-sm font-semibold">{palette.label}</span>
                              <span className="mt-1 block text-[11px] uppercase tracking-[0.3em] text-white/45">
                                {palette.preview}
                              </span>
                            </div>
                            <span
                              className={`h-10 w-10 rounded-full border border-white/15 bg-gradient-to-br ${
                                palette.id === "neon"
                                  ? "from-purple-500 via-pink-500 to-blue-500"
                                  : palette.id === "aurora"
                                  ? "from-teal-400 via-cyan-400 to-purple-500"
                                  : palette.id === "void"
                                  ? "from-slate-800 via-slate-900 to-black"
                                  : "from-orange-400 via-pink-500 to-purple-500"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      <PiListChecksFill className="text-purple-300" />
                      Seções principais
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {MODULE_LIBRARY.map((module) => {
                        const isActive = state.modules.includes(module.id);
                        return (
                          <label
                            key={module.id}
                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                              isActive
                                ? "border-purple-300/60 bg-purple-500/10 text-white shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                                : "border-white/10 bg-black/30 text-white/65 hover:border-purple-300/40 hover:text-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleModule(module.id)}
                              className="h-4 w-4 rounded border border-white/30 bg-black/40 accent-purple-500"
                            />
                            <span>{module.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-white/80">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      <PiUploadSimpleFill className="text-purple-300" />
                      Mood do hero
                    </label>
                    <textarea
                      value={state.heroMood}
                      onChange={(event) => handleChange("heroMood", event.target.value)}
                      className="min-h-[80px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      placeholder="Nebulosa roxa com partículas brilhantes..."
                    />
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-white/80">
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      Observações finais
                    </label>
                    <textarea
                      value={state.notes}
                      onChange={(event) => handleChange("notes", event.target.value)}
                      className="min-h-[110px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      placeholder="Detalhes específicos, integrações ou particularidades..."
                    />
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                      Informe requisitos especiais ou direcionamentos extras para o motor.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    Voltar
                  </button>
                ) : (
                  <span />
                )}
                {activeStep < STEPS.length ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-2 rounded-2xl border border-purple-400/60 bg-purple-500/10 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-purple-500/20"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_20px_60px_rgba(168,85,247,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PiSparkleFill className={`text-lg transition ${isSubmitting ? "animate-spin" : ""}`} />
                    {isSubmitting ? "Gerando blueprint..." : "Gerar rascunho"}
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.08)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_55%)] opacity-80" />
              <div className="relative space-y-4 text-sm text-white/70">
                <header className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Briefing atual</p>
                  <h2 className="text-xl font-semibold text-white">Resumo do que você definiu</h2>
                </header>
                <ul className="space-y-3 text-sm leading-relaxed">
                  <li>
                    <span className="text-white/60">Projeto:</span>{" "}
                    <span className="text-white">{state.siteName || "—"}</span>
                  </li>
                  <li>
                    <span className="text-white/60">Objetivo:</span>{" "}
                    <span className="text-white">{state.goal || "Descreva o objetivo no passo 1."}</span>
                  </li>
                  <li>
                    <span className="text-white/60">Menu sugerido:</span>{" "}
                    <span className="text-white">{state.menu || "Defina o menu no passo 1."}</span>
                  </li>
                  <li>
                    <span className="text-white/60">Layout & paleta:</span>{" "}
                    <span className="text-white">
                      {state.layout.label} • {paletteInfo?.label ?? "Paleta Merse"}
                    </span>
                  </li>
                  <li>
                    <span className="text-white/60">Objetivo do layout:</span>{" "}
                    <span className="text-white">{state.layout.objective}</span>
                  </li>
                  <li>
                    <span className="text-white/60">Diretrizes do tema:</span>{" "}
                    <span className="text-white">
                      {state.layout.details.length
                        ? state.layout.details.slice(0, 2).join(" • ")
                        : "Escolha um layout no passo 2."}
                    </span>
                  </li>
                  <li>
                    <span className="text-white/60">Módulos selecionados:</span>{" "}
                    <span className="text-white">
                      {state.modules.length
                        ? state.modules
                            .map(
                              (moduleId) =>
                                MODULE_LIBRARY.find((module) => module.id === moduleId)?.label ?? moduleId,
                            )
                            .join(", ")
                        : "Nenhum módulo ativado ainda."}
                    </span>
                  </li>
                </ul>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                  Ajuste qualquer passo a qualquer momento — o resumo acompanha suas escolhas.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.2),transparent_55%)] opacity-80" />
              <div className="relative space-y-5">
                <header>
                  <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">
                    Laboratório Merse
                  </p>
                  <h2 className="text-2xl font-semibold text-white">Código e visual gerados</h2>
                </header>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/70">
                  {isSubmitting ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-8 rounded-xl bg-white/10" />
                      <div className="h-20 rounded-xl bg-white/10" />
                    <div className="space-y-4">
                        <div className="h-16 rounded-xl bg-white/10" />
                        <div className="h-16 rounded-xl bg-white/10" />
                      </div>
                      <div className="h-64 rounded-xl bg-white/10" />
                    </div>
                  ) : hasResult && result ? (
                    <div className="space-y-6 text-white/80">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Resumo</p>
                        <p className="text-base text-white">{result.summary}</p>
                      </div>

                      {result.highlights.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                            Destaques do layout
                          </p>
                          <ul className="space-y-2">
                            {result.highlights.map((item, index) => (
                              <li key={`${item}-${index.toString()}`} className="flex gap-2 text-sm">
                                <span className="text-purple-300">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex gap-2 rounded-full border border-white/15 bg-black/30 p-1 text-xs uppercase tracking-[0.35em] text-white/60">
                            <button
                              type="button"
                              onClick={() => setActiveView("preview")}
                              className={`rounded-full px-4 py-1 transition ${
                                activeView === "preview"
                                  ? "bg-purple-500/80 text-white shadow-[0_0_16px_rgba(168,85,247,0.45)]"
                                  : "text-white/60 hover:text-white"
                              }`}
                            >
                              Prévia
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveView("code")}
                              className={`rounded-full px-4 py-1 transition ${
                                activeView === "code"
                                  ? "bg-purple-500/80 text-white shadow-[0_0_16px_rgba(168,85,247,0.45)]"
                                  : "text-white/60 hover:text-white"
                              }`}
                            >
                              Código
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!result?.html) return;
                              try {
                                await navigator.clipboard.writeText(result.html);
                                setCopyStatus("copied");
                                setTimeout(() => setCopyStatus("idle"), 2500);
                              } catch (copyError) {
                                console.warn("Não foi possível copiar o código:", copyError);
                                setCopyStatus("idle");
                              }
                            }}
                            className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:bg-white/20"
                          >
                            {copyStatus === "copied" ? "Copiado ✨" : "Copiar HTML"}
                          </button>
                        </div>
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-green-300/40 bg-green-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-green-100 transition hover:border-green-300/60 hover:bg-green-500/20"
                          >
                            Solicitar ajustes via WhatsApp
                          </a>
                        )}
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/80">
                          {activeView === "preview" ? (
                            <iframe
                              key="preview"
                              title="Pré-visualização do site"
                              srcDoc={result.html}
                              className="h-[620px] w-full border-0 bg-white"
                            />
                          ) : (
                            <pre className="max-h-[620px] overflow-auto bg-black/90 p-4 text-xs text-white/80">
                              <code>{result.html}</code>
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm text-white/70">
                      <p>
                        Gere o primeiro blueprint para visualizar o código pronto do site. Selecione módulos,
                        identidades e descreva os diferenciais — a Merse devolve HTML + CSS estilizados no padrão intergaláctico.
                      </p>
                      <ul className="space-y-2">
                        <li>• Ajuste paleta e layout para direcionar o tom do código gerado.</li>
                        <li>• Os módulos escolhidos influenciam a estrutura e as seções produzidas.</li>
                        <li>• Use as observações para pedir integrações, animações ou componentes específicos.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-3xl border border-rose-400/50 bg-rose-500/10 px-5 py-4 text-sm text-rose-100 shadow-[0_18px_48px_rgba(244,63,94,0.2)]">
                {errorMessage}
              </div>
            )}

            {state.modules.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                {state.modules.map((moduleId) => {
                  const moduleLabel =
                    MODULE_LIBRARY.find((module) => module.id === moduleId)?.label ?? moduleId;
                  return (
                    <div
                      key={moduleId}
                      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%)] opacity-80" />
                      <div className="relative space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Módulo sugerido</p>
                        <p className="text-base text-white">{moduleLabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Próximos passos</p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  • Levar blueprint para o estúdio de design Merse ou alimentar um prompt no gerador de
                  sites.
                </li>
                <li>
                  • Combinar com banners em <span className="underline underline-offset-4">/public/banners</span>{" "}
                  para apresentar o fluxo completo ao cliente.
                </li>
                <li>• Exportar o briefing como PDF (em breve).</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
