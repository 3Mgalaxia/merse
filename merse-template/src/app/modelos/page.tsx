import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Clapperboard,
  Layers3,
  Megaphone,
  Package,
  PenTool,
  Rocket,
  SlidersHorizontal,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";

interface ModelCard {
  name: string;
  focus: string;
  quality: string;
  latency: string;
  context: string;
  throughput: string;
  icon: LucideIcon;
  tags: string[];
  score: number;
}

const models: ModelCard[] = [
  {
    name: "Canvas Titan",
    focus: "Direcao visual para campanhas premium",
    quality: "Ultra",
    latency: "1.8s",
    context: "128k",
    throughput: "42 req/s",
    icon: Layers3,
    tags: ["Brand", "Campaign", "Art Direction"],
    score: 98,
  },
  {
    name: "Copy Pilot",
    focus: "Textos de alta conversao para ads e paginas",
    quality: "High",
    latency: "0.9s",
    context: "64k",
    throughput: "88 req/s",
    icon: PenTool,
    tags: ["Sales", "SEO", "Email"],
    score: 94,
  },
  {
    name: "Launch Engine",
    focus: "Assets para lancamento de produto em escala",
    quality: "Ultra",
    latency: "1.2s",
    context: "96k",
    throughput: "64 req/s",
    icon: Package,
    tags: ["E-commerce", "Product", "Performance"],
    score: 96,
  },
  {
    name: "Ad Motion",
    focus: "Roteiro, hook e storyboard de video curto",
    quality: "High",
    latency: "1.5s",
    context: "48k",
    throughput: "52 req/s",
    icon: Clapperboard,
    tags: ["Video", "TikTok", "Reels"],
    score: 91,
  },
  {
    name: "Neural Growth",
    focus: "Planejamento de funil e experimentos de midia",
    quality: "High",
    latency: "1.0s",
    context: "80k",
    throughput: "73 req/s",
    icon: Brain,
    tags: ["Growth", "Funnel", "Analytics"],
    score: 93,
  },
  {
    name: "Brand Voice",
    focus: "Consistencia de tom e narrativa por canal",
    quality: "Ultra",
    latency: "1.1s",
    context: "72k",
    throughput: "69 req/s",
    icon: Megaphone,
    tags: ["Voice", "Social", "Authority"],
    score: 95,
  },
];

const categories = [
  "All",
  "Brand Systems",
  "Performance Copy",
  "Video Engine",
  "Growth Ops",
];

export default function ModelsPage() {
  return (
    <PageShell
      currentPath="/modelos"
      eyebrow="Model library"
      title="Stack de modelos com telemetria real e performance previsivel."
      description="Ative o modelo certo para cada objetivo e acompanhe qualidade, latencia e escala em tempo real."
      primaryAction={{ href: "/criacao", label: "Usar modelos" }}
      secondaryAction={{ href: "/conta", label: "Gerenciar plano" }}
    >
      <section className="merse-card reveal delay-1 mb-6 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-cyan-300" />
            <p className="merse-label">Filtros e clusters</p>
          </div>
          <span className="merse-tag">Nodes online: 24</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button key={category} type="button" className="merse-tag merse-hover-rise">
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {models.map((model, index) => (
          <article
            key={model.name}
            className={`merse-card merse-hover-rise reveal p-5 ${index % 3 === 0 ? "delay-1" : index % 3 === 1 ? "delay-2" : "delay-3"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <model.icon className="size-6 text-cyan-300" />
              <span className="rounded-full border border-blue-200/30 bg-blue-500/12 px-3 py-1 text-xs font-semibold text-slate-100">
                {model.quality}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-100">{model.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{model.focus}</p>

            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="merse-soft-card p-3">
                <p className="merse-label">Latencia</p>
                <p className="mt-1 font-mono text-base text-slate-100">{model.latency}</p>
              </div>
              <div className="merse-soft-card p-3">
                <p className="merse-label">Contexto</p>
                <p className="mt-1 font-mono text-base text-slate-100">{model.context}</p>
              </div>
              <div className="merse-soft-card p-3">
                <p className="merse-label">Throughput</p>
                <p className="mt-1 font-mono text-base text-slate-100">{model.throughput}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {model.tags.map((tag) => (
                <span key={`${model.name}-${tag}`} className="merse-tag">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Model score</span>
                <span className="font-mono text-slate-100">{model.score}/100</span>
              </div>
              <div className="merse-meter">
                <div className="merse-meter-bar" style={{ width: `${model.score}%` }} />
              </div>
            </div>

            <button type="button" className="merse-button mt-5 w-full">
              Ativar modelo
            </button>
          </article>
        ))}
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="merse-card reveal delay-2 p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-cyan-300" />
            <p className="merse-label">Benchmark interno</p>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Fidelidade visual</span>
                <span className="font-mono text-slate-100">97%</span>
              </div>
              <div className="merse-meter">
                <div className="merse-meter-bar w-[97%]" />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Coerencia de texto</span>
                <span className="font-mono text-slate-100">94%</span>
              </div>
              <div className="merse-meter">
                <div className="merse-meter-bar w-[94%]" />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Velocidade media</span>
                <span className="font-mono text-slate-100">91%</span>
              </div>
              <div className="merse-meter">
                <div className="merse-meter-bar w-[91%]" />
              </div>
            </div>
          </div>
        </article>

        <article className="merse-card reveal delay-3 p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Rocket className="size-5 text-cyan-300" />
            <p className="merse-label">Top modelos da semana</p>
          </div>
          <div className="mt-4 space-y-3">
            {models
              .slice()
              .sort((a, b) => b.score - a.score)
              .slice(0, 4)
              .map((model, idx) => (
                <article
                  key={model.name}
                  className="merse-soft-card flex items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/16 text-xs font-bold text-cyan-200">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{model.name}</p>
                      <p className="text-xs text-slate-400">{model.focus}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-100">
                    {model.score}
                  </span>
                </article>
              ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}
