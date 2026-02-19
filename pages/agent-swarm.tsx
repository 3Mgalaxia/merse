import Link from "next/link";
import { PiArrowLeftBold, PiCirclesThreePlusFill, PiRocketLaunchFill } from "react-icons/pi";

const agents = [
  { name: "Scout", role: "Pesquisa tendências e referências de mercado." },
  { name: "Director", role: "Converte estratégia em roteiro visual executável." },
  { name: "Builder", role: "Gera assets e monta variações prontas para teste." },
  { name: "Publisher", role: "Prepara formatos e sequência para distribuição." },
];

export default function AgentSwarmPage() {
  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Agent Swarm Studio</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Função inovadora para orquestrar múltiplos agentes especializados em uma única campanha,
          mantendo contexto e continuidade entre etapas.
        </p>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {agents.map((agent) => (
            <article
              key={agent.name}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/70 p-5"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">{agent.name}</p>
              <p className="mt-3 text-sm text-white/75">{agent.role}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/60 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Status</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100">
              <PiCirclesThreePlusFill />
              Pipeline em protótipo
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-300/35 bg-purple-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-purple-100">
              <PiRocketLaunchFill />
              Preparado para integração no loop
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

