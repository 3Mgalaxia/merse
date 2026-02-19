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
  { value: "124k", label: "Assets gerados no ultimo mes" },
  { value: "38%", label: "Aumento medio de performance criativa" },
  { value: "4.9/5", label: "Indice de aprovacao de qualidade" },
];

const features = [
  {
    title: "Direcao visual neural",
    text: "Briefings complexos viram propostas visuais prontas e coerentes com marca.",
    icon: Sparkles,
  },
  {
    title: "Motor de producao em escala",
    text: "Lotes, variacoes e versoes finais sincronizadas no mesmo pipeline.",
    icon: Gauge,
  },
  {
    title: "Governanca de marca automatizada",
    text: "Tokens visuais, tom de voz e regras de identidade aplicados sem retrabalho.",
    icon: ShieldCheck,
  },
];

const pipeline = [
  {
    step: "01",
    title: "Escolha o modelo",
    detail: "Ative o motor de IA ideal para produto, campanha ou conteudo continuo.",
  },
  {
    step: "02",
    title: "Direcione a intencao",
    detail: "Defina objetivo, estilo e restricoes de marca em linguagem natural.",
  },
  {
    step: "03",
    title: "Publique e otimize",
    detail: "Exporte formatos finais e continue iterando com feedback em tempo real.",
  },
];

const signals = [
  { label: "Consistencia visual", value: "97%" },
  { label: "Velocidade de entrega", value: "94%" },
  { label: "Aderencia ao briefing", value: "96%" },
];

export default function Home() {
  return (
    <PageShell
      currentPath="/"
      eyebrow="Plataforma de criacao com IA"
      title="Design, copy e performance no mesmo cockpit tecnologico."
      description="Merse AI Studio combina modelos premium, telemetria criativa e padrao visual de alto impacto para produzir mais rapido com qualidade extrema."
      primaryAction={{ href: "/criacao", label: "Comecar criacao" }}
      secondaryAction={{ href: "/modelos", label: "Explorar modelos" }}
    >
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="merse-card merse-hover-rise reveal delay-1 p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">
              Control tower para times que querem qualidade absurda em producao.
            </h2>
            <Bot className="mt-1 size-8 text-cyan-300" />
          </div>
          <p className="mt-4 max-w-2xl text-slate-300">
            Da ideia ao ativo final, voce ganha previsibilidade de entrega com
            um sistema de IA pronto para alto volume e alto padrao visual.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="merse-kpi">
                <p className="merse-kpi-value">{item.value}</p>
                <p className="merse-kpi-label">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="merse-soft-card mt-6 p-4">
            <div className="flex items-center gap-2">
              <LineChart className="size-4 text-cyan-300" />
              <p className="merse-label">Signal map de qualidade</p>
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

        <aside className="merse-card merse-hover-rise reveal delay-2 p-6">
          <p className="merse-label">Pipeline autonomo</p>
          <div className="mt-4 space-y-4">
            {pipeline.map((item) => (
              <div key={item.step} className="merse-soft-card p-4">
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
          <div className="merse-soft-card p-4">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-cyan-300" />
              <p className="merse-label">Nucleo de inferencia</p>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Auto balanceamento entre modelos de layout, copy e conversao para
              manter latencia baixa em picos de uso.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {features.map((item, index) => (
          <article
            key={item.title}
            className={`merse-soft-card merse-hover-rise reveal p-6 ${index === 0 ? "delay-1" : index === 1 ? "delay-2" : "delay-3"}`}
          >
            <item.icon className="size-6 text-cyan-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-100">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="merse-card reveal delay-3 mt-6 flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div>
          <p className="merse-label">Pronto para escalar com confianca</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100 md:text-3xl">
            Um studio completo para operar criacao de IA no nivel enterprise.
          </h3>
        </div>
        <Link href="/login" className="merse-button">
          Entrar no studio
          <Layers3 className="size-4" />
        </Link>
      </div>
    </PageShell>
  );
}
