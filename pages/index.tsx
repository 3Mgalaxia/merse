import { useEffect, useRef, useState, type CSSProperties } from "react";
import Script from "next/script";
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

type Star = {
  top: string;
  left: string;
  delay: string;
  opacity: number;
  duration: string;
  offsetX: number;
  offsetY: number;
  size: number;
};

const PLANETS = [
  {
    theme: "terra",
    label: "Planeta Terra",
    src: "/planeta.terra.glb",
    size: "28vmin",
    floatDelay: "0s",
    orbitRadius: "clamp(160px, 22vmin, 280px)",
    orbitDuration: "86s",
    orbitDirection: "normal",
  },
  {
    theme: "agua",
    label: "Planeta Água",
    src: "/planeta.agua.glb",
    size: "26vmin",
    floatDelay: "-3s",
    orbitRadius: "clamp(220px, 28vmin, 360px)",
    orbitDuration: "102s",
    orbitDirection: "reverse",
  },
  {
    theme: "universo",
    label: "Planeta Universo",
    src: "/planeta.universo.glb",
    size: "28vmin",
    floatDelay: "-1.5s",
    orbitRadius: "clamp(260px, 32vmin, 420px)",
    orbitDuration: "118s",
    orbitDirection: "normal",
  },
  {
    theme: "galaxia",
    label: "Planeta Galáxia",
    src: "/planeta.galaxia.glb",
    size: "26vmin",
    floatDelay: "-4.5s",
    orbitRadius: "clamp(190px, 25vmin, 320px)",
    orbitDuration: "92s",
    orbitDirection: "reverse",
  },
  {
    theme: "larva",
    label: "Planeta Larva",
    src: "/planeta.larva.glb",
    size: "30vmin",
    floatDelay: "-2.5s",
    orbitRadius: "clamp(300px, 36vmin, 480px)",
    orbitDuration: "132s",
    orbitDirection: "normal",
  },
  {
    theme: "agua",
    label: "Planeta Azul",
    src: "/planeta.azul.glb",
    size: "22vmin",
    floatDelay: "-5.5s",
    orbitRadius: "clamp(210px, 26vmin, 340px)",
    orbitDuration: "104s",
    orbitDirection: "normal",
  },
  {
    theme: "galaxia",
    label: "Planeta Galauniver",
    src: "/planeta.galauniver.glb",
    size: "25vmin",
    floatDelay: "-7s",
    orbitRadius: "clamp(320px, 38vmin, 520px)",
    orbitDuration: "142s",
    orbitDirection: "reverse",
  },
  {
    theme: "larva",
    label: "Planeta Elien",
    src: "/planeta.elien.glb",
    size: "23vmin",
    floatDelay: "-8.5s",
    orbitRadius: "clamp(240px, 30vmin, 400px)",
    orbitDuration: "110s",
    orbitDirection: "normal",
  },
  {
    theme: "terra",
    label: "Planeta Ceramica",
    src: "/planeta.ceramica.glb",
    size: "22vmin",
    floatDelay: "-5s",
    orbitRadius: "clamp(180px, 24vmin, 320px)",
    orbitDuration: "98s",
    orbitDirection: "reverse",
  },
  {
    theme: "terra",
    label: "Planeta Areia",
    src: "/planeta.areia.glb",
    size: "24vmin",
    floatDelay: "-9s",
    orbitRadius: "clamp(280px, 34vmin, 460px)",
    orbitDuration: "128s",
    orbitDirection: "normal",
  },
  {
    theme: "larva",
    label: "Planeta Gosma",
    src: "/planeta.gosma.glb",
    size: "23vmin",
    floatDelay: "-10.5s",
    orbitRadius: "clamp(260px, 32vmin, 440px)",
    orbitDuration: "120s",
    orbitDirection: "reverse",
  },
  {
    theme: "agua",
    label: "Planeta Bolha",
    src: "/planeta.bolha.glb",
    size: "21vmin",
    floatDelay: "-6.5s",
    orbitRadius: "clamp(200px, 26vmin, 360px)",
    orbitDuration: "108s",
    orbitDirection: "normal",
  },
  {
    theme: "agua",
    label: "Planeta Gelo",
    src: "/planeta.gelo.glb",
    size: "22vmin",
    floatDelay: "-11s",
    orbitRadius: "clamp(240px, 30vmin, 420px)",
    orbitDuration: "116s",
    orbitDirection: "reverse",
  },
  {
    theme: "terra",
    label: "Planeta Rocha",
    src: "/planeta.rocha.glb",
    size: "24vmin",
    floatDelay: "-12s",
    orbitRadius: "clamp(300px, 36vmin, 500px)",
    orbitDuration: "138s",
    orbitDirection: "normal",
  },
  {
    theme: "universo",
    label: "Planeta Plasma",
    src: "/planeta.plasma.glb",
    size: "23vmin",
    floatDelay: "-13s",
    orbitRadius: "clamp(280px, 34vmin, 470px)",
    orbitDuration: "130s",
    orbitDirection: "reverse",
  },
  {
    theme: "galaxia",
    label: "Planeta Nave",
    src: "/planeta.nave.glb",
    size: "20vmin",
    floatDelay: "-14s",
    orbitRadius: "clamp(220px, 28vmin, 380px)",
    orbitDuration: "112s",
    orbitDirection: "normal",
  },
  {
    theme: "universo",
    label: "Planeta Brilho",
    src: "/planeta.brilho.glb",
    size: "21vmin",
    floatDelay: "-15s",
    orbitRadius: "clamp(260px, 32vmin, 440px)",
    orbitDuration: "124s",
    orbitDirection: "reverse",
  },
] as const;

type PlanetInstance = {
  planet: (typeof PLANETS)[number];
  id: string;
  y: string;
  driftDuration: string;
  driftDelay: string;
  near: number;
  mid: number;
  far: number;
  depth: number;
  opacity: number;
  orbitRadius: string;
  orbitDuration: string;
  orbitDirection: "normal" | "reverse";
  floatY: string;
  floatDuration: string;
  bobY: string;
  bobDuration: string;
  z: number;
};

const hash01 = (n: number) => {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
};

const h = (i: number, k: number) => hash01(i * 127.1 + k * 311.7);

const buildPlanetInstances = (): PlanetInstance[] => {
  return PLANETS.map((planet, i) => {
    const y = `${8 + h(i, 1) * 84}%`;

    const depth = 0.22 + h(i, 2) * 0.88;
    const z = Math.round(3 + depth * 8);

    const driftS = 170 + h(i, 3) * 260;
    const driftDuration = `${driftS.toFixed(2)}s`;
    const driftDelay = `-${(h(i, 4) * driftS).toFixed(2)}s`;

    let near = 0.75 + h(i, 5) * 1.65;
    if (h(i, 6) > 0.92) near *= 1.35;

    const mid = Math.max(0.55, near * (0.82 - h(i, 7) * 0.1));
    const far = Math.max(0.35, near * (0.52 - h(i, 8) * 0.1));

    const opacity = 1;

    const floatY = `${-(10 + h(i, 9) * 22).toFixed(2)}px`;
    const floatDuration = `${(18 + h(i, 10) * 22).toFixed(2)}s`;

    const bobY = `${(2 + h(i, 11) * 10).toFixed(2)}px`;
    const bobDuration = `${(26 + h(i, 12) * 30).toFixed(2)}s`;

    const orbitRadius = `${(6 + h(i, 13) * 18).toFixed(2)}px`;
    const orbitDuration = `${(90 + h(i, 14) * 150).toFixed(2)}s`;
    const orbitDirection = (h(i, 15) > 0.5 ? "normal" : "reverse") as
      | "normal"
      | "reverse";

    return {
      planet,
      id: `${planet.theme}-${i}`,
      y,
      driftDuration,
      driftDelay,
      near,
      mid,
      far,
      depth,
      opacity,
      orbitRadius,
      orbitDuration,
      orbitDirection,
      floatY,
      floatDuration,
      bobY,
      bobDuration,
      z,
    };
  });
};

const PLANET_INSTANCES = buildPlanetInstances();

export default function Home() {
  const router = useRouter();
  const { t } = useLocale();
  const exploreTimeoutRef = useRef<number | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGalaxyEntering, setIsGalaxyEntering] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<
    "idle" | "orbit" | "zoom" | "warp" | "iris"
  >("idle");
  const explorePhaseTimeoutsRef = useRef<number[]>([]);

  const whatsappLink =
    "https://api.whatsapp.com/send/?phone=5562982775813&text=%C3%93l%C3%A1!%20Vim%20da%20Merse%20e%20quero%20conversar%20sobre%20cria%C3%A7%C3%B5es%20com%20IA.&type=phone_number&app_absent=0";
  const instagramLink =
    "https://www.instagram.com/merse.ai/?utm_source=ig_web_button_share_sheet";

  useEffect(() => {
    const generated = Array.from({ length: 80 }).map(() => {
      const offsetX = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 6);
      const offsetY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4);
      const size = 1 + Math.random() * 2.4;
      return {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        opacity: 0.35 + Math.random() * 0.65,
        duration: `${7 + Math.random() * 6}s`,
        offsetX,
        offsetY,
        size,
      };
    });
    const extra = Array.from({ length: 20 }).map(() => {
      const offsetX = (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 8);
      const offsetY = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 5);
      const size = 0.8 + Math.random() * 2.2;
      return {
        top: `${5 + Math.random() * 90}%`,
        left: `${5 + Math.random() * 90}%`,
        delay: `${Math.random() * 6}s`,
        opacity: 0.25 + Math.random() * 0.4,
        duration: `${10 + Math.random() * 8}s`,
        offsetX,
        offsetY,
        size,
      };
    });
    setStars([...generated, ...extra]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const tick = () => {
      raf = 0;
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;

      document.documentElement.style.setProperty("--mx", cx.toFixed(3));
      document.documentElement.style.setProperty("--my", cy.toFixed(3));

      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
      if (exploreTimeoutRef.current) {
        window.clearTimeout(exploreTimeoutRef.current);
        exploreTimeoutRef.current = null;
      }
      if (explorePhaseTimeoutsRef.current.length > 0) {
        explorePhaseTimeoutsRef.current.forEach((timeoutId) => {
          window.clearTimeout(timeoutId);
        });
        explorePhaseTimeoutsRef.current = [];
      }
    };
  }, []);

  const handleProtectedNavigation = (target: string) => {
    if (isAuthenticated) {
      router.push(target);
    } else {
      router.push({ pathname: "/login", query: { redirect: target } });
    }
  };

  const handleExploreUniverse = () => {
    if (exploreTimeoutRef.current) {
      window.clearTimeout(exploreTimeoutRef.current);
      exploreTimeoutRef.current = null;
    }
    if (explorePhaseTimeoutsRef.current.length > 0) {
      explorePhaseTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      explorePhaseTimeoutsRef.current = [];
    }
    if (isAuthenticated) {
      router.push("/gerar");
      return;
    }
    setIsGalaxyEntering(true);
    setTransitionPhase("idle");
    exploreTimeoutRef.current = window.setTimeout(() => {
      router.push({ pathname: "/login", query: { redirect: "/gerar" } });
    }, 1800);
  };

  return (
    <div
      className="home-shell relative min-h-screen overflow-visible bg-black font-sans text-white"
      data-transition={isGalaxyEntering ? "galaxy-enter" : "idle"}
      data-phase={transitionPhase}
    >
      <Script
        type="module"
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        strategy="afterInteractive"
      />
      <div className="absolute inset-0">
        <div className="base-backdrop absolute inset-0 bg-gradient-to-b from-black via-purple-950/25 to-black" />
        <div className="galaxy-enter-overlay" aria-hidden="true" />
        <div className="aurora absolute inset-x-[-20%] top-[-12%] h-[120%]" />
        <div className="starfield absolute inset-0 pointer-events-none">
          {stars.map((star, index) => (
            <div
              key={`star-${index}`}
              className="absolute block rounded-full bg-white/80"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDelay: `${star.delay}, ${star.delay}`,
                animationDuration: `${star.duration}, ${star.duration}`,
                animationName: "pulse, star-drift",
                animationTimingFunction: "ease-in-out, ease-in-out",
                animationIterationCount: "infinite, infinite",
                animationDirection: "alternate, alternate",
                animationFillMode: "both, both",
                ["--star-x" as string]: `${star.offsetX}px`,
                ["--star-y" as string]: `${star.offsetY}px`,
                ["--star-duration" as string]: star.duration,
              } as CSSProperties}
            />
          ))}
        </div>
      </div>
      <div className="scene-layer" aria-hidden="true">
        <div className="entity entity-helmet">
          <model-viewer
            className="helmet-model"
            src={encodeURI("/replicate-prediction-rpq3p4q4b1rmr0cvpmbrszr6hr.glb")}
            alt="Capacete de astronauta"
            exposure="1.08"
            auto-rotate={isGalaxyEntering ? undefined : true}
            rotation-per-second="10deg"
            shadow-intensity="0.3"
            shadow-softness="0.9"
            camera-orbit="0deg 65deg auto"
            bounds="tight"
            disable-zoom
            disable-pan
            interaction-prompt="none"
            loading="eager"
            environment-image="neutral"
          />
        </div>
        <div className="entity entity-ship">
          <model-viewer
            className="ship-model"
            src={encodeURI("/replicate-prediction-tbr5wsz519rmw0cvpnd80rsx68.glb")}
            alt="Nave galáctica"
            exposure="1.05"
            auto-rotate={isGalaxyEntering ? undefined : true}
            rotation-per-second="8deg"
            shadow-intensity="0.3"
            shadow-softness="0.9"
            camera-orbit="0deg 60deg auto"
            field-of-view="22deg"
            scale="6 6 6"
            disable-zoom
            disable-pan
            interaction-prompt="none"
            loading="eager"
            environment-image="neutral"
          />
        </div>
        <div className="entity entity-replicate-beta">
          <model-viewer
            className="replicate-model"
            src={encodeURI("/replicate-prediction-fmgh9jtzwsrmw0cvpq0vnn6qjw.glb")}
            alt="Objeto 3D Merse"
            exposure="1.08"
            auto-rotate={isGalaxyEntering ? undefined : true}
            rotation-per-second="6deg"
            shadow-intensity="0.25"
            shadow-softness="0.9"
            camera-orbit="0deg 65deg auto"
            field-of-view="22deg"
            scale="3.2 3.2 3.2"
            disable-zoom
            disable-pan
            interaction-prompt="none"
            loading="eager"
            environment-image="neutral"
          />
        </div>
        {PLANET_INSTANCES.map((inst) => (
          <div
            key={inst.id}
            className="entity entity-planet"
            style={
              {
                top: inst.y,
                zIndex: inst.z,
                ["--planet-size" as string]: inst.planet.size,
                ["--drift-d" as string]: inst.driftDuration,
                ["--drift-delay" as string]: inst.driftDelay,
                ["--near" as string]: String(inst.near),
                ["--mid" as string]: String(inst.mid),
                ["--far" as string]: String(inst.far),
                ["--depth" as string]: String(inst.depth),
                ["--op" as string]: String(inst.opacity),
                ["--orbit-r" as string]: inst.orbitRadius,
                ["--orbit-d" as string]: inst.orbitDuration,
                ["--orbit-dir" as string]: inst.orbitDirection,
                ["--float-y" as string]: inst.floatY,
                ["--float-d" as string]: inst.floatDuration,
                ["--bob-y" as string]: inst.bobY,
                ["--bob-d" as string]: inst.bobDuration,
              } as CSSProperties
            }
          >
            <div className="planet-stream">
              <div className="planet-parallax">
                <div className="planet-bob">
                  <div className="planet-orbit">
                    <div className="planet-float">
                      <model-viewer
                        className="planet-model"
                        src={inst.planet.src}
                        alt={inst.planet.label}
                        exposure="1.1"
                        auto-rotate={isGalaxyEntering ? undefined : true}
                        rotation-per-second="3deg"
                        shadow-intensity="0.15"
                        shadow-softness="0.85"
                        camera-orbit="20deg 65deg auto"
                        field-of-view="24deg"
                        bounds="tight"
                        disable-zoom
                        disable-pan
                        interaction-prompt="none"
                        loading="eager"
                        environment-image="neutral"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rocket-layer" aria-hidden="true">
        <div className="entity entity-rocket">
          <model-viewer
            className="rocket-model"
            src={encodeURI("/replicate-prediction-z7abb5q66nrmr0cvpq3vyxq5ac.glb")}
            alt="Foguete"
            exposure="1.08"
            camera-orbit="0deg 70deg auto"
            field-of-view="30deg"
            bounds="tight"
            disable-zoom
            disable-pan
            interaction-prompt="none"
            loading="eager"
            environment-image="neutral"
          />
        </div>
      </div>

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
              onClick={() => router.push("/login")}
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
        .base-backdrop {
          opacity: 1;
          transition: opacity 0.6s ease;
          z-index: 2;
        }

        .galaxy-enter-overlay {
          position: absolute;
          inset: 0;
          opacity: 0;
          pointer-events: none;
          z-index: 6;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.15) 30%,
            rgba(0, 0, 0, 0.55) 58%,
            rgba(0, 0, 0, 0.88) 80%,
            rgba(0, 0, 0, 1) 100%
          );
          transition: opacity 0.45s ease;
        }


        .starfield {
          transition: opacity 0.6s ease;
        }

        .scene-layer {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 5;
          overflow: visible;
          transform: perspective(1400px)
            rotateX(calc(var(--my, 0) * -3.2deg))
            rotateY(calc(var(--mx, 0) * 4.2deg))
            scale(1.03);
          transform-origin: center;
        }

        .rocket-layer {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 8;
          overflow: visible;
        }

        .entity {
          position: absolute;
          transform-style: preserve-3d;
          will-change: transform;
          pointer-events: none;
        }

        .entity model-viewer {
          display: block;
          width: 100%;
          height: 100%;
          background: transparent;
          --poster-color: transparent;
          --progress-bar-height: 0px;
        }

        .home-shell[data-transition="galaxy-enter"] .galaxy-enter-overlay {
          opacity: 0.72;
        }

        .home-shell[data-transition="galaxy-enter"] header,
        .home-shell[data-transition="galaxy-enter"] main {
          opacity: 0;
          transition: opacity 0.45s ease;
        }

        .home-shell[data-transition="galaxy-enter"] .entity-planet,
        .home-shell[data-transition="galaxy-enter"] .entity-replicate-beta,
        .home-shell[data-transition="galaxy-enter"] .entity-helmet {
          opacity: 0;
          visibility: hidden;
        }

        .home-shell[data-transition="galaxy-enter"] .planet-model {
          animation-play-state: paused;
        }

        .home-shell[data-transition="galaxy-enter"] * {
          animation-play-state: paused !important;
        }

        .home-shell[data-transition="galaxy-enter"] .entity-ship,
        .home-shell[data-transition="galaxy-enter"] .entity-ship * {
          animation-play-state: running !important;
        }

        .entity-helmet {
          right: 7%;
          top: -34vh;
          width: clamp(140px, 18vmin, 240px);
          aspect-ratio: 1 / 1;
          z-index: 10;
          opacity: 0;
          filter: drop-shadow(0 22px 55px rgba(0, 0, 0, 0.65));
          animation: helmet-lost 190s linear infinite;
          animation-delay: -40s;
        }

        .entity-ship {
          left: 50%;
          top: calc(52vh + 6rem);
          width: clamp(1400px, 180vmin, 2400px);
          height: clamp(1000px, 130vmin, 1800px);
          z-index: 8;
          opacity: 0;
          visibility: hidden;
          transform: translate3d(120vw, 0, 0);
          filter: drop-shadow(0 22px 48px rgba(0, 0, 0, 0.6));
        }

        .entity-rocket {
          left: calc(var(--mouse-x, 50vw) + 140px);
          top: calc(var(--mouse-y, 50vh) + 300px);
          width: clamp(900px, 90vmin, 1500px);
          height: clamp(900px, 90vmin, 1500px);
          z-index: 8;
          opacity: 1;
          transform: translate(-50%, -50%);
          filter: drop-shadow(0 34px 90px rgba(0, 0, 0, 0.75));
        }

        .rocket-model {
          width: 100%;
          height: 100%;
          display: block;
          background: transparent;
          --poster-color: transparent;
          --progress-bar-height: 0px;
        }

        .entity-replicate-beta {
          right: 8%;
          bottom: 18%;
          width: clamp(420px, 48vmin, 720px);
          height: clamp(420px, 48vmin, 720px);
          z-index: 7;
          animation: replicate-float 18s ease-in-out infinite reverse;
        }

        .entity-planet {
          left: 0;
          width: var(--planet-size);
          height: var(--planet-size);
          transform: translateY(-50%);
          pointer-events: none;
        }

        .planet-stream {
          width: 100%;
          height: 100%;
          opacity: 0;
          will-change: transform, opacity, filter;
          animation: planet-stream var(--drift-d, 240s) linear infinite;
          animation-delay: var(--drift-delay, 0s);
        }

        .planet-parallax {
          width: 100%;
          height: 100%;
          transform: translate3d(
            calc(var(--mx, 0) * var(--depth, 0.6) * 26px),
            calc(var(--my, 0) * var(--depth, 0.6) * 18px),
            0
          );
          will-change: transform;
        }

        .planet-bob {
          width: 100%;
          height: 100%;
          animation: planet-bob var(--bob-d, 40s) ease-in-out infinite;
        }

        .planet-orbit {
          width: 100%;
          height: 100%;
          animation: orbit var(--orbit-d, 160s) linear infinite;
          animation-direction: var(--orbit-dir, normal);
        }

        .planet-float {
          width: 100%;
          height: 100%;
          animation: float var(--float-d, 22s) ease-in-out infinite;
        }

        .home-shell[data-transition="galaxy-enter"] .entity-ship {
          opacity: 1;
          visibility: visible;
          animation: ship-dock 1.4s cubic-bezier(0.16, 0.85, 0.28, 1) forwards;
        }

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

        .planet-model {
          width: 100%;
          height: 100%;
          background: transparent;
          border-radius: 0 !important;
          overflow: visible !important;
          --poster-color: transparent;
          --progress-bar-height: 0px;
          filter: drop-shadow(0 18px 60px rgba(0, 0, 0, 0.65));
        }

        .planet-model::part(default-progress-bar) {
          display: none;
        }

        @keyframes planet-stream {
          0% {
            transform: translate3d(125vw, 0, 0) scale(var(--near, 1.4));
            opacity: 0;
            filter: blur(0.9px);
          }
          12% {
            opacity: var(--op, 0.85);
            filter: blur(0px);
          }
          55% {
            transform: translate3d(38vw, 0, 0) scale(var(--mid, 1.0));
            opacity: var(--op, 0.85);
            filter: blur(0.35px);
          }
          100% {
            transform: translate3d(-35vw, 0, 0) scale(var(--far, 0.6));
            opacity: 0;
            filter: blur(1.1px);
          }
        }

        @keyframes planet-bob {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(calc(var(--bob-y, 6px) * -1)) rotate(1.2deg);
          }
        }

        @keyframes orbit {
          from {
            transform: rotate(0deg) translateX(var(--orbit-r, 10px)) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(var(--orbit-r, 10px)) rotate(-360deg);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(var(--float-y, -14px));
          }
        }

        @keyframes helmet-lost {
          0% {
            transform: translate3d(calc(var(--mx, 0) * -16px), 0, 0)
              translateY(0)
              rotate(18deg)
              scale(0.95);
            opacity: 0;
            filter: blur(0.15px);
          }
          10% {
            opacity: 0.85;
          }
          60% {
            transform: translate3d(calc(var(--mx, 0) * -22px), 0, 0)
              translateY(105vh)
              rotate(220deg)
              scale(0.55);
            opacity: 0.55;
            filter: blur(0.45px);
          }
          100% {
            transform: translate3d(calc(var(--mx, 0) * -26px), 0, 0)
              translateY(175vh)
              rotate(360deg)
              scale(0.35);
            opacity: 0;
            filter: blur(0.9px);
          }
        }

        @keyframes ship-dock {
          0% {
            transform: translate3d(120vw, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @keyframes replicate-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(-2deg);
          }
          50% {
            transform: translate3d(0, -16px, 0) rotate(2deg);
          }
        }

      `}</style>
    </div>
  );
}
