"use client";

import { useEffect, useMemo, useState } from "react";
import GalacticBackground from "./galactic-background";

type RootShellProps = {
  children: React.ReactNode;
};

export default function RootShell({ children }: RootShellProps) {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let animationFrame: number;
    const startTime = performance.now();
    const duration = 2200;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const completion = Math.min(elapsed / duration, 1);
      const eased = Math.pow(completion, 1.6);
      setProgress(Math.round(eased * 100));
      if (completion < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setTimeout(() => setIsLoading(false), 400);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const gradientStop = useMemo(
    () =>
      `conic-gradient(from 180deg at 50% 50%, #a855f7, #ec4899, #38bdf8, #6366f1, #a855f7)`,
    []
  );

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#020012] via-[#05051b] to-[#0a1230]">
          <div className="flex h-64 w-64 flex-col items-center justify-center gap-6 rounded-3xl border border-slate-800/60 bg-[#030317]/80 p-8 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.65)] backdrop-blur">
            <div className="relative flex flex-col items-center gap-2">
              <div className="relative">
                <div
                  className="h-24 w-24 rounded-full border-[3px] border-slate-800/70"
                  style={{ backgroundImage: gradientStop }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-3xl font-semibold tracking-[0.3em] text-white/80 mix-blend-screen drop-shadow-[0_6px_20px_rgba(8,11,37,0.9)]">
                  3M
                </span>
              </div>
              <p className="text-xs uppercase tracking-[0.6em] text-fuchsia-300/80">
                Pods
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/60">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-sky-200">
                Carregando {progress}%
              </span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`relative min-h-screen transition-opacity duration-500 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <GalacticBackground />
          <div className="smoke-layer smoke-layer--one" />
          <div className="smoke-layer smoke-layer--two" />
          <div className="smoke-layer smoke-layer--three" />
        </div>
        {children}
      </div>
    </>
  );
}
