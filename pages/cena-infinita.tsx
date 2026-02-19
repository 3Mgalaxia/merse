import { useMemo, useState } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiLinkSimpleHorizontalFill, PiVideoFill } from "react-icons/pi";

export default function CenaInfinitaPage() {
  const [segmentDuration, setSegmentDuration] = useState(10);
  const [segments, setSegments] = useState(3);

  const totalDuration = useMemo(() => segmentDuration * segments, [segmentDuration, segments]);

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Cena Infinita</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Monte vídeos longos com continuidade automática de movimento, cenário e ritmo entre vários
          clipes curtos.
        </p>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-black/60 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Duração por clipe</p>
            <div className="mt-4 flex gap-2">
              {[5, 10, 15].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSegmentDuration(value)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
                    segmentDuration === value
                      ? "border-fuchsia-300/45 bg-fuchsia-500/15 text-fuchsia-100"
                      : "border-white/20 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {value}s
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-black/60 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Quantidade de clipes</p>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={segments}
              onChange={(event) => setSegments(Number(event.target.value))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500"
            />
            <p className="mt-3 text-sm text-white/80">{segments} segmentos encadeados</p>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/70 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Resultado esperado</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-fuchsia-100">
              <PiVideoFill />
              vídeo final: {totalDuration}s
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/35 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-blue-100">
              <PiLinkSimpleHorizontalFill />
              continuidade de narrativa ativa
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

