import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Radio,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Action = {
  href: string;
  label: string;
};

interface PageShellProps {
  currentPath: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  children: React.ReactNode;
}

const navigation = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/modelos", label: "Modelos" },
  { href: "/criacao", label: "Criacao" },
  { href: "/conta", label: "Conta" },
];

const telemetry = [
  {
    label: "Render latency",
    value: "143 ms",
    icon: Zap,
  },
  {
    label: "System integrity",
    value: "99.98%",
    icon: ShieldCheck,
  },
  {
    label: "Inference nodes",
    value: "24 online",
    icon: Cpu,
  },
];

export function PageShell({
  currentPath,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: PageShellProps) {
  return (
    <div className="merse-shell merse-grid-bg">
      <div className="pointer-events-none absolute -left-28 top-16 h-80 w-80 rounded-full merse-glow-one animate-float-slow" />
      <div className="pointer-events-none absolute -right-16 top-44 h-72 w-72 rounded-full merse-glow-two animate-float-fast" />
      <div className="pointer-events-none absolute left-1/3 top-[62%] h-72 w-72 rounded-full merse-glow-three animate-pulse-slow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_center,rgba(125,177,255,0.26)_0%,transparent_70%)] animate-drift" />

      <header className="relative z-10">
        <div className="mx-auto w-full max-w-6xl px-6 pb-4 pt-8 md:px-10">
          <div className="merse-nav flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-blue-200/28 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              <Sparkles className="size-4 text-cyan-300" />
              Merse AI Studio
            </Link>

            <nav className="flex flex-wrap items-center gap-2">
              {navigation.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 shadow-[0_16px_26px_-14px_rgba(77,157,255,0.9)]"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <Radio className="size-3.5" />
              Live
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {telemetry.map((item, index) => (
              <div
                key={item.label}
                className={`merse-soft-card reveal flex items-center gap-3 p-3 ${index === 0 ? "delay-1" : index === 1 ? "delay-2" : "delay-3"}`}
              >
                <item.icon className="size-4 text-cyan-300" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="font-mono text-sm font-semibold text-slate-100">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-16">
        <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-4 md:px-10">
          <span className="merse-chip reveal">{eyebrow}</span>

          <h1 className="merse-title reveal delay-1 mt-5 max-w-4xl">{title}</h1>
          <p className="merse-text reveal delay-2 mt-5 max-w-3xl">{description}</p>

          {(primaryAction || secondaryAction) && (
            <div className="reveal delay-3 mt-8 flex flex-wrap items-center gap-3">
              {primaryAction && (
                <Link href={primaryAction.href} className="merse-button">
                  {primaryAction.label}
                  <ArrowRight className="size-4" />
                </Link>
              )}
              {secondaryAction && (
                <Link href={secondaryAction.href} className="merse-button-ghost">
                  {secondaryAction.label}
                </Link>
              )}
            </div>
          )}
          <div className="merse-separator reveal delay-3 mt-8" />
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 md:px-10">{children}</section>
      </main>
    </div>
  );
}
