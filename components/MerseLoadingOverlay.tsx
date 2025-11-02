import { AnimatePresence, motion } from "framer-motion";

type MerseLoadingOverlayProps = {
  active: boolean;
  label?: string;
  sublabel?: string;
};

export default function MerseLoadingOverlay({
  active,
  label = "Processando com Merse AI...",
  sublabel = "Ajustando partículas cósmicas para entregar o resultado perfeito.",
}: MerseLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="merse-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/65 backdrop-blur-md"
        >
          <div className="relative flex h-36 w-36 items-center justify-center">
            <motion.span
              className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-blue-500/40 blur-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute inset-3 rounded-full border border-white/15"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <motion.span
              className="absolute inset-0 rounded-full border border-purple-400/50"
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
            <motion.span
              className="absolute inset-8 rounded-full border border-white/20"
              animate={{
                scale: [0.92, 1.05, 0.92],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.55)]"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 12, -12, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatType: "mirror" }}
            >
              <span className="text-xs font-semibold tracking-[0.3em]">MERSE</span>
            </motion.span>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white">{label}</p>
            {sublabel && (
              <p className="mt-2 text-xs text-white/70">{sublabel}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
