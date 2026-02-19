import { useMemo, useState } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiChartLineUpFill, PiSparkleFill } from "react-icons/pi";

const niches = ["Moda", "E-commerce", "Educação", "Infoproduto", "Tecnologia", "Imobiliário"];
const objectives = ["Leads", "Vendas", "Autoridade", "Retenção"];

const trendLibrary: Record<string, string[]> = {
  Moda: ["Drop secreto em 24h", "Comparativo real x IA", "Transformação antes/depois"],
  "E-commerce": ["Oferta em camadas", "Produto em 5 cenas", "Prova social visual"],
  Educação: ["Mini aula com plot twist", "Erro comum do mercado", "Método em 3 passos"],
  Infoproduto: ["Bastidores de lançamento", "Dores invisíveis do nicho", "Mapa de execução 7 dias"],
  Tecnologia: ["Demo futurista do produto", "Feature battle", "Automação que poupa horas"],
  Imobiliário: ["Tour narrado de alto padrão", "Valorização por bairro", "Antes/depois de reforma"],
};

export default function TrendOraculoPage() {
  const [niche, setNiche] = useState(niches[0]);
  const [objective, setObjective] = useState(objectives[0]);
  const [riskLevel, setRiskLevel] = useState(55);

  const signals = useMemo(() => {
    const base = trendLibrary[niche] ?? trendLibrary.Moda;
    return base.map((title, index) => {
      const raw = 60 + ((riskLevel + index * 11 + objective.length * 7) % 38);
      const score = Math.max(60, Math.min(98, raw));
      const format = index === 0 ? "Reel + Story" : index === 1 ? "Short + Carrossel" : "Reel + Landing";
      const direction =
        objective === "Vendas"
          ? "Enfatizar oferta clara e CTA direto."
          : objective === "Leads"
            ? "Enfatizar benefício imediato com captura rápida."
            : objective === "Autoridade"
              ? "Enfatizar prova técnica e visão de futuro."
              : "Enfatizar comunidade e continuidade da série.";
      return { title, score, format, direction };
    });
  }, [niche, objective, riskLevel]);

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Oráculo de Tendências</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Novo módulo para prever temas de alta tração por nicho e já sugerir formato ideal de publicação.
        </p>

        <section className="grid gap-5 rounded-3xl border border-white/10 bg-black/60 p-6 md:grid-cols-3">
          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Nicho
            <select
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-black/55 px-3 py-3 text-sm tracking-normal text-white outline-none"
            >
              {niches.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Objetivo
            <select
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-black/55 px-3 py-3 text-sm tracking-normal text-white outline-none"
            >
              {objectives.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Nível de ousadia
            <input
              type="range"
              min={20}
              max={95}
              value={riskLevel}
              onChange={(event) => setRiskLevel(Number(event.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
            />
            <p className="text-sm tracking-normal text-white/80">{riskLevel}%</p>
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {signals.map((signal) => (
            <article
              key={signal.title}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.32em] text-amber-200/80">Sinal</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-amber-100">
                  <PiChartLineUpFill /> {signal.score}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{signal.title}</h3>
              <p className="mt-2 text-sm text-white/70">{signal.direction}</p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-white/55">{signal.format}</p>
            </article>
          ))}
        </section>

        <div className="inline-flex items-center gap-2 rounded-full border border-purple-300/35 bg-purple-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-purple-100">
          <PiSparkleFill />
          pronto para conectar com loop automation
        </div>
      </div>
    </div>
  );
}

