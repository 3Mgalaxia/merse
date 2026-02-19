import Link from "next/link";
import {
  PiCodeFill,
  PiImageFill,
  PiInstagramLogoFill,
  PiChatsFill,
  PiTrophyFill,
  PiVideoFill,
} from "react-icons/pi";

const moduleIconMap = {
  ranking: PiTrophyFill,
  "dev-hub": PiCodeFill,
  showcase: PiImageFill,
  "agent-swarm": PiCodeFill,
  "memoria-marca": PiImageFill,
  "ab-lab": PiTrophyFill,
  "cena-infinita": PiVideoFill,
  "trend-oraculo": PiTrophyFill,
  "prompt-genoma": PiCodeFill,
  "focus-group-ia": PiChatsFill,
  "roteiro-vivo": PiVideoFill,
  "orbita-release": PiInstagramLogoFill,
  "multi-cena-produto": PiImageFill,
} as const;

type ModuleKey = keyof typeof moduleIconMap;

const selectedModules: Array<{
  title: string;
  href: string;
  description: string;
  icon: ModuleKey;
  accent: string;
}> = [
  {
    title: "Ranking Estelar",
    href: "/ranking",
    description: "Suba na leaderboard e desbloqueie boosters de energia cósmica.",
    icon: "ranking",
    accent: "from-amber-500/40 via-orange-500/20 to-transparent",
  },
  {
    title: "Dev Hub",
    href: "/dev-hub",
    description: "Endpoints, exemplos cURL/JS e status das engines para integrar rápido.",
    icon: "dev-hub",
    accent: "from-sky-500/70 via-cyan-400/55 to-indigo-900/80",
  },
  {
    title: "Showcase Merse",
    href: "/showcase",
    description: "Galeria curada com filtros por mídia, indústria e popularidade.",
    icon: "showcase",
    accent: "from-fuchsia-500/70 via-amber-400/55 to-purple-900/80",
  },
  {
    title: "Agent Swarm Studio",
    href: "/agent-swarm",
    description: "Orquestre múltiplos agentes IA para executar pesquisa, roteiro, visual e publicação em cadeia.",
    icon: "agent-swarm",
    accent: "from-sky-500/65 via-violet-500/45 to-indigo-900/80",
  },
  {
    title: "Memória de Marca Neural",
    href: "/memoria-de-marca",
    description: "Treine uma memória visual da sua marca e aplique o mesmo estilo em todas as gerações.",
    icon: "memoria-marca",
    accent: "from-emerald-500/65 via-cyan-500/45 to-teal-900/80",
  },
  {
    title: "AB Lab Autônomo",
    href: "/ab-lab",
    description: "Gere variações A/B automaticamente e receba score preditivo de conversão antes de publicar.",
    icon: "ab-lab",
    accent: "from-amber-500/65 via-orange-500/45 to-rose-900/80",
  },
  {
    title: "Cena Infinita",
    href: "/cena-infinita",
    description: "Conecte clipes curtos em uma sequência contínua com continuidade de câmera, luz e narrativa.",
    icon: "cena-infinita",
    accent: "from-fuchsia-500/65 via-blue-500/45 to-slate-900/80",
  },
  {
    title: "Oráculo de Tendências",
    href: "/trend-oraculo",
    description: "Descubra temas com potencial viral por nicho e receba formatos ideais para cada plataforma.",
    icon: "trend-oraculo",
    accent: "from-amber-500/65 via-orange-500/40 to-black/70",
  },
  {
    title: "Prompt Genoma",
    href: "/prompt-genoma",
    description: "Mutação inteligente de prompt para gerar variações inéditas de estilo, câmera e narrativa.",
    icon: "prompt-genoma",
    accent: "from-violet-500/70 via-fuchsia-500/45 to-black/70",
  },
  {
    title: "Focus Group IA",
    href: "/focus-group-ia",
    description: "Teste ideias com personas sintéticas antes de publicar e veja score de aceitação em segundos.",
    icon: "focus-group-ia",
    accent: "from-cyan-500/70 via-blue-500/45 to-black/70",
  },
  {
    title: "Roteiro Vivo",
    href: "/roteiro-vivo",
    description: "Quebre sua campanha em cenas com tempo, gancho e CTA para renderização segmentada.",
    icon: "roteiro-vivo",
    accent: "from-rose-500/70 via-orange-500/45 to-black/70",
  },
  {
    title: "Órbita de Release",
    href: "/orbita-release",
    description: "Planeje horários de publicação por canal com janelas de pico e cadência inteligente.",
    icon: "orbita-release",
    accent: "from-indigo-500/70 via-sky-500/45 to-black/70",
  },
  {
    title: "Multi-Cena Produto",
    href: "/multi-cena-produto",
    description: "Envie um produto e gere um pacote de cenas comerciais para anúncios, reels e vitrines.",
    icon: "multi-cena-produto",
    accent: "from-emerald-500/70 via-teal-500/45 to-black/70",
  },
];

export default function TestePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-6 pb-16 pt-24 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_12%,rgba(34,211,238,0.2),transparent_45%),radial-gradient(circle_at_82%_8%,rgba(168,85,247,0.2),transparent_42%),radial-gradient(circle_at_50%_88%,rgba(251,146,60,0.16),transparent_45%)]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.36em] text-cyan-200/80">APIS PÚBLICAS</p>
            <h1 className="text-3xl font-semibold md:text-4xl">Integre direto com o laboratório Merse</h1>
            <p className="max-w-3xl text-sm text-white/70">
              Conecte seu stack às engines hospedadas no Replicate e acelere protótipos de imagem,
              troca de gênero e HTML.
            </p>
          </div>
          <Link
            href="/gerar"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40 hover:bg-white/20"
          >
            Voltar para Gerar
          </Link>
        </header>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {selectedModules.map((module) => {
            const Icon = moduleIconMap[module.icon];
            return (
              <Link key={module.title} href={module.href} className="group block">
                <article className="teste-glass-card relative isolate h-full overflow-hidden rounded-[30px] border border-white/20 bg-white/[0.06] p-5 shadow-[0_20px_62px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-[22px] [backdrop-filter:blur(22px)_saturate(170%)] transition duration-500 hover:-translate-y-1.5 hover:border-white/35 hover:shadow-[0_34px_96px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.36)]">
                  <div className={`absolute inset-0 rounded-[30px] bg-gradient-to-br ${module.accent} opacity-45`} />
                  <div className="teste-glass-video absolute inset-0 rounded-[30px]" />
                  <div className="teste-glass-wave absolute inset-0 rounded-[30px]" />
                  <div className="teste-glass-scan absolute inset-0 rounded-[30px]" />
                  <div className="teste-glass-highlight absolute -left-1/2 top-[-10%] h-[160%] w-1/2" />
                  <div className="absolute inset-[1px] rounded-[28px] border border-white/15" />
                  <div className="absolute inset-x-4 top-3 h-[1px] rounded-full bg-white/60 blur-[0.4px]" />
                  <div className="relative flex h-full flex-col gap-3 text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-white/[0.14] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] transition group-hover:border-white/45 group-hover:text-white">
                      <Icon className="text-lg" />
                    </span>
                    <h2 className="text-lg font-semibold">{module.title}</h2>
                    <p className="text-sm text-white/80">{module.description}</p>
                    <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/[0.12] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition group-hover:border-white/45 group-hover:bg-white/[0.2] group-hover:text-white">
                      Acessar
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      </div>
      <style jsx global>{`
        .teste-glass-video {
          background:
            radial-gradient(circle at 14% 12%, rgba(255, 255, 255, 0.24), transparent 42%),
            conic-gradient(
              from 25deg at 50% 50%,
              rgba(56, 189, 248, 0.22),
              rgba(167, 139, 250, 0.2),
              rgba(244, 114, 182, 0.2),
              rgba(56, 189, 248, 0.22)
            );
          filter: blur(20px) saturate(132%);
          opacity: 0.5;
          transform: scale(1.1);
          animation: testeCardFlow 10s ease-in-out infinite alternate;
        }

        .teste-glass-wave {
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.24) 0%,
            rgba(255, 255, 255, 0.1) 18%,
            rgba(255, 255, 255, 0.03) 42%,
            transparent 66%
          );
          mix-blend-mode: screen;
          opacity: 0.55;
        }

        .teste-glass-scan {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.06) 0,
            rgba(255, 255, 255, 0.06) 1px,
            transparent 2px,
            transparent 7px
          );
          opacity: 0.16;
          animation: testeCardScan 8s linear infinite;
        }

        .teste-glass-highlight {
          transform: translateX(-170%) rotate(14deg);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.32) 42%,
            rgba(255, 255, 255, 0) 100%
          );
          filter: blur(1.4px);
          opacity: 0.58;
          transition: transform 1200ms ease;
        }

        .group:hover .teste-glass-highlight {
          transform: translateX(245%) rotate(14deg);
        }

        @keyframes testeCardFlow {
          0% {
            transform: scale(1.1) translate3d(-3%, -2%, 0) rotate(-4deg);
          }
          50% {
            transform: scale(1.12) translate3d(1%, 1%, 0) rotate(3deg);
          }
          100% {
            transform: scale(1.08) translate3d(3%, 2%, 0) rotate(7deg);
          }
        }

        @keyframes testeCardScan {
          from {
            transform: translate3d(0, -8px, 0);
          }
          to {
            transform: translate3d(0, 8px, 0);
          }
        }
      `}</style>
    </main>
  );
}
