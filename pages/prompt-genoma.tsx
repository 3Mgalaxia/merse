import { useMemo, useState } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiCheckCircleFill, PiCopySimpleFill, PiSparkleFill } from "react-icons/pi";

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function PromptGenomaPage() {
  const [basePrompt, setBasePrompt] = useState(
    "Campanha premium de produto com luz cinematográfica e composição editorial.",
  );
  const [realism, setRealism] = useState(78);
  const [motion, setMotion] = useState(62);
  const [drama, setDrama] = useState(58);
  const [mutationRound, setMutationRound] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const variants = useMemo(() => {
    const realismTags = ["textura fotográfica", "microdetalhes físicos", "materiais realistas", "lente full-frame"];
    const motionTags = ["câmera orbital", "travelling suave", "parallax controlado", "movimento de reveal"];
    const dramaTags = ["contraste alto", "sombra dramática", "ritmo intenso", "climax visual"];
    const angles = ["close-up hero", "plano médio estratégico", "ângulo diagonal", "take frontal premium"];

    return Array.from({ length: 4 }).map((_, index) => {
      const seed = mutationRound + index;
      const realTag = realismTags[(seed + Math.floor(realism / 12)) % realismTags.length];
      const motionTag = motionTags[(seed + Math.floor(motion / 14)) % motionTags.length];
      const dramaTag = dramaTags[(seed + Math.floor(drama / 15)) % dramaTags.length];
      const angle = angles[(seed + Math.floor((realism + motion + drama) / 25)) % angles.length];

      return `${basePrompt} Estilo: ${realTag}. Movimento: ${motionTag}. Tom: ${dramaTag}. Enquadramento: ${angle}.`;
    });
  }, [basePrompt, realism, motion, drama, mutationRound]);

  async function handleCopyPrompt(index: number, prompt: string) {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(prompt);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1200);
  }

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Prompt Genoma</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Mutador inteligente de prompt: você ajusta os genes criativos e recebe variações inéditas prontas para gerar.
        </p>

        <section className="rounded-3xl border border-white/10 bg-black/60 p-6">
          <label className="text-xs uppercase tracking-[0.3em] text-white/65">Prompt base</label>
          <textarea
            rows={4}
            value={basePrompt}
            onChange={(event) => setBasePrompt(event.target.value)}
            className="mt-3 w-full resize-none rounded-2xl border border-white/20 bg-black/55 p-4 text-sm text-white outline-none"
          />
        </section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/75 p-6 md:grid-cols-3">
          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Realismo
            <input
              type="range"
              min={0}
              max={100}
              value={realism}
              onChange={(event) => setRealism(clamp(Number(event.target.value)))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500"
            />
            <p className="text-sm tracking-normal text-white/80">{realism}%</p>
          </label>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Movimento
            <input
              type="range"
              min={0}
              max={100}
              value={motion}
              onChange={(event) => setMotion(clamp(Number(event.target.value)))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
            />
            <p className="text-sm tracking-normal text-white/80">{motion}%</p>
          </label>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Drama
            <input
              type="range"
              min={0}
              max={100}
              value={drama}
              onChange={(event) => setDrama(clamp(Number(event.target.value)))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500"
            />
            <p className="text-sm tracking-normal text-white/80">{drama}%</p>
          </label>
        </section>

        <button
          type="button"
          onClick={() => setMutationRound((prev) => prev + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-fuchsia-100 transition hover:border-fuchsia-200/60 hover:bg-fuchsia-500/20"
        >
          <PiSparkleFill />
          mutar novamente
        </button>

        <section className="grid gap-4 md:grid-cols-2">
          {variants.map((variant, index) => (
            <article
              key={`${variant}-${index}`}
              className="rounded-3xl border border-white/10 bg-black/65 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-200/75">Variante {index + 1}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/80">{variant}</p>
              <button
                type="button"
                onClick={() => handleCopyPrompt(index, variant)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-white/75"
              >
                {copiedIndex === index ? <PiCheckCircleFill /> : <PiCopySimpleFill />}
                {copiedIndex === index ? "copiado" : "copiar prompt"}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

