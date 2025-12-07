import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PiBrowsersFill,
  PiCodeFill,
  PiInstagramLogoFill,
  PiRocketFill,
  PiSparkleFill,
  PiWhatsappLogoFill,
} from "react-icons/pi";

type Star = {
  top: string;
  left: string;
  delay: string;
  duration: string;
  driftDelay: string;
  driftDuration: string;
  offsetX: string;
  offsetY: string;
  size: number;
  opacity: number;
};

const destinations = [
  {
    title: "Site Merse",
    description: "Entre no portal principal para viver a experiência completa do laboratório.",
    href: "https://merse.app.br",
    accent: "from-pink-500/45 via-pink-600/30 to-black/40",
    icon: PiBrowsersFill,
  },
  {
    title: "Extensão Merse",
    description: "Leve a estética e a IA Merse para qualquer aba do seu navegador.",
    href: "https://marketplace.visualstudio.com/items?itemName=Merse.merse-codex",
    accent: "from-blue-500/30 via-cyan-500/18 to-emerald-500/24",
    icon: PiRocketFill,
  },
  {
    title: "APIs Merse",
    description: "Conecte engines hospedadas no Replicate e acelere seus protótipos.",
    href: "https://replicate.com/3mgalaxia/merse",
    accent: "from-cyan-400/35 via-cyan-500/24 to-teal-600/28",
    icon: PiCodeFill,
  },
  {
    title: "Aplicativo Merse",
    description: "Companion app para explorar packs, salvar criações e monitorar energia.",
    href: "https://merse.app.br/app",
    accent: "from-purple-500/40 via-fuchsia-500/22 to-black/35",
    icon: PiRocketFill,
  },
  {
    title: "WhatsApp Tripulação",
    description: "Fale direto com o time e tire dúvidas sobre módulos e planos.",
    href: "https://api.whatsapp.com/send/?phone=5562982775813&text=%C3%93l%C3%A1!%20Vim%20da%20Merse%20e%20quero%20conversar%20sobre%20cria%C3%A7%C3%B5es%20com%20IA.&type=phone_number&app_absent=0",
    accent: "from-emerald-400/30 via-green-500/20 to-emerald-700/28",
    icon: PiWhatsappLogoFill,
  },
  {
    title: "Instagram Merse",
    description: "Bastidores, drops visuais e sneak peeks do ecossistema.",
    href: "https://www.instagram.com/merse.ai/?utm_source=ig_web_button_share_sheet",
    accent: "from-pink-500/30 via-purple-500/18 to-amber-500/20",
    icon: PiInstagramLogoFill,
  },
] as const;

const apiDetails = [
  {
    title: "Merse · Gerador de Imagem",
    href: "https://replicate.com/3mgalaxia/merse-gerador-de-imagem",
    description: "Transforme prompts em renders cinematográficos no endpoint otimizado da Merse.",
    badge: "Imagem",
  },
  {
    title: "Merse · Base Criativa",
    href: "https://replicate.com/3mgalaxia/merse",
    description:
      "Envie uma foto e receba a versão masculina ou feminina com estilo Merse mantendo o rosto original.",
    badge: "Gênero",
  },
  {
    title: "Merse · Gerador de Site",
    href: "https://replicate.com/3mgalaxia/merse-gerador-de-site",
    description: "Receba HTML completo para landings e seções futuristas com estética Merse.",
    badge: "Sites",
  },
] as const;

export default function ExplorarMerse() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showApiPanel, setShowApiPanel] = useState(false);
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: prefersReducedMotion ? 120 : 180 }).map(() => {
        const size = 1 + Math.random() * 2.2;
        const driftRangeX = prefersReducedMotion ? 18 : 32;
        const driftRangeY = prefersReducedMotion ? 14 : 26;
        const driftX = `${-driftRangeX + Math.random() * driftRangeX * 2}px`;
        const driftY = `${-driftRangeY + Math.random() * driftRangeY * 2}px`;
        const pulseDuration = `${4 + Math.random() * 3}s`;
        const driftDuration = `${12 + Math.random() * 10}s`;
        return {
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          delay: `${Math.random() * 3}s`,
          duration: pulseDuration,
          driftDelay: `${Math.random() * 5}s`,
          driftDuration,
          offsetX: driftX,
          offsetY: driftY,
          size,
          opacity: 0.28 + Math.random() * 0.6,
        };
      }),
    [prefersReducedMotion],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefersReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-32 text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/25 to-black" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0">
          {stars.map((star, index) => (
            <span
              key={`star-${index}`}
              className="absolute block rounded-full bg-white/80"
              style={
                {
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  opacity: star.opacity,
                  animationDelay: prefersReducedMotion
                    ? `${star.delay}`
                    : `${star.delay}, ${star.driftDelay}`,
                  animationDuration: prefersReducedMotion
                    ? `${star.duration}`
                    : `${star.duration}, ${star.driftDuration}`,
                  animationName: prefersReducedMotion ? "pulse" : "pulse, star-drift",
                  animationTimingFunction: prefersReducedMotion
                    ? "ease-in-out"
                    : "ease-in-out, ease-in-out",
                  animationIterationCount: prefersReducedMotion ? "infinite" : "infinite, infinite",
                  animationDirection: prefersReducedMotion ? "alternate" : "alternate, alternate",
                  animationFillMode: prefersReducedMotion ? "both" : "both, both",
                  ["--star-x" as string]: star.offsetX,
                  ["--star-y" as string]: star.offsetY,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen">
          <motion.div
            className="absolute -left-[32%] top-[8%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.42),transparent_62%)] blur-[160px]"
            animate={
              prefersReducedMotion ? undefined : { x: ["-22%", "110%", "-22%"], y: ["6%", "-8%", "6%"] }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 24, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
            }
          />
          <motion.div
            className="absolute left-[12%] bottom-[-12%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,197,235,0.32),transparent_62%)] blur-[170px]"
            animate={
              prefersReducedMotion ? undefined : { x: ["-18%", "120%", "-18%"], y: ["4%", "-6%", "4%"] }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 28, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1.2 }
            }
          />
          <motion.div
            className="absolute right-[-28%] top-[28%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.3),transparent_62%)] blur-[160px]"
            animate={
              prefersReducedMotion ? undefined : { x: ["-40%", "100%", "-40%"], y: ["-6%", "12%", "-6%"] }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 30, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 2.1 }
            }
          />
        </motion.div>
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10">

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-white/70">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lg text-purple-200">
              <PiSparkleFill />
            </span>
            Destinos oficiais
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {destinations.map((item) => {
              const Icon = item.icon;
              const isExternal = item.href.startsWith("http");
              const isApiCard = item.title === "APIs Merse";
              const isWhatsApp = item.title === "WhatsApp Tripulação";
              return (
                <motion.a
                  key={item.title}
                  href={item.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_32px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition duration-300"
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={(event) => {
                    if (isApiCard) {
                      event.preventDefault();
                      setShowApiPanel((prev) => !prev);
                    }
                  }}
                >
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${item.accent} opacity-90`} />
                  <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full bg-white/10 blur-[120px]" />
                  <div
                    className={`absolute left-[-12%] bottom-[-18%] h-52 w-52 rounded-full blur-[110px] ${
                      isWhatsApp ? "bg-emerald-200/14" : "bg-white/5"
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <div className="absolute inset-0 border border-white/10 rounded-3xl opacity-50" />
                  <div className="relative flex flex-col gap-4 text-white">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-black/30 text-xl text-white/80 group-hover:border-white/50 group-hover:text-white">
                        <Icon />
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:border-white/45 group-hover:text-white">
                        Acessar <span aria-hidden>→</span>
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="text-sm text-white/70">{item.description}</p>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </section>

        <AnimatePresence>
          {showApiPanel && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-80">
                <motion.div
                  className="absolute -left-[32%] top-[-18%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.35),transparent_62%)] blur-[90px]"
                  animate={{ x: ["-8%", "14%", "-8%"], y: ["-6%", "10%", "-6%"] }}
                  transition={{ duration: 18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute right-[-26%] bottom-[-18%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.35),transparent_62%)] blur-[110px]"
                  animate={{ x: ["4%", "-10%", "4%"], y: ["6%", "-8%", "6%"] }}
                  transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 0.7 }}
                />
              </div>
              <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">APIs Merse</p>
                  <h3 className="text-2xl font-semibold text-white md:text-3xl">
                    Integre direto com o laboratório Merse
                  </h3>
                  <p className="max-w-3xl text-sm text-white/70">
                    Conecte seu stack às engines hospedadas no Replicate e acelere protótipos de imagem, troca de
                    gênero e HTML.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiPanel(false)}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/35 hover:bg-white/20"
                >
                  Fechar
                </button>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {apiDetails.map((api) => (
                  <a
                    key={api.href}
                    href={api.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[0_14px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-white/25 hover:bg-white/5"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-white/70">
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">{api.badge}</span>
                      <span className="text-white/60 group-hover:text-white">↗</span>
                    </div>
                    <h4 className="mt-3 text-lg font-semibold text-white">{api.title}</h4>
                    <p className="mt-2 text-sm text-white/70">{api.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/80 transition group-hover:border-white/40 group-hover:bg-white/15">
                      Abrir no Replicate <span aria-hidden>↗</span>
                    </span>
                  </a>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-80">
            <motion.div
              className="absolute -left-[40%] top-[-10%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.35),transparent_62%)] blur-[90px]"
              animate={{ x: ["-10%", "20%", "-10%"], y: ["-6%", "8%", "-6%"] }}
              transition={{ duration: 18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
            />
            <motion.div
              className="absolute right-[-30%] bottom-[-18%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.3),transparent_62%)] blur-[110px]"
              animate={{ x: ["6%", "-12%", "6%"], y: ["8%", "-6%", "8%"] }}
              transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 0.8 }}
            />
          </div>
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Conecte-se</p>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Fale direto com nossa tripulação
              </h2>
              <p className="max-w-2xl text-sm text-white/70">
                Suporte prioritário, parcerias ou sessões de co-criação. Disponível 09h – 22h (fuso Brasília).
                Mensagem automática identifica que você veio da Merse para acelerar o atendimento.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 md:justify-end">
              <a
                href="https://api.whatsapp.com/send/?phone=5562982775813&text=%C3%93l%C3%A1!%20Vim%20da%20Merse%20e%20quero%20conversar%20sobre%20cria%C3%A7%C3%B5es%20com%20IA.&type=phone_number&app_absent=0"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-green-300/50 hover:bg-[rgba(16,185,129,0.14)] hover:shadow-[0_0_30px_rgba(74,222,128,0.35)]"
              >
                <PiWhatsappLogoFill className="transition group-hover:text-green-400" /> WhatsApp prioritário
              </a>
              <a
                href="https://www.instagram.com/merse.ai/?utm_source=ig_web_button_share_sheet"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-pink-300/50 hover:bg-[rgba(236,72,153,0.14)] hover:shadow-[0_0_30px_rgba(236,72,153,0.35)]"
              >
                <PiInstagramLogoFill className="transition group-hover:text-pink-300" /> Instagram oficial
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
