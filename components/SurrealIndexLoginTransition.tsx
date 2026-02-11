import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { useMemo } from "react";

type TransitionVariant = "indexToLogin" | "loginToIndex";

type SurrealIndexLoginTransitionProps = {
  active: boolean;
  variant: TransitionVariant;
  origin: { x: number; y: number } | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seeded01(seed: number) {
  // Deterministic pseudo-random number in [0, 1).
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function SurrealIndexLoginTransition({
  active,
  variant,
  origin,
}: SurrealIndexLoginTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  const layers = useMemo(() => {
    const baseSeed = variant === "indexToLogin" ? 1337 : 7331;
    return Array.from({ length: 14 }).map((_, index) => {
      const s = baseSeed + index * 17;
      const left = seeded01(s) * 100;
      const top = seeded01(s + 1) * 100;
      const len = 90 + seeded01(s + 2) * 180;
      const delay = seeded01(s + 3) * 0.35;
      const duration = 0.65 + seeded01(s + 4) * 0.9;
      const opacity = 0.12 + seeded01(s + 5) * 0.25;
      const angle = (seeded01(s + 6) > 0.5 ? 1 : -1) * (18 + seeded01(s + 7) * 22);
      return { left, top, len, delay, duration, opacity, angle };
    });
  }, [variant]);

  const resolvedOrigin = useMemo(() => {
    if (typeof window === "undefined") return { x: 0.5, y: 0.45 };
    const x = origin ? origin.x : window.innerWidth * 0.5;
    const y = origin ? origin.y : window.innerHeight * 0.45;
    return {
      x: clamp(x / window.innerWidth, 0.1, 0.9),
      y: clamp(y / window.innerHeight, 0.12, 0.88),
    };
  }, [origin]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={`surreal-${variant}`}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeInOut" }}
          className="pointer-events-none fixed inset-0 z-[999] overflow-hidden"
          style={
            {
              // Used by CSS gradients/masks.
              ["--merse-origin-x" as never]: `${(resolvedOrigin.x * 100).toFixed(2)}%`,
              ["--merse-origin-y" as never]: `${(resolvedOrigin.y * 100).toFixed(2)}%`,
            } as CSSProperties
          }
        >
          <div className="merse-portal-base" />

          {!prefersReducedMotion && (
            <>
              <div className="merse-portal-swirl" />
              <div className="merse-portal-noise" />
              <div className="merse-portal-scanlines" />

              <motion.div
                className="merse-portal-iris"
                initial={{ scale: 0.6, opacity: 0.0, rotate: variant === "indexToLogin" ? -10 : 8 }}
                animate={{ scale: 2.15, opacity: 1, rotate: variant === "indexToLogin" ? 8 : -6 }}
                exit={{ scale: 2.65, opacity: 0, rotate: variant === "indexToLogin" ? 14 : -12 }}
                transition={{ duration: 0.85, ease: [0.2, 0.9, 0.25, 1] }}
              />

              <div className="absolute inset-0">
                {layers.map((layer, index) => (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="merse-portal-streak"
                    style={
                      {
                        left: `${layer.left}%`,
                        top: `${layer.top}%`,
                        height: `${layer.len}px`,
                        opacity: layer.opacity,
                        transform: `rotate(${layer.angle}deg)`,
                        animationDelay: `${layer.delay}s`,
                        animationDuration: `${layer.duration}s`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </>
          )}

          {prefersReducedMotion && <div className="merse-portal-reduced" />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
