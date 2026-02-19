import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  PiInstagramLogoFill,
  PiWhatsappLogoFill,
  PiBuildingsFill,
  PiTShirtFill,
  PiSwapFill,
  PiBrowsersFill,
  PiTrophyFill,
  PiVideoFill,
  PiCubeFocusFill,
  PiMaskHappyFill,
  PiChatsFill,
  PiImageFill as PiImageFillIcon,
  PiCodeFill,
  PiDownloadSimpleFill,
} from "react-icons/pi";
import { isDesktopApp } from "@/utils/isDesktopApp";

const moduleIconMap = {
  "videos-empresas": PiBuildingsFill,
  "video-roupas": PiTShirtFill,
  "trocar-generos": PiSwapFill,
  "rascunhos-website": PiBrowsersFill,
  ranking: PiTrophyFill,
  "gerar-video": PiVideoFill,
  "gerar-objeto": PiCubeFocusFill,
  "gerar-foto": PiImageFillIcon,
  "criar-personagem": PiMaskHappyFill,
  chat: PiChatsFill,
  "codex-studio": PiCodeFill,
  "projeto-online": PiCodeFill,
  "merse-desktop": PiDownloadSimpleFill,
  "site-ia": PiBrowsersFill,
  pricing: PiTrophyFill,
  "dev-hub": PiCodeFill,
  status: PiBrowsersFill,
  "loop-ads-api": PiCodeFill,
  loop: PiCodeFill,
  "video-ads-api": PiCodeFill,
  "goal-image-api": PiImageFillIcon,
  "site-blueprint-api": PiBrowsersFill,
  showcase: PiImageFillIcon,
  "canvas-ia": PiBrowsersFill,
  "voz-ia": PiChatsFill,
  "agent-swarm": PiCodeFill,
  "memoria-marca": PiImageFillIcon,
  "ab-lab": PiTrophyFill,
  "cena-infinita": PiVideoFill,
  "trend-oraculo": PiTrophyFill,
  "prompt-genoma": PiCodeFill,
  "focus-group-ia": PiChatsFill,
  "roteiro-vivo": PiVideoFill,
  "orbita-release": PiInstagramLogoFill,
  "multi-cena-produto": PiImageFillIcon,
} as const;

type ModuleKey = keyof typeof moduleIconMap;

const whatsappLink =
  "https://api.whatsapp.com/send/?phone=5562982775813&text=%C3%93l%C3%A1!%20Vim%20da%20Merse%20e%20quero%20conversar%20sobre%20cria%C3%A7%C3%B5es%20com%20IA.&type=phone_number&app_absent=0";
const instagramLink =
  "https://www.instagram.com/merse.ai/?utm_source=ig_web_button_share_sheet";

const bannerTiles = [
  {
    title: "MERSE – Photon Forge",
    description: "Transforme prompts em visuais épicos com nosso motor de IA ultra preciso.",
    cta: "Explorar visual",
    href: "/gerar-foto",
    image: "/banners/GERAR-FOTO/GERAR-FOTO1.png",
    gradient: "from-purple-500/60 via-fuchsia-500/40 to-transparent",
  },
  {
    title: "Objetos Holográficos",
    description: "Renderize produtos em 3D com iluminação cósmica e superfícies hiper-realistas.",
    cta: "Cenário 3D",
    href: "/gerar-objeto",
    image: "/banners/GERAR-OBJETO/GERAR-OBJETO2.png",
    gradient: "from-blue-500/50 via-indigo-500/30 to-transparent",
  },
  {
    title: "Ranking Estelar",
    description: "Suba na leaderboard com cada criação curtida e ganhe energia cósmica extra.",
    cta: "Mapa estelar",
    href: "/ranking",
    image: "/banners/RANKING/RANKING.png",
    gradient: "from-amber-500/50 via-orange-500/30 to-transparent",
  },
  {
    title: "APIs Públicas Merse",
    description:
      "Conecte seu stack às engines Merse no Replicate e acelere protótipos de imagem, gênero e HTML.",
    cta: "Acessar APIs",
    href: "/apis-publicas",
    image: "/banners/Merse-3.png",
    gradient: "from-emerald-500/55 via-cyan-500/30 to-transparent",
  },
  {
    title: "Blueprint de Sites",
    description: "Descreva o universo do seu site e receba um layout completo em segundos.",
    cta: "Construir portal",
    href: "/rascunhos-website",
    image: "/banners/RASCUNHO-SITE/RASCUNHO-SITE1.png",
    gradient: "from-indigo-500/50 via-purple-500/30 to-transparent",
  },
];

const accentClasses = {
  primary: "bg-white/90 text-black hover:bg-white hover:text-black",
  secondary: "border border-white/30 bg-white/10 text-white hover:border-white/60 hover:bg-white/20",
};

const moduleBlocks: Array<{
  title: string;
  href: string;
  description: string;
  icon: ModuleKey;
  accent: string;
  cta?: string;
  download?: boolean;
}> = [
  // 1. Geração de imagem
  {
    title: "Laboratório de Imagem",
    href: "/gerar-foto",
    description: "Converta prompts em visuais cinematográficos alinhados ao universo Merse.",
    icon: "gerar-foto",
    accent: "from-rose-500/45 via-purple-500/20 to-transparent",
  },
  // 2. Geração de vídeo
  {
    title: "Gerador de Vídeos",
    href: "/gerar-video",
    description: "Combine prompts e referências para lançar trailers e teasers em minutos.",
    icon: "gerar-video",
    accent: "from-blue-500/45 via-indigo-500/20 to-transparent",
  },
  {
    title: "Loop Automation Studio",
    href: "/loop",
    description:
      "Monte fluxos n8n-style para encadear prompt, imagem e APIs de vídeo em um canvas de automação.",
    icon: "loop",
    accent: "from-cyan-500/55 via-blue-500/25 to-transparent",
  },
  // 3. Vídeos corporativos
  {
    title: "Vídeos Corporativos",
    href: "/videos-empresas",
    description: "Produza apresentações imersivas que contam histórias de marca com visual galáctico.",
    icon: "videos-empresas",
    accent: "from-indigo-500/45 via-slate-500/20 to-transparent",
  },
  // 4. Edição de identidade
  {
    title: "Trocar Gênero",
    href: "/trocar-generos",
    description: "Experimente identidades instantaneamente com IA ajustando poses e estilo.",
    icon: "trocar-generos",
    accent: "from-pink-500/45 via-sky-500/20 to-transparent",
  },
  // 5. Vídeo fashion
  {
    title: "Runway Wear",
    href: "/video-roupas",
    description: "Transforme roupas em motion-capture futurista e revele tecidos em 3D.",
    icon: "video-roupas",
    accent: "from-fuchsia-500/45 via-rose-500/20 to-transparent",
  },
  // 7. Produtos 3D
  {
    title: "Objetos 3D",
    href: "/gerar-objeto",
    description: "Crie produtos holográficos e renders orbitais para campanhas.",
    icon: "gerar-objeto",
    accent: "from-teal-500/45 via-emerald-500/20 to-transparent",
  },
  // 8. Sites
  {
    title: "Blueprints de Sites",
    href: "/rascunhos-website",
    description: "Descreva seu portal e receba wireframes completos em segundos.",
    icon: "rascunhos-website",
    accent: "from-violet-500/45 via-cyan-500/20 to-transparent",
  },
  // 9. Mentor de sites
  {
    title: "Mentor IA de Sites",
    href: "/assistente-site",
    description: "Envie screenshots e receba dicas de layout, contraste e hierarquia visual em tempo real.",
    icon: "site-ia",
    accent: "from-indigo-600/45 via-purple-500/30 to-transparent",
  },
  // 10. Site IA
  {
    title: "Site IA",
    href: "/site-ia",
    description: "Crie páginas com IA usando blueprint Merse e preview instantâneo.",
    icon: "site-ia",
    accent: "from-blue-900/60 via-blue-700/45 to-black/65",
  },
  // 11. Codex Studio
  {
    title: "Codex Studio",
    href: "/codex-studio",
    description: "Edite HTML com comandos em português e aplique a estética Merse instantaneamente.",
    icon: "codex-studio",
    accent: "from-purple-500/45 via-indigo-500/20 to-transparent",
  },
  // 12. Projeto Online Live
  {
    title: "Projeto Online Live",
    href: "/projeto-online",
    description:
      "Escolha um projeto, veja runtime visual e edite em tempo real com comandos conectados ao Codex.",
    icon: "projeto-online",
    accent: "from-cyan-500/55 via-emerald-500/28 to-transparent",
  },
  // 12. Codex Merse (VS Code)
  {
    title: "Codex Merse (VS Code)",
    href: "https://marketplace.visualstudio.com/items?itemName=Merse.merse-codex",
    description: "Extensão Merse para editar qualquer linguagem com o estilo da IA Merse.",
    icon: "codex-studio",
    accent: "from-slate-900/60 via-purple-700/35 to-black/70",
  },
  // 13. Dev Hub
  {
    title: "Dev Hub",
    href: "/dev-hub",
    description: "Endpoints, exemplos cURL/JS e status das engines para integrar rápido.",
    icon: "dev-hub",
    accent: "from-sky-500/70 via-cyan-400/55 to-indigo-900/80",
  },
  // 14. Showcase Merse
  {
    title: "Showcase Merse",
    href: "/showcase",
    description: "Galeria curada com filtros por mídia, indústria e popularidade.",
    icon: "showcase",
    accent: "from-fuchsia-500/70 via-amber-400/55 to-purple-900/80",
  },
  // 15. Canvas IA
  {
    title: "Canvas IA",
    href: "/canvas-ia",
    description: "Envie a imagem e receba textos, slogans e layouts autogerados no padrão Merse.",
    icon: "canvas-ia",
    accent: "from-violet-500/70 via-blue-400/55 to-indigo-900/80",
  },
  // 16. Voz IA Imersiva
  {
    title: "Voz IA Imersiva",
    href: "/voz-ia",
    description: "Narre vídeos e apresentações com voz neural estilizada e sync automático.",
    icon: "voz-ia",
    accent: "from-orange-500/70 via-rose-400/55 to-amber-900/80",
  },
  // 17. Agent Swarm
  {
    title: "Agent Swarm Studio",
    href: "/agent-swarm",
    description: "Orquestre múltiplos agentes IA para executar pesquisa, roteiro, visual e publicação em cadeia.",
    icon: "agent-swarm",
    accent: "from-sky-500/65 via-violet-500/45 to-indigo-900/80",
  },
  // 18. Memória de Marca
  {
    title: "Memória de Marca Neural",
    href: "/memoria-de-marca",
    description: "Treine uma memória visual da sua marca e aplique o mesmo estilo em todas as gerações.",
    icon: "memoria-marca",
    accent: "from-emerald-500/65 via-cyan-500/45 to-teal-900/80",
  },
  // 19. AB Lab
  {
    title: "AB Lab Autônomo",
    href: "/ab-lab",
    description: "Gere variações A/B automaticamente e receba score preditivo de conversão antes de publicar.",
    icon: "ab-lab",
    accent: "from-amber-500/65 via-orange-500/45 to-rose-900/80",
  },
  // 20. Cena Infinita
  {
    title: "Cena Infinita",
    href: "/cena-infinita",
    description: "Conecte clipes curtos em uma sequência contínua com continuidade de câmera, luz e narrativa.",
    icon: "cena-infinita",
    accent: "from-fuchsia-500/65 via-blue-500/45 to-slate-900/80",
  },
  // 21. Oráculo de tendências
  {
    title: "Oráculo de Tendências",
    href: "/trend-oraculo",
    description: "Descubra temas com potencial viral por nicho e receba formatos ideais para cada plataforma.",
    icon: "trend-oraculo",
    accent: "from-amber-500/65 via-orange-500/40 to-black/70",
  },
  // 22. Prompt Genoma
  {
    title: "Prompt Genoma",
    href: "/prompt-genoma",
    description: "Mutação inteligente de prompt para gerar variações inéditas de estilo, câmera e narrativa.",
    icon: "prompt-genoma",
    accent: "from-violet-500/70 via-fuchsia-500/45 to-black/70",
  },
  // 23. Focus Group IA
  {
    title: "Focus Group IA",
    href: "/focus-group-ia",
    description: "Teste ideias com personas sintéticas antes de publicar e veja score de aceitação em segundos.",
    icon: "focus-group-ia",
    accent: "from-cyan-500/70 via-blue-500/45 to-black/70",
  },
  // 24. Roteiro Vivo
  {
    title: "Roteiro Vivo",
    href: "/roteiro-vivo",
    description: "Quebre sua campanha em cenas com tempo, gancho e CTA para renderização segmentada.",
    icon: "roteiro-vivo",
    accent: "from-rose-500/70 via-orange-500/45 to-black/70",
  },
  // 25. Órbita de Release
  {
    title: "Órbita de Release",
    href: "/orbita-release",
    description: "Planeje horários de publicação por canal com janelas de pico e cadência inteligente.",
    icon: "orbita-release",
    accent: "from-indigo-500/70 via-sky-500/45 to-black/70",
  },
  // 26. Multi-Cena Produto
  {
    title: "Multi-Cena Produto",
    href: "/multi-cena-produto",
    description: "Envie um produto e gere um pacote de cenas comerciais para anúncios, reels e vitrines.",
    icon: "multi-cena-produto",
    accent: "from-emerald-500/70 via-teal-500/45 to-black/70",
  },
  // Extras não listados na ordem pedida
  {
    title: "Ranking Estelar",
    href: "/ranking",
    description: "Suba na leaderboard e desbloqueie boosters de energia cósmica.",
    icon: "ranking",
    accent: "from-amber-500/40 via-orange-500/20 to-transparent",
  },
  {
    title: "Criador de Personas",
    href: "/criar-personagem",
    description: "Monte personagens, lore e atributos para suas narrativas imersivas.",
    icon: "criar-personagem",
    accent: "from-sky-500/45 via-violet-500/20 to-transparent",
  },
  {
    title: "Prompt Chat",
    href: "/chat",
    description: "Refine prompts com assistência em tempo real antes de lançar suas gerações.",
    icon: "chat",
    accent: "from-cyan-500/45 via-blue-500/20 to-transparent",
  },
  {
    title: "Instalar Merse Desktop",
    href: "https://github.com/3Mgalaxia/merse/releases/latest/download/Merse-arm64.dmg",
    description: "Baixe o app Merse para desempenho máximo e atalhos dedicados.",
    icon: "merse-desktop",
    accent: "from-purple-900/60 via-purple-800/45 to-black/60",
    download: true,
  },
];

const movedModuleTitles = new Set([
  "Ranking Estelar",
  "Dev Hub",
  "Showcase Merse",
  "Agent Swarm Studio",
  "Memória de Marca Neural",
  "AB Lab Autônomo",
  "Cena Infinita",
  "Oráculo de Tendências",
  "Prompt Genoma",
  "Focus Group IA",
  "Roteiro Vivo",
  "Órbita de Release",
  "Multi-Cena Produto",
]);

const ecosystemCards = [
  {
    id: "merse-app-br",
    badge: "Merse.app.br",
    title: "APIs Públicas Merse",
    description:
      "Seu laboratório pronto para imagem, vídeo, objeto 3D e site sem montar infraestrutura. Você conecta, cria e publica no mesmo fluxo.",
    highlights: [
      "Catálogo de APIs já prontas com setup guiado",
      "Passo a passo para integrar rápido no seu stack",
      "Suporte 24h para tirar bloqueios e acelerar entrega",
    ],
    href: "https://merse.app.br",
    cta: "Entrar na Merse.app.br",
    accent: "from-emerald-500/45 via-cyan-500/30 to-blue-500/10",
    glow: "from-emerald-300/35 via-cyan-300/15 to-transparent",
    icon: "M",
  },
  {
    id: "romexx",
    badge: "Romexx.com.br",
    title: "Romexx IA Empresarial",
    description:
      "Uma IA que opera junto com você: analisa erros operacionais, sugere investimento, responde clientes e acompanha o desempenho da equipe.",
    highlights: [
      "Diagnóstico de gargalos e oportunidades de crescimento",
      "Monitoramento inteligente mesmo quando você está ausente",
      "IA aplicada à gestão para decisões mais seguras e rápidas",
    ],
    href: "https://romexx.com.br",
    cta: "Conhecer a Romexx",
    accent: "from-violet-500/45 via-indigo-500/30 to-sky-500/10",
    glow: "from-violet-300/30 via-indigo-300/15 to-transparent",
    icon: "R",
  },
  {
    id: "shopverse",
    badge: "Shopverse.com.br",
    title: "ShopVerse Creator Market",
    description:
      "Transforme criatividade em renda: publique prompts, mostre seus produtos como rede social e ganhe créditos ou dinheiro a cada uso.",
    highlights: [
      "Marketplace para vender prompts de criação com escala",
      "Sistema de ganhos por uso recorrente dos seus prompts",
      "Vitrine social para divulgar produtos e atrair compradores",
    ],
    href: "https://shopverse.com.br",
    cta: "Entrar na ShopVerse",
    accent: "from-fuchsia-500/45 via-rose-500/30 to-amber-500/10",
    glow: "from-fuchsia-300/30 via-rose-300/15 to-transparent",
    icon: "S",
  },
];

const promptPacks = [
  {
    id: "ceu",
    title: "Céu Elevado",
    image: "/LOJA-PROMPTS/CEU.png",
    description:
      "Prompts aéreos para produtos flutuando entre nuvens estilizadas, pôr do sol iridescente e cúpulas orbitais.",
    priceLabel: "R$ 39",
    priceValue: 39,
    highlights: ["Ângulos drone cinematográficos", "Variações 16:9 e 9:16", "Texturas atmosféricas realistas"],
    gradient: "from-purple-500/35 via-blue-500/20 to-transparent",
  },
  {
    id: "cozinha",
    title: "Cozinhas Lumi",
    image: "/LOJA-PROMPTS/COZINHA.png",
    description:
      "Coleção para eletros, utensílios e pratos futuristas com iluminação sofisticada e mood doméstico premium.",
    priceLabel: "R$ 42",
    priceValue: 42,
    highlights: ["Detalhes de bancada", "Materiais com reflexo físico", "Mise en place minimalista"],
    gradient: "from-amber-500/35 via-orange-500/20 to-transparent",
  },
  {
    id: "minimalista",
    title: "Minimal Nova",
    image: "/LOJA-PROMPTS/MINIMALISTA.png",
    description:
      "Interiores minimalistas com geometrias puras, luz suave e cenários ricos em negative space.",
    priceLabel: "R$ 44",
    priceValue: 44,
    highlights: ["Paleta neutra", "Shadow play controlado", "Props discretos"],
    gradient: "from-slate-500/35 via-gray-500/20 to-transparent",
  },
  {
    id: "natureza",
    title: "Natureza Prisma",
    image: "/LOJA-PROMPTS/NATUREZA.png",
    description:
      "Explorações de florestas alienígenas, cachoeiras cromáticas e fauna bioluminescente pensadas para branding eco-tech.",
    priceLabel: "R$ 47",
    priceValue: 47,
    highlights: ["Biomas híbridos", "Luz volumétrica", "Reflexos de água realistas"],
    gradient: "from-emerald-500/35 via-teal-500/20 to-transparent",
  },
  {
    id: "praia",
    title: "Praia Neon",
    image: "/LOJA-PROMPTS/PRAIA.png",
    description:
      "Cenas tropicais com areia glow, resorts suspensos e mar cintilante para campanhas de lifestyle.",
    priceLabel: "R$ 49",
    priceValue: 49,
    highlights: ["Golden hour futurista", "Torres e píeres flutuantes", "Shots drone 4K"],
    gradient: "from-orange-500/35 via-yellow-500/20 to-transparent",
  },
  {
    id: "restaurante",
    title: "Restaurante Orbit",
    image: "/LOJA-PROMPTS/RESTAURANTE.png",
    description:
      "Ambientes gastronômicos premium, cardápios holográficos e chefs IA para experiências imersivas.",
    priceLabel: "R$ 52",
    priceValue: 52,
    highlights: ["Mesas preparadas", "Mood noturno dramático", "Clientes holográficos"],
    gradient: "from-rose-500/35 via-red-500/20 to-transparent",
  },
  {
    id: "rua",
    title: "Rua Aurora",
    image: "/LOJA-PROMPTS/RUA.png",
    description:
      "Street shots com arquitetura urbana futurista, moda street e letreiros neon em camadas.",
    priceLabel: "R$ 55",
    priceValue: 55,
    highlights: ["Moda street Merse", "Placas neon animadas", "Transportes aéreos"],
    gradient: "from-indigo-500/35 via-pink-500/20 to-transparent",
  },
];

type PaymentMethod = "credit" | "pix" | "debit";

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "credit", label: "Cartão de crédito" },
  { id: "pix", label: "Pix instantâneo" },
  { id: "debit", label: "Cartão de débito" },
];

type FirstCreation = {
  title: string;
  description: string;
  imageDataUrl: string;
  createdAt: string;
  story?: string;
};

export default function Gerar() {
  const [heroTile, ...secondaryTiles] = bannerTiles;
  const [objectsTile, rankingTile, runwayTile, blueprintTile, ...otherTiles] = secondaryTiles;
  const [selectedPack, setSelectedPack] = useState<(typeof promptPacks)[number] | null>(null);
  const [showPackCheckout, setShowPackCheckout] = useState(false);
  const [packIsProcessing, setPackIsProcessing] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [packSuccess, setPackSuccess] = useState(false);
  const [packPaymentMethod, setPackPaymentMethod] = useState<PaymentMethod>("credit");
  const [packPixCheckout, setPackPixCheckout] = useState<{
    qrCode: string;
    qrCodeBase64?: string;
    copyPasteCode?: string;
    expiresAt?: string | null;
  } | null>(null);
  const [packPixCopyStatus, setPackPixCopyStatus] = useState<"idle" | "copied">("idle");
  const packCheckoutRef = useRef<HTMLDivElement | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const [highlightStage, setHighlightStage] = useState<"idle" | "card" | "checkout">("idle");
  const [enableGlows, setEnableGlows] = useState(false);
  const [firstCreation, setFirstCreation] = useState<FirstCreation | null>(null);
  const starField = useMemo(
    () =>
      Array.from({ length: 220 }).map((_, index) => {
        const size = 1 + Math.random() * 2.4;
        const driftX = `${-32 + Math.random() * 64}px`;
        const driftY = `${-28 + Math.random() * 56}px`;
        return {
          id: `star-${index}`,
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          size,
          opacity: 0.25 + Math.random() * 0.6,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${2 + Math.random() * 3}s`,
          driftDelay: `${Math.random() * 6}s`,
          driftDuration: `${10 + Math.random() * 12}s`,
          driftX,
          driftY,
        };
      }),
    [],
  );
  const visibleModuleBlocks = useMemo(
    () => moduleBlocks.filter((module) => !movedModuleTitles.has(module.title)),
    [],
  );

  useEffect(() => {
    if (!showPackCheckout) return;
    const timer = window.setTimeout(() => {
      packCheckoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showPackCheckout]);

  useEffect(() => {
    setEnableGlows(isDesktopApp());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("merse.firstCreation");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as FirstCreation;
      if (parsed.imageDataUrl) {
        setFirstCreation(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleSelectPack = (pack: (typeof promptPacks)[number]) => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    setSelectedPack(pack);
    setShowPackCheckout(true);
    setPackError(null);
    setPackSuccess(false);
    setPackPaymentMethod("credit");
    setPackPixCheckout(null);
    setPackPixCopyStatus("idle");
    setHighlightStage("card");

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightStage("checkout");
      highlightTimeoutRef.current = null;
    }, 420);
  };

  const handlePackCheckoutSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPack) return;

    const formData = new FormData(event.currentTarget);
    const customer = {
      name: (formData.get("buyerName") as string | null) ?? "",
      email: (formData.get("buyerEmail") as string | null) ?? "",
    };

    try {
      if (packPaymentMethod === "pix") {
        setPackIsProcessing(true);
        setPackError(null);
        setPackPixCheckout(null);
        const response = await fetch("/api/payments/create-pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: selectedPack.priceValue,
            description: `Prompt Pack • ${selectedPack.title}`,
            customer,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível gerar o QR Code Pix.");
        }
        setPackPixCheckout({
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          copyPasteCode: data.copyPasteCode,
          expiresAt: data.expiresAt ?? null,
        });
        setPackSuccess(true);
      } else {
        setPackIsProcessing(true);
        setPackError(null);
        const response = await fetch("/api/payments/create-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: `prompt-${selectedPack.id}`,
            title: `Prompt Pack • ${selectedPack.title}`,
            price: selectedPack.priceValue,
            customer,
            paymentMethod: packPaymentMethod,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Não foi possível iniciar o pagamento.");
        }

        const data = await response.json();
        const initPoint = (data.init_point ?? data.initPoint) as string | undefined;
        if (initPoint) {
          window.location.href = initPoint;
          setPackSuccess(true);
        } else {
          setPackError("Preferência criada, mas o link de checkout não foi retornado.");
        }
      }
    } catch (error) {
      setPackError(error instanceof Error ? error.message : "Erro inesperado ao iniciar o checkout.");
    } finally {
      setPackIsProcessing(false);
    }
  };

  const handleClosePackCheckout = () => {
    setShowPackCheckout(false);
    setSelectedPack(null);
    setPackError(null);
    setPackSuccess(false);
    setPackPixCheckout(null);
    setPackPixCopyStatus("idle");
    setPackPaymentMethod("credit");
    setHighlightStage("idle");
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, []);

  const renderExperienceTile = (tile: (typeof secondaryTiles)[number]) => (
    <Link key={tile.title} href={tile.href} className="group block">
      <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_16px_36px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:-translate-y-1">
        <div className="relative h-64 w-full">
          <Image src={tile.image} alt={tile.title} fill className="object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-br ${tile.gradient}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="relative flex h-full flex-col justify-end gap-4 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-white/60">Experiência Merse</div>
            <h3 className="text-xl font-semibold text-white">{tile.title}</h3>
            <p className="text-sm text-white/70">{tile.description}</p>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.35em] transition ${accentClasses.secondary}`}
            >
              {tile.cta}
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );


  return (
    <LayoutGroup>
      <div className="relative min-h-screen bg-black px-6 pb-14 pt-32 text-white">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <div className="absolute inset-0">
            {starField.map((star) => (
              <span
                key={star.id}
                className="absolute block rounded-full bg-white/80"
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  opacity: star.opacity,
                  animationDelay: `${star.animationDelay}, ${star.driftDelay}`,
                  animationDuration: `${star.animationDuration}, ${star.driftDuration}`,
                  animationName: "pulse, star-drift",
                  animationTimingFunction: "ease-in-out, ease-in-out",
                  animationIterationCount: "infinite, infinite",
                  animationDirection: "alternate, alternate",
                  animationFillMode: "both, both",
                  ["--star-x" as string]: star.driftX,
                  ["--star-y" as string]: star.driftY,
                }}
              />
            ))}
          </div>
          {enableGlows && (
            <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen">
              <motion.div
                className="absolute -left-[24%] top-[10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.42),transparent_62%)] blur-[160px]"
                animate={{ x: ["-24%", "110%", "-24%"], y: ["6%", "-8%", "6%"] }}
                transition={{ duration: 24, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
              />
              <motion.div
                className="absolute right-[-30%] top-[32%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.3),transparent_62%)] blur-[160px]"
                animate={{ x: ["-60%", "90%", "-60%"], y: ["-6%", "12%", "-6%"] }}
                transition={{ duration: 30, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 2.1 }}
              />
              <motion.div
                className="absolute left-[6%] bottom-[-16%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,197,235,0.32),transparent_62%)] blur-[170px]"
                animate={{ x: ["-30%", "120%", "-30%"], y: ["4%", "-6%", "4%"] }}
                transition={{ duration: 28, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1.2 }}
              />
            </motion.div>
          )}

        </div>
        <div className="relative z-10 space-y-10">
          <Link href={heroTile.href} className="group block">
            <article className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:-translate-y-1">
              <div className="relative h-[320px] w-full sm:h-[420px]">
                <Image src={heroTile.image} alt={heroTile.title} fill priority className="object-cover opacity-90" />
                <div className={`absolute inset-0 bg-gradient-to-br ${heroTile.gradient}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative flex h-full flex-col justify-end gap-4 p-10">
                  <p className="text-xs uppercase tracking-[0.5em] text-white/70">Destacado</p>
                  <h2 className="text-3xl font-semibold text-white sm:text-4xl">{heroTile.title}</h2>
                  <p className="max-w-xl text-sm text-white/80 sm:text-base">{heroTile.description}</p>
                  <span
                    className={`inline-flex w-fit items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] transition ${accentClasses.primary}`}
                  >
                    {heroTile.cta}
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </article>
          </Link>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {objectsTile && renderExperienceTile(objectsTile)}
          {rankingTile && renderExperienceTile(rankingTile)}
          {runwayTile && renderExperienceTile(runwayTile)}
          {blueprintTile && renderExperienceTile(blueprintTile)}
          {firstCreation && (
            <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_16px_36px_rgba(0,0,0,0.35)] md:col-span-2 xl:col-span-2 md:h-64">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/28 via-indigo-500/18 to-black/70 opacity-90" />
              <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="relative grid h-full grid-cols-1 gap-4 p-6 text-white md:grid-cols-[1.1fr,0.9fr] md:items-center">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-purple-200/80">Primeira criação</p>
                  <h3 className="text-2xl font-semibold md:text-3xl">Seu dia zero</h3>
                  <p className="text-sm text-white/70">{firstCreation.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.34em] text-white/70">
                    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1">Dia zero</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">Única</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">Sua estética</span>
                  </div>
                </div>
                <div className="relative h-full min-h-[200px] overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_16px_48px_rgba(0,0,0,0.55)] md:self-center">
                  <div className="absolute inset-0">
                    <img src={firstCreation.imageDataUrl} alt={firstCreation.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/70">
                    <span>Primeira imagem</span>
                    <span>{new Date(firstCreation.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            </article>
          )}
          {otherTiles.map((tile) => renderExperienceTile(tile))}
        </section>
      </div>

      <section className="mt-12 space-y-6">
        <header className="flex flex-col gap-3 text-white/80 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Painéis Merse</p>
            <h3 className="text-2xl font-semibold text-white md:text-3xl">
              Acesso rápido aos módulos centrais
            </h3>
          </div>
          <p className="max-w-xl text-sm text-white/60">
            Use os blocos abaixo para navegar entre energia, comunidade, prompts e fluxos de produção
            sem sair da nave Merse.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleModuleBlocks.map((module) => {
            const Icon = moduleIconMap[module.icon];
            const isDownload = module.download === true;
            if (isDownload) {
              return (
                <a
                  key={module.title}
                  href="https://github.com/3Mgalaxia/merse/releases/latest/download/Merse-arm64.dmg"
                  download
                  className="group block"
                >
                  <article className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-1">
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${module.accent} opacity-90`} />
                    <div className="absolute -top-16 -right-24 h-40 w-40 rounded-full bg-white/10 blur-[120px]" />
                    <div className="relative flex h-full flex-col gap-3 text-white">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70 transition group-hover:border-white/40 group-hover:text-white">
                        <Icon className="text-lg" />
                      </span>
                      <h4 className="text-lg font-semibold">{module.title}</h4>
                      <p className="text-sm text-white/70">{module.description}</p>
                      <span className="mt-auto inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60 transition group-hover:text-white">
                        Download rápido
                        <span aria-hidden>→</span>
                      </span>
                    </div>
                  </article>
                </a>
              );
            }
            return (
              <Link key={module.title} href={module.href} className="group block">
                <article className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-1">
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${module.accent} opacity-90`} />
                  <div className="absolute -top-16 -right-24 h-40 w-40 rounded-full bg-white/10 blur-[120px]" />
                  <div className="relative flex h-full flex-col gap-3 text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70 transition group-hover:border-white/40 group-hover:text-white">
                      <Icon className="text-lg" />
                    </span>
                    <h4 className="text-lg font-semibold">{module.title}</h4>
                    <p className="text-sm text-white/70">{module.description}</p>
                    <span className="mt-auto inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60 transition group-hover:text-white">
                      {module.cta ?? "Acessar"}
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="apis" className="mt-12 space-y-6">
        <header className="flex flex-col gap-2 text-white/80">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">ECOSSISTEMA IA</p>
          <h3 className="text-2xl font-semibold text-white md:text-3xl">Merse, Romexx e ShopVerse no mesmo fluxo</h3>
          <p className="max-w-3xl text-sm text-white/60">
            Construa com APIs prontas na Merse.app.br, opere sua empresa com a inteligência da Romexx e transforme prompts
            em renda recorrente com a ShopVerse.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {ecosystemCards.map((card) => (
            <a
              key={card.id}
              href={card.href}
              target="_blank"
              rel="noreferrer"
              className="group relative isolate w-full overflow-hidden rounded-[30px] border border-white/20 bg-white/[0.08] p-6 text-left shadow-[0_22px_70px_rgba(2,8,22,0.58),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-[26px] [backdrop-filter:blur(26px)_saturate(175%)] transition duration-500 hover:-translate-y-2 hover:border-white/45 hover:shadow-[0_34px_96px_rgba(4,10,28,0.66),inset_0_1px_0_rgba(255,255,255,0.48)]"
            >
              <div className={`pointer-events-none absolute inset-0 rounded-[30px] bg-gradient-to-br ${card.accent} opacity-72`} />
              <div
                className={`pointer-events-none absolute -left-16 top-[-28%] h-64 w-64 rounded-full bg-gradient-to-br ${card.glow} blur-[95px]`}
              />
              <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(140%_90%_at_8%_0%,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.16)_28%,rgba(255,255,255,0.02)_52%,transparent_74%)] opacity-80" />
              <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[linear-gradient(145deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.09)_24%,rgba(255,255,255,0.03)_46%,rgba(0,0,0,0.24)_100%)] opacity-65" />
              <div className="pointer-events-none absolute inset-x-4 top-3 h-[1px] rounded-full bg-white/60 blur-[0.4px]" />
              <div className="pointer-events-none absolute inset-x-5 bottom-0 h-24 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              <div className="pointer-events-none absolute -left-1/2 top-[-12%] h-[170%] w-1/2 -translate-x-[185%] rotate-[16deg] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.16)_42%,rgba(255,255,255,0)_88%)] opacity-60 blur-[1.3px] transition-transform duration-[1200ms] ease-out group-hover:translate-x-[235%]" />
              <div className="pointer-events-none absolute inset-[1px] rounded-[28px] border border-white/15" />
              <div className="pointer-events-none absolute inset-[2px] rounded-[27px] bg-[radial-gradient(circle_at_82%_80%,rgba(255,255,255,0.08),transparent_40%)]" />
              <div className="relative flex h-full flex-col gap-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/[0.14] px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-md">
                    {card.badge}
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/30 bg-white/[0.18] text-base font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_rgba(0,0,0,0.3)] backdrop-blur-md">
                    {card.icon}
                  </span>
                </div>
                <h4 className="text-xl font-semibold md:text-2xl">{card.title}</h4>
                <p className="text-sm leading-relaxed text-white/85">{card.description}</p>
                <ul className="space-y-2 text-sm text-white/80">
                  {card.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/85 shadow-[0_0_12px_rgba(255,255,255,0.55)]" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/35 bg-white/[0.18] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition group-hover:border-white/55 group-hover:bg-white/[0.28]">
                  {card.cta}
                  <span aria-hidden>↗</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="relative mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.037] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <motion.div
            aria-hidden
            className="absolute -left-[58%] top-[-6%] h-72 w-[760px] rotate-[6deg] mix-blend-screen"
            animate={{ x: ["-120%", "240%", "-120%"], y: ["10%", "-6%", "10%"] }}
            transition={{ duration: 11.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          >
            <div className="absolute inset-0 blur-[26px]">
              <div
                className="absolute inset-y-10 left-0 right-20 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(236,72,153,0.3), rgba(236,72,153,0.16), transparent 72%)",
                }}
              />
              <div
                className="absolute left-16 top-12 h-36 w-36 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.78), rgba(236,72,153,0.88) 42%, rgba(236,72,153,0.42) 62%, transparent 72%)",
                  boxShadow: "0 0 28px rgba(255,255,255,0.35), 0 0 110px rgba(236,72,153,0.6)",
                }}
              />
            </div>
          </motion.div>
          <motion.div
            aria-hidden
            className="absolute -left-[60%] top-[32%] h-80 w-[780px] -rotate-[4deg] mix-blend-screen"
            animate={{ x: ["230%", "-130%", "230%"], y: ["-2%", "12%", "-2%"] }}
            transition={{ duration: 14.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 0.8 }}
          >
            <div className="absolute inset-0 blur-[28px]">
              <div
                className="absolute inset-y-12 left-8 right-24 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(59,130,246,0.28), rgba(59,130,246,0.18), transparent 72%)",
                }}
              />
              <div
                className="absolute left-24 top-14 h-40 w-40 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 32% 32%, rgba(255,255,255,0.7), rgba(59,130,246,0.85) 42%, rgba(59,130,246,0.38) 65%, transparent 74%)",
                  boxShadow: "0 0 26px rgba(255,255,255,0.3), 0 0 120px rgba(59,130,246,0.58)",
                }}
              />
            </div>
          </motion.div>
          <motion.div
            aria-hidden
            className="absolute -left-[58%] bottom-[-14%] h-80 w-[780px] rotate-[3deg] mix-blend-screen"
            animate={{ x: ["-130%", "230%", "-130%"], y: ["8%", "-8%", "8%"] }}
            transition={{ duration: 16, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1.4 }}
          >
            <div className="absolute inset-0 blur-[30px]">
              <div
                className="absolute inset-y-12 left-4 right-28 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.32), rgba(124,58,237,0.18), transparent 70%)",
                }}
              />
              <div
                className="absolute left-16 bottom-12 h-40 w-40 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 28% 32%, rgba(255,255,255,0.68), rgba(124,58,237,0.85) 45%, rgba(124,58,237,0.42) 65%, transparent 74%)",
                  boxShadow: "0 0 28px rgba(255,255,255,0.32), 0 0 120px rgba(124,58,237,0.62)",
                }}
              />
            </div>
          </motion.div>
        </div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Conheça a Merse</p>
            <h3 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              Bastidores, visão e o time que pilota essa nave
            </h3>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Descubra como construímos o ecossistema criativo, nossa timeline de lançamentos e quem
              lidera cada módulo. Explore a página institucional e entenda como podemos impulsionar sua
              marca.
            </p>
          </div>
          <Link
            href="/sobre"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20"
          >
            Explorar sobre nós
          </Link>
        </div>
      </section>


      <section id="prompt-marketplace" className="mt-14 space-y-6">
        <header className="flex flex-col gap-3 text-white/80 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Prompt Marketplace</p>
            <h3 className="text-2xl font-semibold text-white md:text-3xl">
              Pacotes prontos para desbloquear novas estéticas
            </h3>
          </div>
          <p className="max-w-xl text-sm text-white/60">
            Cada pacote combina múltiplos prompts refinados para que você economize tempo e mantenha o
            padrão Merse em campanhas, vitrines e conteúdos sociais.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {promptPacks.map((pack) => {
            const isSelected = selectedPack?.id === pack.id;
            return (
              <article
                key={pack.id}
                className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 p-4 shadow-[0_14px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-purple-300/40 ${
                  isSelected ? "border-purple-300/50 shadow-[0_0_38px_rgba(168,85,247,0.4)]" : ""
                }`}
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${pack.gradient} opacity-85`} aria-hidden />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/65 via-black/25 to-transparent" aria-hidden />
                <div className="relative flex h-full flex-col gap-3 text-white">
                  <div className="relative -mx-4 -mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    <img
                      src={pack.image}
                      alt={pack.title}
                      className="h-60 w-full object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70">
                      {pack.title}
                    </span>
                  </div>
                  <p className="text-sm text-white/75">{pack.description}</p>
                  <ul className="space-y-1.5 text-sm text-white/70">
                    {pack.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-white/60" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <div className="relative mt-auto flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-white/65">
                    <span className="whitespace-nowrap">Pacote com 18+ prompts</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPack(pack)}
                      className="relative overflow-hidden rounded-full border border-white/15 bg-white/10 px-5 py-2 text-[11px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20 hover:text-white"
                    >
                      {isSelected && highlightStage === "card" && (
                        <motion.span
                          layoutId="prompt-pack-highlight"
                          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/60 via-pink-500/50 to-blue-500/50 opacity-80 blur-md"
                        />
                      )}
                      <span className="relative">{pack.priceLabel} • comprar</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-12 flex justify-end">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 text-sm text-white/70 backdrop-blur">
          <div className="absolute -top-16 -right-24 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-3 text-right">
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Conecte-se</p>
            <p className="text-base text-white">
              Fale direto com nossa tripulação para suporte prioritário, parcerias ou sessões de
              co-criação.
            </p>
            <div className="text-xs uppercase tracking-[0.35em] text-white/50">
              Disponível 09h – 22h • Fuso Brasília
            </div>
            <div className="flex items-center justify-end gap-3 text-xl">
              <a
                href={instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da Merse"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-purple-300/60 hover:bg-purple-500/20 hover:text-white"
              >
                <PiInstagramLogoFill />
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fale com a Merse no WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-green-300/60 hover:bg-green-500/20 hover:text-white"
              >
                <PiWhatsappLogoFill />
              </a>
            </div>
            <p className="text-xs text-white/60">
              Mensagem automática identifica que você veio da Merse para acelerar o atendimento.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPackCheckout && selectedPack && (
          <motion.section
            ref={packCheckoutRef}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-12 rounded-3xl border border-purple-300/40 bg-black/60 p-8 text-sm text-white/80 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.3)]"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="relative">
                {selectedPack && highlightStage === "checkout" && (
                  <motion.span
                    layoutId="prompt-pack-highlight"
                    className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-r from-purple-500/50 via-pink-500/40 to-blue-500/40 blur-3xl"
                  />
                )}
                <p className="relative text-xs uppercase tracking-[0.35em] text-purple-200/90">
                  Comprar prompt pack
                </p>
                <h2 className="relative mt-2 text-2xl font-semibold text-white">{selectedPack.title}</h2>
                <p className="relative mt-2 text-xs text-white/60">
                  Investimento: {selectedPack.priceLabel} • Pacote com prompts exclusivos Merse
                </p>
              </div>
              <button
                onClick={handleClosePackCheckout}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white transition hover:border-white/40 hover:bg-white/20"
              >
                Cancelar
              </button>
            </div>
            <div className="mb-6 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isActive = packPaymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setPackPaymentMethod(method.id);
                      setPackPixCheckout(null);
                      setPackPixCopyStatus("idle");
                    }}
                    className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] transition ${
                      isActive
                        ? "border-purple-300/60 bg-purple-500/20 text-white"
                        : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handlePackCheckoutSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white">Nome completo</span>
              <input
                type="text"
                name="buyerName"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                placeholder="Ex.: Alex Merse"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white">E-mail</span>
              <input
                type="email"
                name="buyerEmail"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                placeholder="voce@merse.gg"
                required
              />
            </label>
            <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-xs text-white/70">
              <input
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border border-white/40 bg-black/40"
              />
              <span>
                Aceito receber o pacote por e-mail e entendo que o pagamento é processado via Mercado Pago.
              </span>
            </label>
            {packPaymentMethod === "pix" && (
              <p className="md:col-span-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                Selecionando Pix, exibiremos o QR Code para pagamento imediato. O pack fica disponível
                no seu e-mail assim que o Mercado Pago confirmar.
              </p>
            )}
            <div className="md:col-span-2 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/70">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">
                Pagamento selecionado:{" "}
                <span className="text-white">{PAYMENT_METHODS.find((m) => m.id === packPaymentMethod)?.label}</span>
              </p>
              <p className="text-[11px] text-white/60">
                Todas as transações passam pelo Mercado Pago usando as credenciais oficiais da Merse.
              </p>
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                Valor total: <span className="text-white/90">{selectedPack.priceLabel}</span>
              </div>
              <button
                type="submit"
                className="rounded-full border border-purple-300/30 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] transition hover:shadow-[0_0_28px_rgba(168,85,247,0.7)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={packIsProcessing}
              >
                {packIsProcessing ? "Processando..." : "Confirmar compra"}
              </button>
            </div>
            {packError && (
              <p className="md:col-span-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                {packError}
              </p>
            )}
            {packSuccess && !packError && (
              <p className="md:col-span-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                Preferência criada com sucesso! Você será direcionado ao checkout.
              </p>
            )}
          </form>
          {packPixCheckout && (
            <div className="mt-6 grid gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6 text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">Pix ativo</p>
                  <p className="text-sm text-white">Escaneie o QR Code para finalizar a compra.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!packPixCheckout.copyPasteCode) return;
                    try {
                      await navigator.clipboard.writeText(packPixCheckout.copyPasteCode);
                      setPackPixCopyStatus("copied");
                      setTimeout(() => setPackPixCopyStatus("idle"), 2000);
                    } catch {
                      setPackPixCopyStatus("idle");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  {packPixCopyStatus === "copied" ? "Copiado" : "Copiar código"}
                </button>
              </div>
              {packPixCheckout.qrCodeBase64 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <img
                    src={`data:image/png;base64,${packPixCheckout.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="h-52 w-52 rounded-xl border border-white/15 bg-white p-3"
                  />
                  <p className="text-xs text-white/60">
                    {packPixCheckout.expiresAt
                      ? `Expira em ${new Date(packPixCheckout.expiresAt).toLocaleString()}`
                      : "Utilize o QR Code em até 15 minutos."}
                  </p>
                </div>
              ) : (
                <pre className="overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
                  {packPixCheckout.copyPasteCode}
                </pre>
              )}
            </div>
          )}
        </motion.section>
      )}
      </AnimatePresence>
    </div>
  </LayoutGroup>
  );
}
