import Head from "next/head";
import Link from "next/link";
import { PiCheckCircleFill, PiClockFill, PiWarningCircleFill } from "react-icons/pi";

type EngineStatus = "operacional" | "degradado" | "manutencao";

type StatusItem = {
  id: string;
  name: string;
  description: string;
  status: EngineStatus;
  latencyMs: number;
  uptime: string;
  lastUpdate: string;
};

const STATUS_ITEMS: StatusItem[] = [
  {
    id: "image",
    name: "Imagem Merse",
    description: "Geração de renders e variações com motores Merse/Flux.",
    status: "operacional",
    latencyMs: 920,
    uptime: "99.98%",
    lastUpdate: "há 4 min",
  },
  {
    id: "video",
    name: "Vídeo Merse",
    description: "Veo/Sora/Merse com controle de duração e formato.",
    status: "operacional",
    latencyMs: 1840,
    uptime: "99.72%",
    lastUpdate: "há 7 min",
  },
  {
    id: "gender",
    name: "Identidade · Troca de Gênero",
    description: "Preserva rosto com ajustes de gênero e estilo.",
    status: "degradado",
    latencyMs: 2540,
    uptime: "98.60%",
    lastUpdate: "há 12 min",
  },
  {
    id: "site",
    name: "Site IA",
    description: "HTML completo com identidade Merse e assets.",
    status: "operacional",
    latencyMs: 1260,
    uptime: "99.83%",
    lastUpdate: "há 6 min",
  },
  {
    id: "object",
    name: "Objetos 3D",
    description: "Render 3D com material e iluminação Merse.",
    status: "manutencao",
    latencyMs: 0,
    uptime: "97.40%",
    lastUpdate: "há 2 min",
  },
];

const incidents = [
  {
    id: "inc-1",
    title: "Fila elevada no motor de Identidade",
    description: "Ajustes de capacidade em andamento. Latência acima do normal.",
    status: "Em monitoramento",
    time: "Hoje · 14:32",
  },
  {
    id: "inc-2",
    title: "Manutenção programada em Objetos 3D",
    description: "Atualização de pipeline 3D e novos materiais.",
    status: "Em andamento",
    time: "Hoje · 13:05",
  },
  {
    id: "inc-3",
    title: "Estabilidade restaurada em Vídeo",
    description: "Melhoria no balanceamento reduziu tempo de fila.",
    status: "Resolvido",
    time: "Ontem · 19:48",
  },
];

const statusStyles: Record<EngineStatus, { label: string; classes: string; icon: JSX.Element }> = {
  operacional: {
    label: "Operacional",
    classes: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
    icon: <PiCheckCircleFill className="text-emerald-200" />,
  },
  degradado: {
    label: "Degradado",
    classes: "border-amber-300/40 bg-amber-500/15 text-amber-100",
    icon: <PiWarningCircleFill className="text-amber-200" />,
  },
  manutencao: {
    label: "Manutenção",
    classes: "border-slate-300/40 bg-slate-500/15 text-slate-100",
    icon: <PiClockFill className="text-slate-200" />,
  },
};

export default function StatusPage() {
  const operationalCount = STATUS_ITEMS.filter((item) => item.status === "operacional").length;
  const totalCount = STATUS_ITEMS.length;

  return (
    <>
      <Head>
        <title>Status · Merse</title>
        <meta
          name="description"
          content="Acompanhe uptime, latência e incidentes das engines Merse em tempo real."
        />
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/35 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.16),transparent_58%),radial-gradient(circle_at_80%_30%,rgba(34,197,94,0.14),transparent_60%),radial-gradient(circle_at_30%_78%,rgba(168,85,247,0.16),transparent_60%)]" />
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
        </div>

        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Status Merse</p>
                <h1 className="text-3xl font-semibold md:text-4xl">
                  <span className="bg-gradient-to-r from-cyan-200 via-emerald-200 to-purple-200 bg-clip-text text-transparent">
                    Saúde das engines e serviços
                  </span>
                </h1>
                <p className="max-w-3xl text-sm text-white/70">
                  Acompanhe uptime, latência e incidentes. Atualizações constantes para manter a
                  nave Merse estável.
                </p>
              </div>
              <Link
                href="/dev-hub"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[11px] uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
              >
                Voltar ao Dev Hub
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/60">
              <span className="rounded-full border border-emerald-200/20 bg-white/10 px-4 py-1">
                {operationalCount} de {totalCount} operacionais
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-white/10 px-4 py-1">
                Uptime 30 dias · 99.4%
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-white/10 px-4 py-1">
                Atualizado agora
              </span>
            </div>
          </header>

          <section className="grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Latência média</p>
              <p className="mt-3 text-2xl font-semibold text-white">1.5s</p>
              <p className="mt-2 text-sm text-white/60">Baseada nos últimos 15 minutos.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Fila atual</p>
              <p className="mt-3 text-2xl font-semibold text-white">Baixa</p>
              <p className="mt-2 text-sm text-white/60">A maioria das filas está abaixo de 2 min.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Requisições</p>
              <p className="mt-3 text-2xl font-semibold text-white">+12.4k</p>
              <p className="mt-2 text-sm text-white/60">Última hora · pico de tráfego.</p>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Engines Merse</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-white/60">Atualização contínua</span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {STATUS_ITEMS.map((item) => {
                const statusInfo = statusStyles[item.status];
                return (
                  <article
                    key={item.id}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
                    <div className="relative flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                          <p className="mt-2 text-sm text-white/70">{item.description}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.32em] ${statusInfo.classes}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-white/60">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Latência {item.latencyMs ? `${item.latencyMs}ms` : "--"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Uptime {item.uptime}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Update {item.lastUpdate}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Incidentes recentes</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-white/60">Últimas 24h</span>
            </div>
            <div className="grid gap-4">
              {incidents.map((incident) => (
                <article
                  key={incident.id}
                  className="rounded-3xl border border-white/10 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                      <p className="mt-2 text-sm text-white/70">{incident.description}</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-white/70">
                      {incident.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.32em] text-white/50">{incident.time}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
