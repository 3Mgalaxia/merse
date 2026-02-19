import {
  Clock3,
  Cpu,
  ImagePlus,
  Layers3,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  WandSparkles,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";

const previews = [
  {
    title: "Hero para landing de IA",
    status: "Aprovado",
    detail: "Conversao +22% no teste A/B da ultima semana.",
  },
  {
    title: "Carrossel de comparativo",
    status: "Em revisao",
    detail: "Ajustar CTA final e reforcar prova social.",
  },
  {
    title: "Story de retargeting",
    status: "Pronto para publicar",
    detail: "Versoes 9:16 e 1:1 exportadas automaticamente.",
  },
];

export default function CreationPage() {
  return (
    <PageShell
      currentPath="/criacao"
      eyebrow="Workspace criativo"
      title="Controle fino do prompt ao deploy visual."
      description="Orquestre composicao, tom, formato e performance em um pipeline unico de criacao com IA."
      primaryAction={{ href: "/modelos", label: "Trocar modelo" }}
      secondaryAction={{ href: "/conta", label: "Ajustar limites" }}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="merse-card merse-hover-rise reveal delay-1 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-100">Briefing de criacao</h2>
            <span className="rounded-full border border-blue-200/30 bg-blue-500/12 px-3 py-1 text-xs font-semibold text-slate-100">
              Modelo ativo: Canvas Titan
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="merse-tag">Auto layout</span>
            <span className="merse-tag">Brand lock</span>
            <span className="merse-tag">Copy assist</span>
            <span className="merse-tag">Multiformat export</span>
          </div>

          <form className="mt-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="prompt" className="merse-label">
                Prompt principal
              </label>
              <textarea
                id="prompt"
                rows={6}
                className="merse-input resize-none"
                defaultValue="Crie uma secao hero para uma plataforma de IA premium com foco em resultados, design sofisticado e CTA de alta conversao."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="format" className="merse-label">
                  Formato
                </label>
                <select id="format" className="merse-input">
                  <option>Landing page completa</option>
                  <option>Feed 1:1</option>
                  <option>Story 9:16</option>
                  <option>Ad horizontal 16:9</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="tone" className="merse-label">
                  Tom da mensagem
                </label>
                <select id="tone" className="merse-input">
                  <option>Premium estrategico</option>
                  <option>Objetivo de conversao</option>
                  <option>Editorial moderno</option>
                  <option>Direto e comercial</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="merse-soft-card merse-hover-rise p-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-slate-100">Detalhe visual</p>
                </div>
                <div className="mt-4 merse-meter">
                  <div className="merse-meter-bar w-[88%]" />
                </div>
              </article>
              <article className="merse-soft-card merse-hover-rise p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-slate-100">Criatividade</p>
                </div>
                <div className="mt-4 merse-meter">
                  <div className="merse-meter-bar w-[72%]" />
                </div>
              </article>
              <article className="merse-soft-card merse-hover-rise p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-slate-100">Velocidade</p>
                </div>
                <div className="mt-4 merse-meter">
                  <div className="merse-meter-bar w-[83%]" />
                </div>
              </article>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="merse-button">
                Gerar variacoes
                <WandSparkles className="size-4" />
              </button>
              <button type="button" className="merse-button-ghost">
                Carregar referencia
                <ImagePlus className="size-4" />
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="merse-card reveal delay-2 p-6">
            <div className="flex items-center gap-2">
              <Layers3 className="size-4 text-cyan-300" />
              <p className="merse-label">Preview engine</p>
            </div>
            <div className="merse-soft-card mt-4 overflow-hidden p-4">
              <div className="h-44 rounded-2xl border border-white/12 bg-[linear-gradient(140deg,rgba(37,65,126,0.75)_0%,rgba(9,16,30,0.92)_44%,rgba(29,96,143,0.8)_100%)] p-4">
                <div className="h-2 w-24 rounded-full bg-cyan-300/70" />
                <div className="mt-4 h-3 w-2/3 rounded-full bg-slate-100/80" />
                <div className="mt-2 h-3 w-1/2 rounded-full bg-slate-100/55" />
                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="h-14 rounded-xl bg-blue-500/35" />
                  <div className="h-14 rounded-xl bg-cyan-400/28" />
                  <div className="h-14 rounded-xl bg-amber-300/30" />
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="merse-kpi">
                <p className="merse-kpi-value">12</p>
                <p className="merse-kpi-label">Variacoes geradas</p>
              </article>
              <article className="merse-kpi">
                <p className="merse-kpi-value">2.1s</p>
                <p className="merse-kpi-label">Tempo medio por render</p>
              </article>
            </div>
          </section>

          <section className="merse-card reveal delay-3 p-6">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-cyan-300" />
              <p className="merse-label">Fila de execucao</p>
            </div>
            <div className="mt-4 space-y-4">
              {previews.map((item) => (
                <article key={item.title} className="merse-soft-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-100">{item.title}</h3>
                    <span className="rounded-full border border-white/15 bg-slate-800/70 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                </article>
              ))}
            </div>
            <button type="button" className="merse-button-ghost mt-4 w-full">
              <TimerReset className="size-4" />
              Reprocessar variacoes
            </button>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
