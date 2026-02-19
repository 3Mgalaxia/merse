"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CosmicToolbar from "@/components/CosmicToolbar";

const GalacticHud = (): JSX.Element => {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4 sm:px-6">
      <Link
        href="/gerar"
        aria-label="Voltar para o hub Merse"
        className="pointer-events-auto fixed -left-52 top-0 z-50 relative flex h-12 min-w-[140px] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-6 text-xs font-semibold uppercase tracking-[0.45em] text-white/80 shadow-[0_12px_30px_rgba(124,58,237,0.25)] transition hover:border-white/40 hover:bg-white/10 hover:text-white"
      >
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.45),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.35),transparent_55%)] opacity-80"
          animate={{ opacity: [0.6, 0.9, 0.6], rotate: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute -inset-[1px] bg-[conic-gradient(from_0deg,rgba(236,72,153,0.55),rgba(59,130,246,0.65),rgba(168,85,247,0.55),rgba(236,72,153,0.55))] opacity-60"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, ease: "linear", repeat: Infinity }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-[2px] rounded-full bg-black/40"
          animate={{ opacity: [0.7, 0.85, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="relative bg-gradient-to-r from-purple-200 via-white to-purple-200 bg-[length:180%_100%] bg-clip-text text-transparent"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          MERSE 1.0
        </motion.span>
        <motion.span
          aria-hidden
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, ease: "linear", repeat: Infinity }}
          style={{ transformOrigin: "center" }}
        >
          <span className="absolute left-full top-1/2 h-2 w-2 -translate-y-1/2 translate-x-2 rounded-full bg-purple-300 shadow-[0_0_10px_rgba(236,72,153,0.65)]" />
        </motion.span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-4"
      >
        <span aria-hidden className="h-12 min-w-[140px]" />

        <CosmicToolbar className="w-full max-w-md" />

        <span aria-hidden className="h-12 w-12" />
      </motion.div>
    </header>
  );
};

export default GalacticHud;
