import Link from "next/link";
import { PiArrowLeftBold, PiImageSquareFill, PiSparkleFill } from "react-icons/pi";

const slots = [
  "Paleta principal",
  "Tipografia",
  "Tom visual",
  "Exemplos aprovados",
];

export default function MemoriaMarcaPage() {
  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Memória de Marca Neural</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Centro para registrar DNA visual da marca e manter consistência automática nas próximas
          gerações de imagem, vídeo e site.
        </p>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {slots.map((slot) => (
            <article
              key={slot}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/70 p-5"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">{slot}</p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/75"
              >
                <PiImageSquareFill /> Adicionar
              </button>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/60 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Próxima fase</p>
          <p className="mt-3 text-sm text-white/75">
            Conectar esta memória diretamente com `Gerar Foto`, `Gerar Vídeo` e `Blueprints de Sites`.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-100">
            <PiSparkleFill />
            Consistência automática
          </span>
        </section>
      </div>
    </div>
  );
}

