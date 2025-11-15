import { useEffect, useRef, useState } from "react";
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
} from "react-icons/pi";

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
    title: "Runway Wear – Vídeo",
    description: "Envie a foto da roupa e receba um vídeo 3D fluindo em CG futurista.",
    cta: "Fluxo fashion",
    href: "/video-roupas",
    image: "/banners/GERAR-ROUPA/GERAR-ROUPA123.png",
    gradient: "from-teal-500/50 via-emerald-500/30 to-transparent",
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
}> = [
  {
    title: "Vídeos Corporativos",
    href: "/videos-empresas",
    description: "Produza apresentações imersivas que contam histórias de marca com visual galáctico.",
    icon: "videos-empresas",
    accent: "from-indigo-500/40 via-blue-500/25 to-transparent",
  },
  {
    title: "Runway Wear",
    href: "/video-roupas",
    description: "Transforme roupas em motion-capture futurista e revele tecidos em 3D.",
    icon: "video-roupas",
    accent: "from-fuchsia-500/40 via-pink-500/25 to-transparent",
  },
  {
    title: "Trocar Gênero",
    href: "/trocar-generos",
    description: "Experimente identidades instantaneamente com IA ajustando poses e estilo.",
    icon: "trocar-generos",
    accent: "from-cyan-500/40 via-purple-500/25 to-transparent",
  },
  {
    title: "Blueprints de Sites",
    href: "/rascunhos-website",
    description: "Descreva seu portal e receba wireframes completos em segundos.",
    icon: "rascunhos-website",
    accent: "from-purple-500/40 via-slate-500/25 to-transparent",
  },
  {
    title: "Ranking Estelar",
    href: "/ranking",
    description: "Suba na leaderboard e desbloqueie boosters de energia cósmica.",
    icon: "ranking",
    accent: "from-amber-500/40 via-orange-400/25 to-transparent",
  },
  {
    title: "Gerador de Vídeos",
    href: "/gerar-video",
    description: "Combine prompts e referências para lançar trailers e teasers em minutos.",
    icon: "gerar-video",
    accent: "from-blue-500/40 via-indigo-500/25 to-transparent",
  },
  {
    title: "Objetos 3D",
    href: "/gerar-objeto",
    description: "Crie produtos holográficos e renders orbitais para campanhas.",
    icon: "gerar-objeto",
    accent: "from-teal-500/40 via-emerald-500/25 to-transparent",
  },
  {
    title: "Laboratório de Imagem",
    href: "/gerar-foto",
    description: "Converta prompts em visuais cinematográficos alinhados ao universo Merse.",
    icon: "gerar-foto",
    accent: "from-rose-500/40 via-purple-500/25 to-transparent",
  },
  {
    title: "Criador de Personas",
    href: "/criar-personagem",
    description: "Monte personagens, lore e atributos para suas narrativas imersivas.",
    icon: "criar-personagem",
    accent: "from-sky-500/40 via-purple-500/25 to-transparent",
  },
  {
    title: "Prompt Chat",
    href: "/chat",
    description: "Refine prompts com assistência em tempo real antes de lançar suas gerações.",
    icon: "chat",
    accent: "from-blue-500/40 via-cyan-500/25 to-transparent",
  },
  {
    title: "Codex Studio",
    href: "/codex-studio",
    description: "Edite HTML com comandos em português e aplique a estética Merse instantaneamente.",
    icon: "codex-studio",
    accent: "from-purple-500/40 via-indigo-500/25 to-transparent",
  },
];

const apiShowcase = [
  {
    title: "Merse · Gerador de Imagem",
    href: "https://replicate.com/3mgalaxia/merse-gerador-de-imagem",
    description: "Transforme prompts em renders cinematográficos no endpoint otimizado da Merse.",
    badge: "Imagem",
    accent: "from-purple-500/40 via-blue-500/25 to-transparent",
  },
  {
    title: "Merse · Base Criativa",
    href: "https://replicate.com/3mgalaxia/merse",
    description:
      "Envie uma foto e receba a versão masculina ou feminina com estilo Merse mantendo o rosto original.",
    badge: "Gênero",
    accent: "from-fuchsia-500/35 via-indigo-500/25 to-transparent",
  },
  {
    title: "Merse · Gerador de Site",
    href: "https://replicate.com/3mgalaxia/merse-gerador-de-site",
    description: "Receba HTML completo para landings e seções futuristas com estética Merse.",
    badge: "Sites",
    accent: "from-cyan-500/35 via-emerald-500/25 to-transparent",
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

export default function Gerar() {
  const [heroTile, ...secondaryTiles] = bannerTiles;
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

  useEffect(() => {
    if (!showPackCheckout) return;
    const timer = window.setTimeout(() => {
      packCheckoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showPackCheckout]);

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

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-black px-6 pb-14 pt-32 text-white">
      <div className="space-y-10">
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
          {secondaryTiles.map((tile) => (
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
          ))}
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
          {moduleBlocks.map((module) => {
            const Icon = moduleIconMap[module.icon];
            return (
            <Link key={module.title} href={module.href} className="group block">
              <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1">
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${module.accent}`} />
                <div className="absolute -top-16 -right-24 h-40 w-40 rounded-full bg-white/10 blur-[120px]" />
                <div className="relative flex flex-col gap-3 text-white">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70 transition group-hover:border-white/40 group-hover:text-white">
                    <Icon className="text-lg" />
                  </span>
                  <h4 className="text-lg font-semibold">{module.title}</h4>
                  <p className="text-sm text-white/70">{module.description}</p>
                  <span className="mt-1 inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60 transition group-hover:text-white">
                    Acessar
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </article>
            </Link>
          );
          })}
        </div>
      </section>

      <section className="mt-12 space-y-6">
        <header className="flex flex-col gap-2 text-white/80">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">APIs públicas</p>
          <h3 className="text-2xl font-semibold text-white md:text-3xl">Integre direto com o laboratório Merse</h3>
          <p className="max-w-3xl text-sm text-white/60">
            Conecte seu stack às engines hospedadas no Replicate e acelere protótipos de imagem, troca de gênero e HTML.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {apiShowcase.map((api) => (
            <a
              key={api.href}
              href={api.href}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${api.accent}`} />
              <div className="absolute -top-16 -right-24 h-40 w-40 rounded-full bg-white/10 blur-[120px]" />
              <div className="relative flex h-full flex-col gap-4 text-white">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/70">
                  {api.badge}
                </span>
                <h4 className="text-xl font-semibold">{api.title}</h4>
                <p className="text-sm text-white/70">{api.description}</p>
                <span className="mt-auto inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/60 transition group-hover:text-white">
                  Abrir no Replicate <span aria-hidden>↗</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {promptPacks.map((pack) => {
            const isSelected = selectedPack?.id === pack.id;
            return (
              <article
                key={pack.id}
                className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1 hover:border-purple-300/40 ${
                  isSelected ? "border-purple-300/50 shadow-[0_0_38px_rgba(168,85,247,0.4)]" : ""
                }`}
              >
                <div className="absolute inset-0 opacity-70 transition duration-300 group-hover:opacity-100">
                  <div className={`h-full w-full bg-gradient-to-br ${pack.gradient}`} />
                </div>
                <div className="relative flex h-full flex-col gap-4 text-white">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    <img
                      src={pack.image}
                      alt={pack.title}
                      className="h-40 w-full object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70">
                      {pack.title}
                    </span>
                  </div>
                  <p className="text-sm text-white/75">{pack.description}</p>
                  <ul className="space-y-2 text-sm text-white/70">
                    {pack.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-white/60" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <div className="relative mt-auto flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-white/60">
                    <span>Pacote com 18+ prompts</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPack(pack)}
                      className="relative overflow-hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20 hover:text-white"
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
