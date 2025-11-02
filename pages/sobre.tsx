import Link from "next/link";
import { PiRocketLaunchFill, PiSparkleFill, PiUsersThreeFill } from "react-icons/pi";

const timeline = [
  {
    year: "2023",
    title: "Concepção",
    description: "A Merse nasce como laboratório de criação para visionários que buscavam experiências cinematográficas guiadas por IA.",
  },
  {
    year: "2024",
    title: "Lançamento do Ecossistema",
    description: "Photon Forge, Runway Wear e Object Lab conectam designers, devs e storytellers em uma mesma plataforma.",
  },
  {
    year: "2025",
    title: "Expansão Social",
    description: "Prompt Marketplace, contas verificadas e integrações corporativas levam a Merse para marcas globais.",
  },
];

const pillars = [
  {
    title: "Design Futurista",
    copy: "Mantemos uma linguagem visual consistente, com glassmorphism, neon controlado e ritmos inspirados em dashboards espaciais.",
  },
  {
    title: "AI + Comunidade",
    copy: "A IA Merse entrega sugestões inteligentes enquanto a comunidade complementa com feedback, pacotes e colaborações.",
  },
  {
    title: "Criadores Primeiro",
    copy: "Planos flexíveis, monetização transparente e ferramentas sociais para que cada persona fortaleça sua tribo.",
  },
];

const teamHighlights = [
  {
    name: "Luna",
    role: "Direção Criativa",
    focus: "Define paletas, animações e storytelling das interfaces Merse.",
  },
  {
    name: "Zion",
    role: "Lead de Produto",
    focus: "Conecta insights da comunidade com lançamentos de módulos corporativos.",
  },
  {
    name: "Mira",
    role: "Head de Conteúdo",
    focus: "Curadoria de pacotes de prompt, guias e documentação visual.",
  },
];

export default function Sobre() {
  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[480px] bg-[radial-gradient(circle_at_65%_25%,rgba(236,72,153,0.32),transparent_60%),radial-gradient(circle_at_25%_30%,rgba(59,130,246,0.28),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-10 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] opacity-90" />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Sobre a Merse</p>
              <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                Conectamos tecnologia galáctica a experiências criativas premium
              </h1>
              <p className="mt-4 text-sm text-gray-300">
                A Merse é uma plataforma de criação, publicação e social discovery. Permitimos que equipes construam produtos visuais completos, que creators monetizem pacotes de prompt e que marcas lancem experiências futuristas com agilidade.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/planos"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20"
                >
                  <PiRocketLaunchFill />
                  Evoluir plano
                </Link>
                <Link
                  href="/conta"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20"
                >
                  <PiUsersThreeFill />
                  Entrar na rede
                </Link>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-black/30 p-6 text-sm text-gray-300">
              <h2 className="text-lg font-semibold text-white">Nossos números</h2>
              <ul className="mt-4 space-y-2">
                <li>• +160K criações processadas pelo Photon Forge</li>
                <li>• +12K pacotes de prompt vendidos no marketplace</li>
                <li>• +3.500 squads colaborando em projetos híbridos</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300 shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
            >
              <h3 className="text-lg font-semibold text-white">{pillar.title}</h3>
              <p className="mt-3 leading-relaxed">{pillar.copy}</p>
            </div>
          ))}
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.14),transparent_60%)] opacity-80" />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Timeline</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Nossa jornada</h2>
              <p className="mt-4 text-sm text-gray-300">
                Evoluímos com a comunidade. Cada lançamento nasce de conversas com creators e empresas que utilizam Merse diariamente.
              </p>
            </div>
            <div className="space-y-5">
              {timeline.map((item) => (
                <div key={item.year} className="rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-gray-200">
                  <div className="text-xs uppercase tracking-[0.35em] text-white/60">{item.year}</div>
                  <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center md:text-left">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Equipe Merse</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Heads que orquestram essa constelação</h2>
              <p className="mt-4 text-sm text-gray-300">
                Por trás das interfaces, há um time apaixonado por design, tecnologia e comunidade. Conheça alguns dos líderes que conduzem essa nave.
              </p>
            </div>
            <div className="space-y-4">
              {teamHighlights.map((member) => (
                <div key={member.name} className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-gray-200">
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">{member.role}</p>
                  <p className="mt-2 leading-relaxed">{member.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center md:text-left">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-white">Junte-se à tripulação</h3>
              <p className="text-sm text-gray-300">
                Quer colaborar, integrar sua marca ou lançar uma experiência? Nossa equipe responde rápido e prepara um plano sob medida.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xl">
              <Link
                href="/planos"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20"
              >
                <PiSparkleFill />
                Ver planos
              </Link>
              <a
                href="mailto:hello@merse.gg"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20"
              >
                contato@merse.gg
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
