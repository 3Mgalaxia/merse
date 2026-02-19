import { useMemo, useState } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiChartLineUpFill, PiFlaskFill } from "react-icons/pi";

export default function ABLabPage() {
  const [variations, setVariations] = useState(4);
  const [budget, setBudget] = useState(40);

  const score = useMemo(() => {
    const base = 62;
    const variationBoost = Math.min(20, variations * 2.2);
    const budgetBoost = Math.min(18, budget * 0.22);
    return Math.round(Math.min(99, base + variationBoost + budgetBoost));
  }, [budget, variations]);

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">AB Lab Autônomo</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Função para gerar variações automáticas de criativos e estimar performance antes de publicar.
        </p>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-black/60 p-6">
            <label className="text-xs uppercase tracking-[0.35em] text-white/60">Variações</label>
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={variations}
              onChange={(event) => setVariations(Number(event.target.value))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500"
            />
            <p className="mt-3 text-sm text-white/80">{variations} versões por campanha</p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-black/60 p-6">
            <label className="text-xs uppercase tracking-[0.35em] text-white/60">Orçamento (créditos)</label>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"
            />
            <p className="mt-3 text-sm text-white/80">{budget} créditos de teste</p>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/70 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Score preditivo</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100">
              <PiChartLineUpFill />
              chance de performance: {score}%
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-300/35 bg-purple-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-purple-100">
              <PiFlaskFill />
              modo experimental
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

