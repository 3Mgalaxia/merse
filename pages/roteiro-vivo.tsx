import { useMemo, useState } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiPaperPlaneTiltFill, PiVideoFill } from "react-icons/pi";

const hooks = ["Abertura com impacto", "Prova rápida", "Comparativo visual", "CTA com urgência"];
const cameraStyles = ["close-up", "travelling lateral", "plano aberto", "orbital suave"];

function secToLabel(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function RoteiroVivoPage() {
  const [duration, setDuration] = useState(30);
  const [beats, setBeats] = useState(3);
  const [objective, setObjective] = useState("Conversão");

  const timeline = useMemo(() => {
    const baseSegment = Math.floor(duration / beats);
    const remaining = duration % beats;
    let cursor = 0;

    return Array.from({ length: beats }).map((_, index) => {
      const extra = index < remaining ? 1 : 0;
      const segment = baseSegment + extra;
      const start = cursor;
      const end = cursor + segment;
      cursor = end;

      return {
        id: `beat-${index}`,
        title: `Cena ${index + 1}`,
        start,
        end,
        hook: hooks[index % hooks.length],
        camera: cameraStyles[(index + duration) % cameraStyles.length],
        prompt:
          objective === "Conversão"
            ? "Enfatizar benefício direto e prova visual do resultado."
            : objective === "Alcance"
              ? "Gancho rápido e ritmo alto para retenção."
              : "Narrativa consistente com assinatura da marca.",
      };
    });
  }, [duration, beats, objective]);

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Roteiro Vivo</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Planejador para quebrar vídeos longos em cenas menores com prompts prontos para geração segmentada.
        </p>

        <section className="grid gap-5 rounded-3xl border border-white/10 bg-black/60 p-6 md:grid-cols-3">
          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Duração total
            <select
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="w-full rounded-2xl border border-white/20 bg-black/55 px-3 py-3 text-sm tracking-normal text-white outline-none"
            >
              {[15, 30, 45, 60].map((item) => (
                <option key={item} value={item}>
                  {item}s
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Número de cenas
            <input
              type="range"
              min={2}
              max={8}
              value={beats}
              onChange={(event) => setBeats(Number(event.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500"
            />
            <p className="text-sm tracking-normal text-white/80">{beats} cenas</p>
          </label>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Objetivo
            <select
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-black/55 px-3 py-3 text-sm tracking-normal text-white outline-none"
            >
              {["Conversão", "Alcance", "Branding"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {timeline.map((beat) => (
            <article
              key={beat.id}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{beat.title}</h3>
                <span className="rounded-full border border-rose-300/35 bg-rose-500/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-rose-100">
                  {secToLabel(beat.start)} - {secToLabel(beat.end)}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/70">{beat.hook}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-white/55">{beat.camera}</p>
              <p className="mt-3 text-sm text-white/78">{beat.prompt}</p>
            </article>
          ))}
        </section>

        <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/35 bg-rose-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-rose-100">
          <PiVideoFill />
          {beats} segmentos prontos para renderizar
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/35 bg-orange-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-orange-100">
          <PiPaperPlaneTiltFill />
          exportação para pipeline em breve
        </div>
      </div>
    </div>
  );
}

