import { useEffect, useRef, useState } from "react";
import type { ComponentType, MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  PiAlienFill,
  PiBugFill,
  PiDatabaseFill,
  PiGaugeFill,
  PiPlanetFill,
  PiPowerFill,
  PiShieldCheckFill,
  PiUserCircleFill,
} from "react-icons/pi";
import {
  AnimatePresence,
  motion,
  easeInOut,
  easeOut,
  type TargetAndTransition,
} from "framer-motion";
import { useEnergy } from "@/contexts/EnergyContext";

type CosmicLink =
  | {
      type?: "link";
      href: string;
      label: string;
      description: string;
      icon: ComponentType<{ className?: string }>;
      variant?: "primary" | "support";
    }
  | {
      type: "action";
      label: string;
      description: string;
      icon: ComponentType<{ className?: string }>;
    };

const cosmicLinks: CosmicLink[] = [
  {
    href: "/conta",
    label: "Minha Conta",
    description: "Perfil, seguidores e galeria privada",
    icon: PiUserCircleFill,
  },
  {
    href: "/energia-cosmica",
    label: "Energia Cósmica",
    description: "Consumo atual e limites diários",
    icon: PiGaugeFill,
  },
  {
    href: "/planos",
    label: "Planos & Upgrades",
    description: "Escale sua nave com recursos extras",
    icon: PiPlanetFill,
  },
  {
    href: "/dados",
    label: "Dados & Segurança",
    description: "Backup, exportação e monitoramento",
    icon: PiDatabaseFill,
  },
  {
    href: "/privacidade",
    label: "Privacidade",
    description: "Controle da sua bolha espacial",
    icon: PiShieldCheckFill,
    variant: "support",
  },
  {
    href: "/reportar-bug",
    label: "Reportar Anomalia",
    description: "Sinalize falhas no espaço-tempo",
    icon: PiBugFill,
    variant: "support",
  },
  {
    type: "action",
    label: "Sair da Merse",
    description: "Encerrar sessão e voltar à base",
    icon: PiPowerFill,
  },
];

export default function AlienMenu() {
  const energy = useEnergy();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleOutsideClick = (event: Event) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handleOutsideClick);
    return () => window.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
        logoutTimeoutRef.current = null;
      }
    };
  }, []);

  const handleToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleLogout = () => {
    setOpen(false);
    setIsLoggingOut(true);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("merse.authenticated");
    }

    logoutTimeoutRef.current = setTimeout(() => {
      router.push("/").finally(() => {
        logoutTimeoutRef.current = setTimeout(() => setIsLoggingOut(false), 600);
      });
    }, 360);
  };

  const pulseAnimation: TargetAndTransition = {
    scale: [1.05, 1.16, 1.05],
    boxShadow: [
      "0 0 35px rgba(168,85,247,0.65)",
      "0 0 60px rgba(217,70,239,0.75)",
      "0 0 35px rgba(168,85,247,0.65)",
    ],
    transition: {
      duration: 0.9,
      repeat: Infinity,
      repeatType: "reverse",
      ease: easeInOut,
    },
  };

  const idleAnimation: TargetAndTransition = {
    scale: 1,
    boxShadow: "0 0 25px rgba(168,85,247,0.45)",
    transition: { duration: 0.3, ease: easeOut },
  };

  const buttonAnimation: TargetAndTransition = open ? pulseAnimation : idleAnimation;

  const nearLimit = energy.percentUsed >= 80 && energy.percentUsed < 100;
  const limitReached = energy.percentUsed >= 100;

  return (
    <div ref={containerRef} className="fixed top-6 right-6 z-50 flex flex-col items-end gap-3">
      <motion.button
        type="button"
        onClick={handleToggle}
        className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-purple-400/40 bg-gradient-to-br from-purple-600/80 via-fuchsia-500/70 to-indigo-600/80 text-white backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
        aria-haspopup="true"
        aria-expanded={open}
        animate={buttonAnimation}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="absolute inset-0 rounded-full bg-purple-500/40 blur-xl opacity-0 transition-opacity group-hover:opacity-70" />
        <PiAlienFill className="relative text-2xl" />
        <span className="sr-only">Abrir menu cósmico</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="alien-menu-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-[18.5rem] max-h-[70vh] overflow-y-auto rounded-2xl border border-purple-400/30 bg-black/80 shadow-[0_0_35px_rgba(139,92,246,0.45)] backdrop-blur-xl"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-blue-500/20 opacity-80"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
            <div className="relative space-y-5 p-5">
              <header className="rounded-xl border border-purple-300/20 bg-purple-500/10 p-4 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.38em] text-purple-100">
                      Energia Cósmica
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {energy.percentUsed}% utilizada
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-200/40 bg-purple-500/20 text-xl text-purple-100 shadow-inner">
                    <PiGaugeFill />
                  </span>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-purple-500/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-500 to-indigo-500 shadow-[0_0_18px_rgba(168,85,247,0.8)]"
                    style={{ width: `${Math.min(energy.percentUsed, 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-purple-100/70">
                  <span>{energy.planName}</span>
                  <span>
                    Restam {energy.remaining} / {energy.limit}
                  </span>
                </div>
                {(nearLimit || limitReached) && (
                  <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                    {limitReached ? (
                      <span>
                        Limite diário zerado. <strong>Clique em Planos & Upgrades</strong> para
                        continuar criando sem interrupções.
                      </span>
                    ) : (
                      <span>
                        Energia em {energy.percentUsed}% — restam{" "}
                        <strong>{energy.remaining}</strong> créditos. Considere um upgrade para
                        evitar travamentos.
                      </span>
                    )}
                  </div>
                )}
              </header>

              <nav className="space-y-2">
                {cosmicLinks.map((item) => {
                  const Icon = item.icon;
                  const baseClass =
                    "relative flex items-start gap-3 rounded-xl border px-4 py-3 transition-all hover:-translate-y-[2px]";
                  const colorClass =
                    item.type === "action"
                      ? "border-red-300/40 bg-red-500/10 text-red-100 hover:border-red-200/60 hover:bg-red-500/20"
                      : item.variant === "support"
                      ? "border-blue-300/25 bg-blue-500/10 text-blue-50 hover:border-blue-200/40 hover:bg-blue-500/20"
                      : "border-purple-300/30 bg-purple-500/10 text-purple-50 hover:border-purple-200/60 hover:bg-purple-500/20";

                  const content = (
                    <>
                      <span className="mt-[2px] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg text-white/90">
                        <Icon />
                      </span>
                      <span className="text-left">
                        <span className="block text-sm font-semibold uppercase tracking-[0.28em]">
                          {item.label}
                        </span>
                        <span className="block text-xs text-white/70">{item.description}</span>
                      </span>
                    </>
                  );

                  if (item.type === "action") {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={handleLogout}
                        className={`${baseClass} ${colorClass}`}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${baseClass} ${colorClass}`}
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </Link>
                  );
                })}
              </nav>

              <footer className="rounded-xl border border-white/5 bg-black/30 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-purple-200/70">
                Sempre em expansão
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            key="logout-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="pointer-events-none fixed inset-0 z-[48] overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotate: 6 }}
              animate={{ scale: 1.8, opacity: 0.85, rotate: -6 }}
              exit={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.75, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 h-[120vh] w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-[120px] bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.5),_rgba(59,130,246,0.45),_rgba(14,116,144,0.2),_transparent_70%)] blur-[90px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.5, scale: 1.3 }}
              exit={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.18),_transparent_60%)] blur-3xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
