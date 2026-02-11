import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PiBrowsersFill,
  PiPaletteFill,
  PiSparkleFill,
  PiStarFourFill,
  PiUploadSimpleFill,
  PiQuestionFill,
  PiPaperPlaneTiltFill,
  PiXBold,
  PiCopySimpleFill,
  PiCheckBold,
} from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";
import PromptChat from "@/components/PromptChat";

type LayoutPreset = {
  id: string;
  label: string;
  description: string;
  hero: string;
  objective: string;
  details: string[];
};

type AnimationPreset = {
  id: string;
  label: string;
  description: string;
  html: string;
};

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "code-only",
    label: "Estrutura em Código",
    description: "Gera apenas HTML + CSS Merse.",
    hero: "/banners/Merse-4.png",
    objective: "Criar a base rapidamente e personalizar depois.",
    details: [
      "Somente estrutura: seções, CTA e grid responsivo em código puro.",
      "Ideal para quem quer exportar o HTML e integrar manualmente.",
      "Aplica automaticamente o tema dark cósmico e a paleta escolhida.",
      "Não chama motores de IA — resultado instantâneo.",
      "Serve como blueprint inicial antes de adicionar mídia.",
    ],
  },
  {
    id: "image-hero",
    label: "Site + Imagem IA",
    description: "Cria o site e gera o hero com IA.",
    hero: "/banners/Merse-3.png",
    objective: "Adicionar impacto visual sem sair do fluxo.",
    details: [
      "Depois que a estrutura estiver pronta, o hero é gerado via OpenAI.",
      "Mantém as cores e o efeito escolhidos automaticamente.",
      "Indicado para landing pages que precisam de banner estilizado.",
      "Processo guiado: gera primeiro o código, depois a imagem.",
      "Permite refazer o hero quantas vezes quiser.",
    ],
  },
  {
    id: "site-3d",
    label: "Site + Elemento 3D",
    description: "Inclui um elemento Meshy no layout.",
    hero: "/banners/Merse-2.png",
    objective: "Agregar componentes 3D relevantes ao tema.",
    details: [
      "Informe o objeto (ex.: dente, nave, produto) e a Meshy gera o .glb.",
      "O job roda em paralelo e o preview mostra o status “Processando…”.",
      "Ótimo para nichos que precisam de destaque visual 3D (ex.: saúde, tech).",
      "Limita-se a 1–2 elementos por página para manter performance.",
      "É possível baixar o modelo e renderizar em Three.js ou apenas disponibilizar o link.",
    ],
  },
];

const COLOR_SYSTEMS = [
  { id: "neon", label: "Neon Galaxy", preview: "Roxo • Azul • Magenta" },
  { id: "aurora", label: "Aurora Boreal", preview: "Verde • Ciano • Lilás" },
  { id: "void", label: "Void Minimal", preview: "Preto • Cinza profundo • Branco" },
  { id: "sunset", label: "Sunset Nova", preview: "Laranja • Rosa • Roxo" },
];

const CUSTOM_PALETTE_ID = "custom";
const CUSTOM_PALETTE_LABEL = "Cores personalizadas";

const MODULE_LIBRARY = [
  { id: "hero", label: "Hero 3D animado" },
  { id: "pricing", label: "Tabela de planos" },
  { id: "workflow", label: "Workflow visual" },
  { id: "portfolio", label: "Portfólio Merse" },
  { id: "faq", label: "FAQ interativo" },
  { id: "cta", label: "Banner CTA cósmico" },
];

const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "waves-canvas",
    label: "Merse Tide",
    description: "Ondas suaves seguem o mouse usando Canvas.",
    html: `
<canvas id="merse-waves" style="position:fixed;inset:0;z-index:-1;"></canvas>
<script>
const canvas=document.getElementById("merse-waves");
const ctx=canvas.getContext("2d");
let w,h,mouse={x:0,y:0};
function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;}
window.addEventListener("resize",resize);resize();
window.addEventListener("pointermove",e=>{mouse.x=e.clientX;mouse.y=e.clientY;});
function draw(){
ctx.clearRect(0,0,w,h);
for(let i=0;i<4;i++){
const offset=i*30;
ctx.beginPath();
for(let x=0;x<=w;x+=20){
const y=h/2+Math.sin((x+offset)/40)*25*Math.cos(Date.now()/1000+i)+ (mouse.y-h/2)/8;
if(x===0){ctx.moveTo(x,y);}else{ctx.lineTo(x,y);}
}
ctx.strokeStyle=\`rgba(168,85,247,\${0.2+(i*0.1)})\`;
ctx.lineWidth=1.5;
ctx.stroke();
}
requestAnimationFrame(draw);
}
draw();
</script>`,
  },
  {
    id: "particles-trail",
    label: "Stellar Trail",
    description: "Pontinhos de luz seguem o cursor e somem.",
    html: `
<canvas id="merse-trail" style="position:fixed;inset:0;z-index:-1;"></canvas>
<script>
const canvasTrail=document.getElementById("merse-trail");
const ctxTrail=canvasTrail.getContext("2d");
let particles=[];
function resizeTrail(){canvasTrail.width=window.innerWidth;canvasTrail.height=window.innerHeight;}
window.addEventListener("resize",resizeTrail);resizeTrail();
window.addEventListener("pointermove",e=>{
for(let i=0;i<3;i++){
particles.push({x:e.clientX,y:e.clientY,alpha:1,dx:(Math.random()-0.5)*2,dy:(Math.random()-0.5)*2});
}
});
function loopTrail(){
ctxTrail.fillStyle="rgba(2,1,10,0.2)";
ctxTrail.fillRect(0,0,canvasTrail.width,canvasTrail.height);
particles.forEach((p,index)=>{
p.x+=p.dx;p.y+=p.dy;p.alpha-=0.01;
ctxTrail.fillStyle=\`rgba(255,255,255,\${p.alpha})\`;
ctxTrail.fillRect(p.x,p.y,2,2);
if(p.alpha<=0)particles.splice(index,1);
});
requestAnimationFrame(loopTrail);
}
loopTrail();
</script>`,
  },
  {
    id: "click-rings",
    label: "Pulse Orbit",
    description: "Cliques criam círculos que se expandem.",
    html: `
<div id="merse-click-layer" style="position:fixed;inset:0;z-index:-1;overflow:hidden;"></div>
<style>
.merse-ring{position:absolute;border:1px solid rgba(236,72,153,0.6);border-radius:999px;animation:merseRing 0.6s ease-out forwards;}
@keyframes merseRing{to{transform:scale(8);opacity:0;}}
</style>
<script>
const ringLayer=document.getElementById("merse-click-layer");
window.addEventListener("click",e=>{
const ring=document.createElement("span");
ring.className="merse-ring";
ring.style.left=e.clientX+"px";
ring.style.top=e.clientY+"px";
ringLayer.appendChild(ring);
setTimeout(()=>ring.remove(),600);
});
</script>`,
  },
  {
    id: "svg-waves",
    label: "Aurora Drift",
    description: "Ondas translúcidas se movem no fundo.",
    html: `
<svg style="position:fixed;inset:0;z-index:-1;" viewBox="0 0 800 400" preserveAspectRatio="none">
  <defs>
    <linearGradient id="merseWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(79,70,229,0.4)"/>
      <stop offset="50%" stop-color="rgba(236,72,153,0.3)"/>
      <stop offset="100%" stop-color="rgba(14,165,233,0.4)"/>
    </linearGradient>
  </defs>
  <path id="merse-svg-wave" d="M0 220 Q200 170 400 220 T800 220 V400 H0 Z" fill="url(#merseWaveGrad)">
    <animate
      attributeName="d"
      dur="12s"
      repeatCount="indefinite"
      values="
        M0 220 Q200 170 400 220 T800 220 V400 H0 Z;
        M0 180 Q200 230 400 170 T800 210 V400 H0 Z;
        M0 200 Q200 190 400 210 T800 230 V400 H0 Z;
        M0 220 Q200 170 400 220 T800 220 V400 H0 Z
      "
    />
  </path>
</svg>`,
  },
  {
    id: "bubbles",
    label: "Nebula Bubbles",
    description: "Bolhas sobem lentamente no background.",
    html: `
<style>
.merse-bubbles::before,
.merse-bubbles::after{
content:"";
position:fixed;
inset:0;
background:radial-gradient(circle,rgba(255,255,255,0.2) 4px,transparent 8px);
background-size:120px 120px;
animation:merseBubbles 18s linear infinite;
pointer-events:none;
}
.merse-bubbles::after{
animation-duration:25s;
opacity:0.5;
}
@keyframes merseBubbles{
from{transform:translateY(0);}
to{transform:translateY(-120px);}
}
</style>
<div class="merse-bubbles"></div>`,
  },
];

const extractHtmlFromOutput = (output: unknown): string | null => {
  if (!output) return null;
  if (typeof output === "string") {
    return output.trim().startsWith("<") ? output : null;
  }
  if (Array.isArray(output)) {
    for (const entry of output) {
      const html = extractHtmlFromOutput(entry);
      if (html) return html;
    }
    return null;
  }
  if (typeof output === "object") {
    const withHtml = (output as { html?: unknown; content?: unknown }).html ?? (output as any).content;
    if (withHtml) return extractHtmlFromOutput(withHtml);
  }
  return null;
};

const STELLAR_POINTS = Array.from({ length: 18 }, (_, index) => ({
  left: (index * 11.3) % 100,
  top: (index * 17.7) % 100,
}));

const BUBBLE_POINTS = Array.from({ length: 8 }, (_, index) => ({
  left: (index * 12.5) % 100,
  bottom: 10 + ((index * 17) % 30),
}));

const AnimationPreview = ({ animationId }: { animationId: string }) => {
  if (animationId === "waves-canvas") {
    return (
      <div className="animation-preview animation-preview--waves">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={`wave-${index.toString()}`}
            className="preview-wave"
            style={{
              top: `${25 + index * 15}%`,
              animationDelay: `${index * 0.4}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (animationId === "particles-trail") {
    return (
      <div className="animation-preview animation-preview--particles">
        {STELLAR_POINTS.map((point, index) => (
          <span
            key={`particle-${index.toString()}`}
            className="preview-particle"
            style={{
              left: `${point.left}%`,
              top: `${point.top}%`,
              animationDelay: `${index * 0.08}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (animationId === "click-rings") {
    return (
      <div className="animation-preview animation-preview--rings">
        {[0, 1, 2].map((index) => (
          <span
            key={`ring-${index.toString()}`}
            className="preview-ring"
            style={{
              left: `${50 + index * 6}%`,
              top: `${50 - index * 6}%`,
              animationDelay: `${index * 0.25}s`,
            }}
          />
        ))}
        <span className="preview-core" />
      </div>
    );
  }

  if (animationId === "svg-waves") {
    return <div className="animation-preview animation-preview--aurora" />;
  }

  return (
    <div className="animation-preview animation-preview--bubbles">
      {BUBBLE_POINTS.map((point, index) => (
        <span
          key={`bubble-${index.toString()}`}
          className="preview-bubble"
          style={{
            left: `${point.left}%`,
            bottom: `${point.bottom}%`,
            animationDelay: `${index * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
};

type FormState = {
  siteName: string;
  goal: string;
  menu: string;
  layout: LayoutPreset;
  palette: string;
  paletteDescription: string;
  modules: string[];
  notes: string;
  heroMood: string;
  animation: AnimationPreset;
};

type WebsiteResult = {
  summary: string;
  highlights: string[];
  html: string;
  imageUrl?: string;
  effect?: {
    id?: string;
    name?: string;
    intensity?: number;
  } | null;
  animation?: {
    id?: string;
    label?: string;
  } | null;
};

type BlueprintSection = {
  id: string;
  type: "hero" | "features" | "gallery" | "pricing" | "contact" | "custom";
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type BlueprintPage = {
  id: string;
  slug: string;
  title: string;
  seoDescription?: string;
  sections: BlueprintSection[];
};

type BlueprintResult = {
  projectId: string;
  source: "openai" | "fallback";
  projectName: string;
  brief: string;
  tone: string;
  audience: string;
  cta: string;
  brandColors: string[];
  pages: BlueprintPage[];
};

const defaultState: FormState = {
  siteName: "Projeto Merse",
  goal: "Landing page para lançamento de IA",
  menu: "Início, Recursos, Planos, Comunidade, Contato",
  layout: LAYOUT_PRESETS[0],
  palette: COLOR_SYSTEMS[0].id,
  paletteDescription: "",
  modules: ["hero", "pricing", "cta"],
  notes: "Foco em experiência imersiva, CTA claro e narrativa em três blocos.",
  heroMood: "Nebulosa violeta com partículas e hologramas leves",
  animation: ANIMATION_PRESETS[0],
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
    tagline: "Escolha animação e detalhes criativos.",
  },
];

export default function RascunhoWebsite() {
  const energy = useEnergy();
  const [state, setState] = useState<FormState>(defaultState);
  const [lastPalettePreset, setLastPalettePreset] = useState(defaultState.palette);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRenderingWebsite, setIsRenderingWebsite] = useState(false);
  const [blueprintResult, setBlueprintResult] = useState<BlueprintResult | null>(null);
  const [blueprintCopyStatus, setBlueprintCopyStatus] = useState<"idle" | "copied">("idle");
  const [result, setResult] = useState<WebsiteResult | null>(null);
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [quickBrief, setQuickBrief] = useState("");
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [sitePrediction, setSitePrediction] = useState<{
    id: string;
    status: string;
    html?: string | null;
    logs?: string | null;
    rawOutput?: unknown;
  } | null>(null);
  const [isGeneratingSite, setIsGeneratingSite] = useState(false);
  const [siteGenerationError, setSiteGenerationError] = useState<string | null>(null);
  const [siteCopyStatus, setSiteCopyStatus] = useState<"idle" | "copied">("idle");

  const paletteInfo = useMemo(() => {
    if (state.palette === CUSTOM_PALETTE_ID) {
      return {
        id: CUSTOM_PALETTE_ID,
        label: CUSTOM_PALETTE_LABEL,
        preview: state.paletteDescription || "Definido manualmente",
      };
    }
    return COLOR_SYSTEMS.find((palette) => palette.id === state.palette);
  }, [state.palette, state.paletteDescription]);
  const hasResult = Boolean(result);
  const siteHtml = sitePrediction?.html ?? null;
  const currentStep = useMemo(
    () => STEPS.find((step) => step.id === activeStep) ?? STEPS[0],
    [activeStep],
  );

  useEffect(() => {
    setCopyStatus("idle");
  }, [result?.html, activeView]);

  useEffect(() => {
    setSiteCopyStatus("idle");
  }, [sitePrediction?.html]);

  useEffect(() => {
    setBlueprintCopyStatus("idle");
  }, [blueprintResult?.projectId]);

  useEffect(() => {
    if (state.palette && state.palette !== CUSTOM_PALETTE_ID) {
      setLastPalettePreset(state.palette);
    }
  }, [state.palette]);

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

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const handlePaletteSelect = (paletteId: string) => {
    setLastPalettePreset(paletteId);
    setState((prev) => ({
      ...prev,
      palette: paletteId,
      paletteDescription: "",
    }));
  };

  const handlePaletteDescriptionChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      paletteDescription: value,
      palette: value.trim().length > 0 ? CUSTOM_PALETTE_ID : lastPalettePreset,
    }));
  };

  const buildSitePrompt = () => {
    const lines = [
      `Gere um site completo no padrão Merse.`,
      `Nome do projeto: ${state.siteName}.`,
      state.goal ? `Objetivo: ${state.goal}.` : null,
      state.menu ? `Menu sugerido: ${state.menu}.` : null,
      `Layout base: ${state.layout.label} — ${state.layout.description}.`,
      state.layout.objective ? `Objetivo do layout: ${state.layout.objective}.` : null,
      state.layout.details.length
        ? `Diretrizes: ${state.layout.details.slice(0, 4).join(" | ")}.`
        : null,
      paletteInfo?.label ? `Paleta: ${paletteInfo.label} (${paletteInfo.preview ?? "custom"}).` : null,
      state.paletteDescription ? `Cores personalizadas: ${state.paletteDescription}.` : null,
      state.modules.length ? `Seções desejadas: ${state.modules.join(", ")}.` : null,
      state.notes ? `Observações extras: ${state.notes}.` : null,
      state.heroMood ? `Mood do hero: ${state.heroMood}.` : null,
      state.animation?.label ? `Animação/Fundo: ${state.animation.label}.` : null,
      `Retorne o site em HTML completo, com CSS inline e responsividade.`,
    ];

    return lines.filter((line): line is string => Boolean(line)).join("\n");
  };

  const buildBasePayload = () => ({
    siteName: state.siteName,
    goal: state.goal,
    menu: state.menu,
  layout: {
    id: state.layout.id,
    label: state.layout.label,
    description: state.layout.description,
    objective: state.layout.objective,
    highlights: state.layout.details,
  },
    palette: {
      id: state.palette,
      label: paletteInfo?.label ?? state.palette,
      preview: paletteInfo?.preview ?? "",
    },
    paletteDescription: state.paletteDescription,
    modules: state.modules.map(
      (moduleId) => MODULE_LIBRARY.find((module) => module.id === moduleId)?.label ?? moduleId,
    ),
    notes: state.notes,
    heroMood: state.heroMood,
    animation: {
      id: state.animation.id,
      label: state.animation.label,
      description: state.animation.description,
      html: state.animation.html,
    },
  });

  const slugify = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

  const inferBrandColors = () => {
    const explicit = state.paletteDescription
      .split(/[,\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (explicit.length > 0) return explicit.slice(0, 8);

    const palettePreview = `${paletteInfo?.preview ?? ""}`
      .replace(/[•|]/g, ",")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return palettePreview.length > 0 ? palettePreview.slice(0, 8) : ["roxo", "azul"];
  };

  const inferAudience = () => {
    if (!state.goal.trim()) return "Visitantes interessados no portal";
    return `Pessoas interessadas em ${state.goal.trim().toLowerCase()}`;
  };

  const inferTone = () => {
    const combined = `${state.layout.label} ${state.layout.description} ${state.notes}`.toLowerCase();
    if (combined.includes("minimal")) return "minimalista";
    if (combined.includes("corp")) return "corporativo";
    if (combined.includes("lux")) return "luxo";
    return "futurista";
  };

  const inferCta = () => {
    if (state.modules.includes("pricing")) return "Ver planos";
    if (state.modules.includes("portfolio")) return "Conhecer projetos";
    return "Falar com a equipe";
  };

  const buildSeedPagesFromMenu = () => {
    const labels = state.menu
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 6);

    return labels.map((label, index) => ({
      id: index === 0 ? "home" : slugify(label) || `pagina-${index + 1}`,
      slug: index === 0 ? "/" : `/${slugify(label) || `pagina-${index + 1}`}`,
      title: label,
      seoDescription: `${label} - ${state.siteName}`,
      sections: [
        {
          id: "hero",
          type: "hero",
          title: label,
          description: state.goal,
          ctaLabel: inferCta(),
          ctaHref: "#contato",
        },
      ],
    }));
  };

  const buildBlueprintPayload = (briefOverride?: string) => {
    const menuSeed = buildSeedPagesFromMenu();
    const briefSource = (briefOverride ?? "").trim();
    const detailBrief = [
      state.goal,
      state.notes,
      state.heroMood ? `Mood visual: ${state.heroMood}` : "",
      state.layout.objective ? `Objetivo de layout: ${state.layout.objective}` : "",
    ]
      .filter((item) => item && item.trim().length > 0)
      .join("\n");

    return {
      project_name: state.siteName || "Projeto Merse",
      brief: briefSource || detailBrief || "Blueprint de site Merse com foco em conversão.",
      brand_colors: inferBrandColors().join(", "),
      tone: inferTone(),
      audience: inferAudience(),
      cta: inferCta(),
      features_json: JSON.stringify({
        preview: true,
        seo: true,
        auth: state.modules.includes("pricing"),
        cms: state.modules.includes("portfolio"),
      }),
      pages_json: JSON.stringify(menuSeed),
    };
  };

  const requestBlueprint = async (briefOverride?: string) => {
    const payload = buildBlueprintPayload(briefOverride);
    const response = await fetch("/api/site-blueprint/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível gerar o wireframe agora.");
    }

    const pages = Array.isArray(data.pages) ? (data.pages as BlueprintPage[]) : [];
    const blueprint = (data.blueprint ?? {}) as {
      project_name?: string;
      brief?: string;
      tone?: string;
      audience?: string;
      cta?: string;
      brand_colors?: string[];
    };

    const normalizedBlueprint: BlueprintResult = {
      projectId:
        typeof data.project_id === "string" && data.project_id.trim().length > 0
          ? data.project_id
          : "site-blueprint",
      source: data.source === "openai" ? "openai" : "fallback",
      projectName: blueprint.project_name ?? state.siteName,
      brief: blueprint.brief ?? payload.brief,
      tone: blueprint.tone ?? payload.tone,
      audience: blueprint.audience ?? payload.audience,
      cta: blueprint.cta ?? payload.cta,
      brandColors: Array.isArray(blueprint.brand_colors)
        ? blueprint.brand_colors.filter((entry): entry is string => typeof entry === "string")
        : inferBrandColors(),
      pages,
    };

    setBlueprintResult(normalizedBlueprint);
    return normalizedBlueprint;
  };

  const generateWebsiteFromBlueprint = async (briefOverride?: string) => {
    if (!blueprintResult) {
      throw new Error("Gere o wireframe antes de montar o site completo.");
    }

    const payload = {
      ...buildBasePayload(),
      goal: state.goal || "Geração completa a partir do blueprint",
      notes: state.notes,
      rawBrief: briefOverride ?? blueprintResult.brief,
      blueprint: {
        project_name: blueprintResult.projectName,
        brief: blueprintResult.brief,
        tone: blueprintResult.tone,
        audience: blueprintResult.audience,
        cta: blueprintResult.cta,
        brand_colors: blueprintResult.brandColors,
        pages: blueprintResult.pages,
      },
      projectId: blueprintResult.projectId,
    };

    const response = await fetch("/api/generate-website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível gerar o site completo agora.");
    }

    setResult(data.website);
    setActiveView("preview");
    setCopyStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setQuickError(null);
    setResult(null);
    setCopyStatus("idle");

    if (energy.plan === "free") {
      setErrorMessage("O plano Free não permite gerar blueprints de sites. Atualize seu plano para usar o laboratório Merse.");
      setIsSubmitting(false);
      return;
    }

    try {
      await requestBlueprint();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado ao gerar blueprint.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickGenerate = async () => {
    const trimmed = quickBrief.trim();

    if (!trimmed) {
      setQuickError("Descreva rapidamente como deseja o site para gerar automaticamente.");
      return;
    }

    if (energy.plan === "free") {
      setQuickError("O laboratório textual está disponível apenas para planos pagos. Atualize para liberar geração ilimitada.");
      return;
    }

    setQuickError(null);
    setErrorMessage(null);
    setIsQuickGenerating(true);
    setIsSubmitting(true);
    setResult(null);
    setCopyStatus("idle");

    try {
      await requestBlueprint(trimmed);
    } catch (quickErrorResponse) {
      setQuickError(
        quickErrorResponse instanceof Error
          ? quickErrorResponse.message
          : "Erro inesperado ao gerar wireframe via texto.",
      );
    } finally {
      setIsQuickGenerating(false);
      setIsSubmitting(false);
    }
  };

  const handleGenerateWebsiteFromBlueprint = async () => {
    if (energy.plan === "free") {
      setErrorMessage("Atualize seu plano para gerar o site completo a partir do wireframe.");
      return;
    }

    setIsRenderingWebsite(true);
    setErrorMessage(null);

    try {
      await generateWebsiteFromBlueprint();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao montar o site completo a partir do wireframe.",
      );
    } finally {
      setIsRenderingWebsite(false);
    }
  };

  const handleWebsiteGeneratedFromChat = (website: WebsiteResult) => {
    setResult(website);
    setActiveView("preview");
    setCopyStatus("idle");
    setErrorMessage(null);
    setQuickError(null);
    setIsAssistantOpen(false);
  };

  const handleGenerateSiteWithReplicate = async () => {
    if (energy.plan === "free") {
      setSiteGenerationError("Atualize seu plano para usar o motor Merse hospedado na Replicate.");
      return;
    }

    setIsGeneratingSite(true);
    setSiteGenerationError(null);
    setSitePrediction(null);

    const sitePrompt = buildSitePrompt();

    try {
      const response = await fetch("/api/generate-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sitePrompt }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o site pelo modelo Merse.");
      }

      const html = extractHtmlFromOutput(data.output);
      setSitePrediction({
        id: data.id ?? "site-merse",
        status: data.status ?? "unknown",
        html,
        logs: typeof data.logs === "string" ? data.logs : undefined,
        rawOutput: data.output,
      });
    } catch (error) {
      setSiteGenerationError(
        error instanceof Error ? error.message : "Falha inesperada ao falar com a Replicate.",
      );
    } finally {
      setIsGeneratingSite(false);
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
              Defina tom, animação e estética. O laboratório gera uma arquitetura pronta para apresentar
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
                            onClick={() => handlePaletteSelect(palette.id)}
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
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm text-white/80">
                      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                        <PiPaletteFill className="text-purple-300" />
                        Descreva suas cores predominantes
                      </label>
                      <textarea
                        value={state.paletteDescription}
                        onChange={(event) => handlePaletteDescriptionChange(event.target.value)}
                        className="min-h-[70px] w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        placeholder="Ex.: Preto absoluto com detalhes em azul elétrico e acentos magenta neon."
                      />
                      <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                        Caso não queira usar as paletas prontas, escreva aqui as cores que iremos usar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      <PiSparkleFill className="text-purple-300" />
                      Animações Merse
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {ANIMATION_PRESETS.map((animation) => {
                        const isActive = state.animation.id === animation.id;
                        return (
                          <button
                            key={animation.id}
                            type="button"
                            onClick={() => handleChange("animation", animation)}
                            className={`relative overflow-hidden rounded-2xl border px-4 py-5 text-left transition ${
                              isActive
                                ? "border-purple-300/60 text-white shadow-[0_0_30px_rgba(168,85,247,0.35)]"
                                : "border-white/10 text-white/70 hover:border-purple-300/40 hover:text-white"
                            }`}
                          >
                            <AnimationPreview animationId={animation.id} />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent" />
                            <div className="relative z-10 space-y-2">
                              <span className="text-base font-semibold">{animation.label}</span>
                              <p className="text-sm text-white/80">{animation.description}</p>
                              <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">
                                HTML pronto será inserido no blueprint.
                              </span>
                            </div>
                          </button>
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
                    {isSubmitting ? "Gerando wireframe..." : "Gerar wireframe"}
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
                    <span className="text-white/60">Cores predominantes:</span>{" "}
                    <span className="text-white">
                      {state.paletteDescription
                        ? state.paletteDescription
                        : "Você pode escrever suas cores no passo 2."}
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
                    <span className="text-white/60">Animação escolhida:</span>{" "}
                    <span className="text-white">{state.animation.label}</span>
                  </li>
                </ul>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                  Ajuste qualquer passo a qualquer momento — o resumo acompanha suas escolhas.
                </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.08)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(236,72,153,0.25),transparent_60%)] opacity-80" />
            <div className="relative space-y-4">
              <header className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Gerar via texto</p>
                <h2 className="text-xl font-semibold text-white">Descreva e receba o wireframe em segundos</h2>
                <p className="text-sm text-white/70">
                  Envie um briefing livre para gerar páginas e seções do seu portal. Depois, se quiser,
                  você transforma o wireframe em HTML completo com um clique.
                </p>
              </header>
              <textarea
                value={quickBrief}
                onChange={(event) => setQuickBrief(event.target.value)}
                placeholder="Ex.: Quero um site para vender minha inteligência artificial de roupas. Preciso de hero com vídeo, depoimentos e tabela de planos neon."
                className="min-h-[140px] w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/35 shadow-inner focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                disabled={isSubmitting || isRenderingWebsite}
              />
              {quickError && (
                <p className="text-xs font-semibold text-rose-200">{quickError}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleQuickGenerate}
                  disabled={isQuickGenerating || isSubmitting || isRenderingWebsite}
                  className="flex min-w-[200px] flex-1 items-center justify-center gap-2 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-5 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_45px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PiPaperPlaneTiltFill
                    className={`text-base ${isQuickGenerating ? "animate-pulse" : ""}`}
                  />
                  {isQuickGenerating ? "Gerando wireframe..." : "Gerar wireframe via texto"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  <PiQuestionFill className="text-base text-purple-200" />
                  Abrir chat do laboratório
                </button>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_55%)] opacity-80" />
            <div className="relative space-y-5">
              <header>
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Blueprint em segundos</p>
                <h2 className="text-2xl font-semibold text-white">Wireframe completo do portal</h2>
              </header>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/70">
                {isSubmitting ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-8 rounded-xl bg-white/10" />
                    <div className="h-14 rounded-xl bg-white/10" />
                    <div className="h-14 rounded-xl bg-white/10" />
                    <div className="h-14 rounded-xl bg-white/10" />
                  </div>
                ) : blueprintResult ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.32em]">
                      <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-white/70">
                        Projeto {blueprintResult.projectId}
                      </span>
                      <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-cyan-100/85">
                        Fonte: {blueprintResult.source}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Tom</p>
                        <p className="mt-2 text-white">{blueprintResult.tone}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">CTA</p>
                        <p className="mt-2 text-white">{blueprintResult.cta}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {blueprintResult.pages.map((page) => (
                        <article
                          key={page.id}
                          className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{page.title}</p>
                            <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60">
                              {page.slug}
                            </span>
                          </div>
                          {page.seoDescription ? (
                            <p className="text-xs text-white/65">{page.seoDescription}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            {page.sections.map((section) => (
                              <span
                                key={`${page.id}-${section.id}`}
                                className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-cyan-100/85"
                              >
                                {section.type}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateWebsiteFromBlueprint}
                        disabled={isRenderingWebsite}
                        className="inline-flex items-center gap-2 rounded-full border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PiSparkleFill className={`text-base ${isRenderingWebsite ? "animate-spin" : ""}`} />
                        {isRenderingWebsite ? "Montando site..." : "Gerar site completo"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!blueprintResult) return;
                          try {
                            await navigator.clipboard.writeText(JSON.stringify(blueprintResult.pages, null, 2));
                            setBlueprintCopyStatus("copied");
                            setTimeout(() => setBlueprintCopyStatus("idle"), 2500);
                          } catch (copyError) {
                            console.warn("Não foi possível copiar o wireframe:", copyError);
                            setBlueprintCopyStatus("idle");
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
                      >
                        {blueprintCopyStatus === "copied" ? (
                          <>
                            <PiCheckBold />
                            Copiado
                          </>
                        ) : (
                          <>
                            <PiCopySimpleFill />
                            Copiar JSON
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>
                    Descreva seu portal e gere o wireframe para visualizar páginas, seções e estrutura
                    antes de renderizar o HTML final.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.2),transparent_55%)] opacity-80" />
            <div className="relative space-y-5">
              <header>
                  <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">
                    Laboratório Merse
                  </p>
                  <h2 className="text-2xl font-semibold text-white">Site completo (opcional)</h2>
                </header>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/70">
                  {isRenderingWebsite ? (
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

                      {result.effect?.name && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Efeito aplicado</p>
                          <p className="text-sm text-white/80">
                            {result.effect.name} · intensidade {result.effect.intensity ?? "default"}
                          </p>
                        </div>
                      )}

                      {result.animation?.label && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                            Camada animada
                          </p>
                          <p className="text-sm text-white/80">{result.animation.label}</p>
                        </div>
                      )}

                      {result.imageUrl && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                            Visual gerado
                          </p>
                          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40">
                            <img
                              src={result.imageUrl}
                              alt="Visual conceitual gerado automaticamente"
                              className="h-full w-full object-cover"
                            />
                          </div>
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
                        Gere o wireframe primeiro. Depois clique em <span className="text-white">Gerar site completo</span> para receber
                        HTML + CSS estilizados no padrão intergaláctico.
                      </p>
                      <ul className="space-y-2">
                        <li>• Ajuste paleta e layout para direcionar o tom do código final.</li>
                        <li>• O blueprint guia a ordem das páginas e seções no HTML.</li>
                        <li>• Use observações para pedir integrações, animações ou componentes específicos.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.06)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_55%)] opacity-70" />
              <div className="relative space-y-4">
                <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-purple-200/70">Fluxo Merse</p>
                    <h2 className="text-xl font-semibold text-white">Site renderizado via Replicate</h2>
                    <p className="text-sm text-white/65">
                      O motor Merse hospedado na Replicate monta o HTML final com animações e componentes
                      cósmicos prontos para o Builder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSiteWithReplicate}
                    disabled={isGeneratingSite}
                    className="inline-flex items-center gap-2 rounded-full border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PiSparkleFill className={`text-base ${isGeneratingSite ? "animate-spin" : ""}`} />
                    {isGeneratingSite ? "Gerando..." : "Gerar com modelo Merse"}
                  </button>
                </header>

                {siteGenerationError && (
                  <p className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                    {siteGenerationError}
                  </p>
                )}

                {sitePrediction && (
                  <div className="space-y-3 text-sm text-white/75">
                    <p>
                      <span className="text-white/55">Status:</span> {sitePrediction.status}
                    </p>
                    <p className="text-xs text-white/50">ID: {sitePrediction.id}</p>
                  </div>
                )}

                {siteHtml ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Preview final</p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!siteHtml) return;
                          try {
                            await navigator.clipboard.writeText(siteHtml);
                            setSiteCopyStatus("copied");
                            setTimeout(() => setSiteCopyStatus("idle"), 2500);
                          } catch (copyError) {
                            console.warn("Não foi possível copiar o HTML replicado:", copyError);
                            setSiteCopyStatus("idle");
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
                      >
                        {siteCopyStatus === "copied" ? (
                          <>
                            <PiCheckBold />
                            Copiado
                          </>
                        ) : (
                          <>
                            <PiCopySimpleFill />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/80">
                      <iframe
                        key={sitePrediction?.id ?? "merse-replicate"}
                        title="Preview replicado"
                        srcDoc={siteHtml}
                        className="h-[480px] w-full border-0 bg-white"
                      />
                    </div>
                  </div>
                ) : sitePrediction ? (
                  <pre className="max-h-[320px] overflow-auto rounded-2xl border border-white/10 bg-black/70 p-4 text-xs text-white/70">
                    {JSON.stringify(sitePrediction.rawOutput ?? sitePrediction, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-white/65">
                    Gere o blueprint e, quando estiver pronto para ver o site real, clique em “Gerar com
                    modelo Merse”. O HTML final aparece aqui, pronto para copiar.
                  </p>
                )}

                {sitePrediction?.logs && (
                  <details className="rounded-2xl border border-white/10 bg-black/55 p-4 text-xs text-white/70">
                    <summary className="cursor-pointer text-white">Logs da Replicate</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">{sitePrediction.logs}</pre>
                  </details>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-3xl border border-rose-400/50 bg-rose-500/10 px-5 py-4 text-sm text-rose-100 shadow-[0_18px_48px_rgba(244,63,94,0.2)]">
                {errorMessage}
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

      <AnimatePresence>
        {isAssistantOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-black/0"
              onClick={() => setIsAssistantOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="fixed bottom-8 right-8 z-50 w-full max-w-md"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
            >
              <div className="relative flex h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/85 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(false)}
                  className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition hover:border-white/40 hover:bg-white/20 hover:text-white"
                  aria-label="Fechar assistente galáctico"
                >
                  <PiXBold className="text-base" />
                </button>
                <div className="h-full overflow-hidden px-4 pb-4 pt-10">
                  <PromptChat
                    embedded
                    storageKey="merse.chat.website"
                    mode="website"
                    onWebsiteGenerated={handleWebsiteGeneratedFromChat}
                  />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
