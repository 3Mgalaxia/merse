"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import type { IconType } from "react-icons";
import {
  PiBrowsersFill,
  PiFolders,
  PiHouseSimpleFill,
  PiImageFill,
  PiTShirtFill,
  PiVideoFill,
} from "react-icons/pi";

type ToolbarItem = {
  label: string;
  href: string;
  icon: IconType;
};

const toolbarItems: ToolbarItem[] = [
  { label: "Início", href: "/gerar", icon: PiHouseSimpleFill },
  { label: "Imagem", href: "/gerar-foto", icon: PiImageFill },
  { label: "Vídeo", href: "/gerar-video", icon: PiVideoFill },
  { label: "Site", href: "/rascunhos-website", icon: PiBrowsersFill },
  { label: "Roupa", href: "/video-roupas", icon: PiTShirtFill },
  { label: "Criados", href: "/criados", icon: PiFolders },
];

const CosmicToolbar = ({ className = "" }: { className?: string }): JSX.Element => {
  const router = useRouter();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative z-40 ${className}`}
    >
      <div className="pointer-events-none absolute -inset-4 rounded-[2.3rem] bg-gradient-to-r from-purple-500/25 via-fuchsia-500/20 to-blue-500/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-[1.65rem] border border-white/15 bg-black/75 shadow-[0_28px_65px_rgba(10,10,40,0.55)] backdrop-blur-xl">
        <div className="absolute inset-0 opacity-70">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%),linear-gradient(120deg,rgba(255,255,255,0.08)_0%,transparent_45%)]" />
        </div>
        <div className="relative flex items-center justify-center gap-2 px-4 py-3 sm:px-6">
          {toolbarItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              router.pathname === item.href ||
              (item.href !== "/gerar" && router.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-white/70 transition hover:border-white/40 hover:text-white"
              >
                {isActive && (
                  <motion.span
                    layoutId="cosmic-toolbar-active"
                    className="absolute inset-0 rounded-2xl bg-white shadow-[0_12px_35px_rgba(168,85,247,0.35)]"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon
                  className={`relative text-[1.4rem] transition ${
                    isActive
                      ? "text-purple-600"
                      : "text-white/70 group-hover:text-white"
                  }`}
                />
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default CosmicToolbar;
