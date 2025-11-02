import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/router";
import {
  PiCompassFill,
  PiCursorFill,
  PiInstagramLogoFill,
  PiSparkleFill,
  PiWhatsappLogoFill,
} from "react-icons/pi";

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
};

const floatingStars = [
  { size: 12, top: "12%", left: "18%", duration: "22s", delay: "-4s" },
  { size: 18, top: "28%", left: "72%", duration: "26s", delay: "-12s" },
  { size: 14, top: "68%", left: "24%", duration: "24s", delay: "-6s" },
  { size: 10, top: "78%", left: "66%", duration: "20s", delay: "-10s" },
  { size: 8, top: "40%", left: "9%", duration: "28s", delay: "-2s" },
  { size: 16, top: "15%", left: "52%", duration: "25s", delay: "-8s" },
  { size: 9, top: "22%", left: "35%", duration: "23s", delay: "-5s" },
  { size: 13, top: "55%", left: "78%", duration: "27s", delay: "-9s" },
  { size: 11, top: "32%", left: "58%", duration: "21s", delay: "-7s" },
  { size: 7, top: "82%", left: "18%", duration: "26s", delay: "-3s" },
  { size: 15, top: "60%", left: "44%", duration: "29s", delay: "-11s" },
  { size: 6, top: "48%", left: "12%", duration: "24s", delay: "-1s" },
];

export default function Home() {
  const router = useRouter();
  const [stars, setStars] = useState<Star[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const whatsappLink =
    "https://api.whatsapp.com/send/?phone=5562982775813&text=%C3%93l%C3%A1!%20Vim%20da%20Merse%20e%20quero%20conversar%20sobre%20cria%C3%A7%C3%B5es%20com%20IA.&type=phone_number&app_absent=0";
  const instagramLink =
    "https://www.instagram.com/merse.ai/?utm_source=ig_web_button_share_sheet";

  useEffect(() => {
    const generated = Array.from({ length: 80 }).map(() => {
      const offsetX = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 6);
      const offsetY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4);
      return {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        opacity: 0.35 + Math.random() * 0.65,
        duration: `${7 + Math.random() * 6}s`,
        offsetX,
        offsetY,
      };
    });
    const extra = Array.from({ length: 20 }).map(() => {
      const offsetX = (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 8);
      const offsetY = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 5);
      return {
        top: `${5 + Math.random() * 90}%`,
        left: `${5 + Math.random() * 90}%`,
        delay: `${Math.random() * 6}s`,
        opacity: 0.25 + Math.random() * 0.4,
        duration: `${10 + Math.random() * 8}s`,
        offsetX,
        offsetY,
      };
    });
    setStars([...generated, ...extra]);
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

  const handleProtectedNavigation = (target: string) => {
    if (isAuthenticated) {
      router.push(target);
    } else {
      router.push({ pathname: "/login", query: { redirect: target } });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/25 to-black" />
      <div className="aurora absolute inset-x-[-20%] top-[-10%] h-[120%]" />
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star, index) => (
          <div
            key={`star-${index}`}
            className="absolute h-1 w-1 rounded-full bg-white animate-twinkle star-drift"
            style={{
              top: star.top,
              left: star.left,
              animationDelay: star.delay,
              animationDuration: star.duration,
              opacity: star.opacity,
              "--star-x": `${star.offsetX}px`,
              "--star-y": `${star.offsetY}px`,
              "--star-duration": star.duration,
            } as CSSProperties}
          />
        ))}
        {floatingStars.map((star, index) => (
          <div
            key={`floating-${index}`}
            className="floating-star"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              top: star.top,
              left: star.left,
              animationDuration: star.duration,
              animationDelay: star.delay,
            }}
          />
        ))}
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
        <section className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center px-6 pt-16 text-center">
          <h1 className="text-4xl font-extrabold leading-tight md:text-7xl">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              CREATE, DISCOVER, EVOLVE
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-300 md:text-xl">
            Construa mundos, publique coleções e monetize pacotes de prompt em um ambiente futurista,
            desenhado para criadores visionários e equipes corporativas.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => handleProtectedNavigation("/gerar")}
              className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 px-8 py-3 text-sm font-semibold uppercase tracking-widest"
            >
              <span className="relative z-10">Explorar universo</span>
              <span className="absolute inset-0 -z-0 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 blur-xl opacity-60 transition-opacity duration-300 group-hover:opacity-90" />
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
              <p className="mt-4 text-sm text-gray-300">{module.description}</p>
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
              Explore o Prompt Marketplace, compartilhe coleções com o seu público e acompanhe métricas
              de curtidas e saves em tempo real. Assinantes desbloqueiam a área social completa para
              seguidores, comentários e vendas recorrentes.
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
                <p className="mt-3 leading-relaxed">{pillar.copy}</p>
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
                  Das startups às grandes marcas, a Merse oferece uma experiência completa de criação,
                  publicação e monetização com visual futurista e suporte especializado.
                </p>
              </div>
              <div className="space-y-6">
                {testimonials.map((item) => (
                  <blockquote
                    key={item.name}
                    className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-gray-200"
                  >
                    <p className="leading-relaxed">“{item.quote}”</p>
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
                  Converse com a tripulação Merse ou explore os planos para escolher a órbita ideal.
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
    </div>
  );
}
