import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  PiCompassFill,
  PiCursorFill,
  PiInstagramLogoFill,
  PiSparkleFill,
  PiWhatsappLogoFill,
} from "react-icons/pi";
import { useLocale } from "@/contexts/LocaleContext";

const spotlightModules = [
  {
    title: "Photon Forge",
    description:
      "Transforme prompts em visuais cinematográficos com controle de estilo e energia cósmica.",
    href: "/gerar-foto",
  },
  {
    title: "Runway Wear",
    description: "Gere vídeos fashion em 3D fluido usando suas próprias fotos ou referências.",
    href: "/video-roupas",
  },
  {
    title: "Object Lab",
    description: "Renders holográficos de produtos com materiais Merse e iluminação volumétrica.",
    href: "/gerar-objeto",
  },
];

const pillars = [
  {
    title: "Criação guiada",
    copy: "Fluxos claros para qualquer nível. Do briefing à publicação, a IA Merse te acompanha.",
  },
  {
    title: "Comunidade viva",
    copy: "Conecte-se com visionários, compartilhe pacotes e cresça com feedback constante.",
  },
  {
    title: "Ecossistema premium",
    copy:
      "Marketplace, ferramentas corporativas e planos que liberam interações sociais exclusivas.",
  },
];

const testimonials = [
  {
    name: "Luna Orion",
    role: "Diretora Criativa - Nebula Studio",
    quote:
      "A Merse tornou nosso pipeline 3x mais rápido. Os pacotes de prompt prontos e o Photon Forge reduziram dias de produção para horas.",
  },
  {
    name: "Zion Vega",
    role: "Founder - Flux Labs",
    quote:
      "Ter marketplace e comunidade no mesmo lugar aproximou nossos produtos do público certo sem precisar sair do ecossistema.",
  },
  {
    name: "Mira Solis",
    role: "Head de Conteúdo - Aurora",
    quote:
      "Uso o Runway Wear diariamente. Os vídeos têm a estética Merse e impressionam clientes exigentes em segundos.",
  },
];

const MerseUniverse = dynamic(() => import("@/components/MerseUniverse"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { t } = useLocale();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [galaxyDarkness, setGalaxyDarkness] = useState(0);
  const [galaxyOpacity, setGalaxyOpacity] = useState(1);
  const transitionRafRef = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);

  const whatsappLink =
    "https://api.whatsapp.com/send/?phone=5562982775813&text=%C3%93l%C3%A1!%20Vim%20da%20Merse%20e%20quero%20conversar%20sobre%20cria%C3%A7%C3%B5es%20com%20IA.&type=phone_number&app_absent=0";
  const instagramLink =
    "https://www.instagram.com/merse.ai/?utm_source=ig_web_button_share_sheet";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readAuth = () => {
      setIsAuthenticated(window.localStorage.getItem("merse.authenticated") === "true");
    };
    readAuth();
    window.addEventListener("storage", readAuth);
    return () => window.removeEventListener("storage", readAuth);
  }, []);

  useEffect(() => {
    return () => {
      if (transitionRafRef.current) {
        window.cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  const startIndexToLoginTransition = (redirect?: string) => {
    if (isLoginTransitioning) return;
    setIsLoginTransitioning(true);
    setGalaxyDarkness(0);
    setGalaxyOpacity(1);

    if (transitionRafRef.current) {
      window.cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
    if (navigationTimeoutRef.current) {
      window.clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    const darkDurationMs = 900;
    const fadeDurationMs = 760;
    const totalMs = darkDurationMs + fadeDurationMs;
    const startedAt = performance.now();

    const step = (now: number) => {
      const elapsed = now - startedAt;
      const darkProgress = Math.min(1, elapsed / darkDurationMs);
      const fadeProgress = Math.min(1, Math.max(0, (elapsed - darkDurationMs) / fadeDurationMs));
      setGalaxyDarkness(darkProgress);
      setGalaxyOpacity(1 - fadeProgress);

      if (elapsed < totalMs) {
        transitionRafRef.current = window.requestAnimationFrame(step);
      } else {
        transitionRafRef.current = null;
      }
    };

    transitionRafRef.current = window.requestAnimationFrame(step);
    navigationTimeoutRef.current = window.setTimeout(() => {
      if (redirect) {
        void router.push({ pathname: "/login", query: { redirect } });
      } else {
        void router.push("/login");
      }
    }, totalMs + 40);
  };

  const handleProtectedNavigation = (target: string) => {
    if (isAuthenticated) {
      router.push(target);
    } else {
      startIndexToLoginTransition(target);
    }
  };

  const handleExploreUniverse = () => {
    if (isAuthenticated) {
      router.push("/gerar");
      return;
    }
    startIndexToLoginTransition("/gerar");
  };

  return (
    <>
      <div style={{ position: "relative", zIndex: 1 }}>
        <MerseUniverse intensity={1} galaxyOpacity={galaxyOpacity} galaxyDarkness={galaxyDarkness}>
      <div
        className={`home-shell relative min-h-screen overflow-visible bg-transparent font-sans text-white ${
          isLoginTransitioning ? "pointer-events-none" : ""
        }`}
      >
      <header className="relative z-10">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="text-2xl font-semibold tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            MERSE
          </div>
          <div className="hidden gap-8 text-sm uppercase tracking-widest text-gray-300 md:flex">
            <a className="hover:text-white transition-colors" href="#plataforma">
              Plataforma
            </a>
            <a className="hover:text-white transition-colors" href="#ecosistema">
              Ecossistema
            </a>
            <button
              type="button"
              onClick={() => handleProtectedNavigation("/sobre")}
              className="hover:text-white transition-colors"
            >
              Sobre nós
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => startIndexToLoginTransition()}
              className="relative hidden md:inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium uppercase tracking-widest backdrop-blur transition-all hover:border-white/40 hover:bg-white/20"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => handleProtectedNavigation("/planos")}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 px-6 py-2 text-sm font-semibold uppercase tracking-widest"
            >
              Assinar
            </button>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="relative mx-auto flex min-h-[68vh] w-full max-w-6xl flex-col items-center px-6 pt-16 text-center md:pt-20">
          <h1 className="text-4xl font-extrabold leading-tight md:text-7xl">
            <span className="hero-gradient-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              CREATE, DISCOVER, EVOLVE
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-300 md:text-xl">
            {t(
              "Construa mundos, publique coleções e monetize pacotes de prompt em um ambiente futurista, desenhado para criadores visionários e equipes corporativas.",
            )}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={handleExploreUniverse}
              className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 px-8 py-3 text-sm font-semibold uppercase tracking-widest"
            >
              <span className="relative z-10">Explorar universo</span>
              <span className="absolute inset-0 -z-0 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 blur-xl opacity-60 transition-opacity duration-300 group-hover:opacity-90" />
              <span className="pointer-events-none absolute inset-[-18px] rounded-full border border-pink-400/30 opacity-60 blur-[6px] animate-[ping_1.8s_ease-out_infinite]" />
            </button>
            <button
              type="button"
              onClick={() => handleProtectedNavigation("/planos")}
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white/80 transition hover:border-white/40 hover:bg-white/10"
            >
              Ver planos
            </button>
          </div>
        </section>

        <section
          id="plataforma"
          className="mx-auto mt-16 grid w-full max-w-6xl gap-6 px-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {spotlightModules.map((module) => (
            <button
              key={module.title}
              type="button"
              onClick={() => handleProtectedNavigation(module.href)}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:border-white/30"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/10 text-lg text-purple-200">
                <PiSparkleFill />
              </span>
              <h3 className="mt-6 text-2xl font-semibold text-white">{module.title}</h3>
              <p className="mt-4 text-sm text-gray-300">{t(module.description)}</p>
              <span className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl transition-opacity group-hover:opacity-80" />
            </button>
          ))}
        </section>

        <section id="ecosistema" className="mx-auto mt-24 w-full max-w-6xl px-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-10 text-center md:text-left">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Marketplace Merse</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Pacotes prontos, comunidade engajada e monetização transparente
            </h2>
            <p className="mt-4 max-w-3xl text-sm text-gray-300">
              {t(
                "Explore o Prompt Marketplace, compartilhe coleções com o seu público e acompanhe métricas de curtidas e saves em tempo real. Assinantes desbloqueiam a área social completa para seguidores, comentários e vendas recorrentes.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/gerar#prompt-marketplace")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-xs uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20"
              >
                <PiCursorFill />
                Ver pacotes
              </button>
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/conta")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-xs uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20"
              >
                <PiCompassFill />
                Abrir perfil
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 w-full max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300 shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
              >
                <h3 className="text-lg font-semibold text-white">{pillar.title}</h3>
                <p className="mt-3 leading-relaxed">{t(pillar.copy)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-24 w-full max-w-6xl px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-transparent p-10">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Depoimentos</p>
                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                  Equipes e creators já impulsionam suas entregas com Merse
                </h2>
                <p className="mt-4 text-sm text-gray-300">
                  {t(
                    "Das startups às grandes marcas, a Merse oferece uma experiência completa de criação, publicação e monetização com visual futurista e suporte especializado.",
                  )}
                </p>
              </div>
              <div className="space-y-6">
                {testimonials.map((item) => (
                  <blockquote
                    key={item.name}
                    className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-gray-200"
                  >
                    <p className="leading-relaxed">“{t(item.quote)}”</p>
                    <footer className="mt-3 text-xs uppercase tracking-[0.3em] text-white/60">
                      {item.name} • {item.role}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 w-full max-w-6xl px-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center md:text-left">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-white">Pronto para embarcar?</h3>
                <p className="text-sm text-gray-300">
                  {t("Converse com a tripulação Merse ou explore os planos para escolher a órbita ideal.")}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 text-xl">
                <a
                  href={instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-purple-300/60 hover:bg-purple-500/20 hover:text-white"
                  aria-label="Instagram da Merse"
                >
                  <PiInstagramLogoFill />
                </a>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-green-300/60 hover:bg-green-500/20 hover:text-white"
                  aria-label="WhatsApp da Merse"
                >
                  <PiWhatsappLogoFill />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        main {
          pointer-events: none;
        }

        main a,
        main button,
        main input,
        main select,
        main textarea,
        main [role="button"] {
          pointer-events: auto;
        }

      `}</style>
      </div>
        </MerseUniverse>
      </div>
    </>
  );
}
