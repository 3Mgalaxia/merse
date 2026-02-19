import Link from "next/link";
import {
  Bot,
  Cpu,
  Gauge,
  Layers3,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";

const stats = [
  { value: "124k", label: "Sites gerados no último mês" },
  { value: "38%", label: "Aumento médio de performance criativa" },
  { value: "4.9/5", label: "Índice de aprovação de qualidade" },
];

const features = [
  {
    title: "Direção visual neural",
    text: "Briefings complexos viram propostas visuais prontas e coerentes com sua marca, em segundos.",
    icon: Sparkles,
  },
  {
    title: "Produção em escala cósmica",
    text: "Lotes, variações e versões finais sincronizadas em um pipeline automatizado.",
    icon: Gauge,
  },
  {
    title: "Governança de marca automatizada",
    text: "Tokens visuais, tom de voz e identidade aplicados sem retrabalho humano.",
    icon: ShieldCheck,
  },
];

const pipeline = [
  {
    step: "01",
    title: "Escolha o modelo",
    detail: "Ative o motor de IA ideal para produto, campanha ou conteúdo contínuo.",
  },
  {
    step: "02",
    title: "Defina sua intenção",
    detail: "Descreva objetivo, estilo e restrições de marca em linguagem natural.",
  },
  {
    step: "03",
    title: "Publique e otimize",
    detail: "Exporte formatos finais e continue iterando com feedback em tempo real.",
  },
];

const signals = [
  { label: "Consistência visual", value: "97%" },
  { label: "Velocidade de entrega", value: "94%" },
  { label: "Aderência ao briefing", value: "96%" },
];

export default function Home() {
  return (
    <PageShell
      currentPath="/"
      eyebrow="Gerador de sites Galáctico"
      title={
        <>
          <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(106,68,255,0.22)]">
            Crie sites com estética de outra galáxia
          </span>
        </>
      }
      description="Galáctico é o site-generator com IA que entrega sites premium, visual cósmico e performance máxima. Experimente a nova era do design automatizado."
      primaryAction={{ href: "/criacao", label: "Começar agora" }}
      secondaryAction={{ href: "/modelos", label: "Explorar modelos" }}
    >
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="merse-card merse-hover-rise reveal delay-1 p-8 bg-gradient-to-br from-blue-900/70 via-purple-900/60 to-slate-900/80 shadow-[0_0_80px_0_rgba(80,60,255,0.16)]">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">
              Seu portal para criar sites únicos, com visual galáctico e conversão máxima.
            </h2>
            <Bot className="mt-1 size-9 text-cyan-300 drop-shadow-[0_0_12px_rgba(80,200,255,0.32)]" />
          </div>
          <p className="mt-4 max-w-2xl text-slate-300 text-lg">
            Da ideia ao site final, ganhe previsibilidade, velocidade e padrão visual cinematográfico. Tudo com IA, sem código.
          </p>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="merse-kpi bg-gradient-to-br from-blue-800/60 via-purple-700/40 to-slate-900/60 shadow-[0_2px_18px_0_rgba(80,60,255,0.08)]">
                <p className="merse-kpi-value text-cyan-200 drop-shadow-[0_2px_8px_rgba(80,200,255,0.18)]">{item.value}</p>
                <p className="merse-kpi-label">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="merse-soft-card mt-8 p-5 bg-gradient-to-r from-blue-800/50 via-purple-800/40 to-slate-900/50">
            <div className="flex items-center gap-2">
              <LineChart className="size-4 text-cyan-300" />
              <p className="merse-label">Qualidade galáctica</p>
            </div>
            <div className="mt-4 space-y-4">
              {signals.map((signal) => (
                <div key={signal.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>{signal.label}</span>
                    <span className="font-mono text-slate-100">{signal.value}</span>
                  </div>
                  <div className="merse-meter">
                    <div className="merse-meter-bar" style={{ width: signal.value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="merse-card merse-hover-rise reveal delay-2 p-8 flex flex-col gap-6 bg-gradient-to-br from-purple-900/60 via-blue-900/50 to-slate-900/70">
          <p className="merse-label">Pipeline Autônomo</p>
          <div className="space-y-4">
            {pipeline.map((item) => (
              <div key={item.step} className="merse-soft-card p-4 bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900/40">
                <p className="font-mono text-xs text-cyan-300">{item.step}</p>
                <h3 className="mt-2 text-base font-semibold text-slate-100">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
          <div className="merse-separator my-5" />
          <div className="merse-soft-card p-4 bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900/40">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-cyan-300" />
              <p className="merse-label">Núcleo de inferência</p>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Balanceamento automático entre modelos de layout, copy e conversão para manter latência mínima mesmo em picos.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {features.map((item, index) => (
          <article
            key={item.title}
            className={`merse-soft-card merse-hover-rise reveal p-7 bg-gradient-to-br from-blue-900/60 via-purple-900/40 to-slate-900/60 shadow-[0_2px_18px_0_rgba(80,60,255,0.09)] ${index === 0 ? "delay-1" : index === 1 ? "delay-2" : "delay-3"}`}
          >
            <item.icon className="size-7 text-cyan-300 drop-shadow-[0_0_10px_rgba(80,200,255,0.22)]" />
            <h3 className="mt-4 text-lg font-semibold text-slate-100">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="merse-card reveal delay-3 mt-10 flex flex-wrap items-center justify-between gap-6 p-8 bg-gradient-to-r from-blue-900/70 via-purple-900/60 to-slate-900/80 shadow-[0_0_80px_0_rgba(80,60,255,0.12)]">
        <div>
          <p className="merse-label">Pronto para escalar com confiança</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100 md:text-3xl">
            O estúdio galáctico para criar sites premium com IA.
          </h3>
        </div>
        <Link href="/login" className="merse-button bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400">
          Entrar no estúdio
          <Layers3 className="size-4" />
        </Link>
      </div>
    </PageShell>
  );
}
