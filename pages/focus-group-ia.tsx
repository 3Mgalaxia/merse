import { useMemo, useState } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiSparkleFill, PiUsersThreeFill } from "react-icons/pi";

const personas = [
  { id: "hunter", name: "Hunter de Promo", vibe: "Busca oferta direta", weight: 8 },
  { id: "aesthetic", name: "Curador Estético", vibe: "Quer visual impecável", weight: 14 },
  { id: "speed", name: "Decisor Rápido", vibe: "Valoriza clareza e rapidez", weight: 11 },
  { id: "analyst", name: "Analista de Marca", vibe: "Avalia posicionamento", weight: 17 },
];

function hashText(text: string) {
  return text.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
}

export default function FocusGroupIaPage() {
  const [concept, setConcept] = useState(
    "Vídeo curto mostrando transformação do produto em 3 ambientes diferentes com CTA final.",
  );

  const reactions = useMemo(() => {
    const base = hashText(concept.trim() || "merse");
    return personas.map((persona, index) => {
      const score = Math.max(55, Math.min(98, 58 + ((base + persona.weight * (index + 3)) % 41)));
      const sentiment =
        score >= 85
          ? "Aprovação alta para rodar agora."
          : score >= 72
            ? "Bom potencial com pequenos ajustes."
            : "Precisa melhorar gancho e diferenciação.";
      return { ...persona, score, sentiment };
    });
  }, [concept]);

  const globalScore = useMemo(
    () => Math.round(reactions.reduce((acc, item) => acc + item.score, 0) / reactions.length),
    [reactions],
  );

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Focus Group IA</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Função nova para testar campanhas com perfis sintéticos e receber feedback antes de gastar em mídia.
        </p>

        <section className="rounded-3xl border border-white/10 bg-black/60 p-6">
          <label className="text-xs uppercase tracking-[0.3em] text-white/65">Conceito da campanha</label>
          <textarea
            rows={4}
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            className="mt-3 w-full resize-none rounded-2xl border border-white/20 bg-black/55 p-4 text-sm text-white outline-none"
          />
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100">
            <PiUsersThreeFill />
            score geral: {globalScore}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {reactions.map((reaction) => (
            <article
              key={reaction.id}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/75 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">{reaction.name}</p>
                  <p className="mt-2 text-sm text-white/65">{reaction.vibe}</p>
                </div>
                <span className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">
                  {reaction.score}
                </span>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  style={{ width: `${reaction.score}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500"
                />
              </div>

              <p className="mt-3 text-sm text-white/75">{reaction.sentiment}</p>
            </article>
          ))}
        </section>

        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-fuchsia-100">
          <PiSparkleFill />
          pronto para virar nó no loop automation
        </div>
      </div>
    </div>
  );
}

