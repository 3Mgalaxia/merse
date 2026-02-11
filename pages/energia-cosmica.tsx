import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { PiCheckCircleFill, PiSparkleFill, PiWarningFill } from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";

export default function EnergiaCosmica() {
  const energy = useEnergy();
  const router = useRouter();

  const nearLimit = energy.percentUsed >= 80 && energy.percentUsed < 100;
  const limitReached = energy.percentUsed >= 100;
  const usageByPage = energy.usageByPage.slice(0, 6);
  const recentUsage = energy.usageLog.slice(0, 8);

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const usageHistory = useMemo(
    () => [
      {
        label: "Hoje",
        value: `${energy.percentUsed}% consumido`,
        detail: `${energy.usage} créditos utilizados`,
      },
      {
        label: "Limite atual",
        value: `${energy.limit} créditos`,
        detail: energy.planName,
      },
      {
        label: "Disponível",
        value: `${energy.remaining} créditos`,
        detail: "Reset automático às 00h UTC",
      },
    ],
    [energy.percentUsed, energy.usage, energy.limit, energy.planName, energy.remaining],
  );

  useEffect(() => {
    if (!limitReached) return;
    const timer = setTimeout(() => {
      router.push("/planos");
    }, 1500);
    return () => clearTimeout(timer);
  }, [limitReached, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/70 to-black" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[60vw] w-[60vw] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[160px]" />
        <div className="absolute left-[20%] top-[30%] h-[40vw] w-[40vw] -translate-x-1/2 rounded-full bg-purple-500/10 blur-[200px]" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Status Atual</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Energia Cósmica</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Acompanhe o consumo real das suas sessões de IA, entenda onde cada crédito está sendo
              usado e decida quando acelerar com a Merse.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/codex-studio"
              className="rounded-full border border-purple-200/30 bg-purple-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-purple-200/60 hover:bg-purple-500/20"
            >
              Ver Merse Codex
            </Link>
            <Link
              href="/gerar"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40 hover:bg-white/20"
            >
              Voltar
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="grid gap-4 rounded-3xl border border-purple-200/20 bg-white/5 p-8 backdrop-blur">
            <div className="flex flex-wrap items-end gap-6 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-purple-200">Consumo Atual</p>
                <p className="text-5xl font-bold text-white">{energy.percentUsed}%</p>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/70">
                  Plano: {energy.planName}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-2 w-full rounded-full bg-purple-500/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 shadow-[0_0_16px_rgba(168,85,247,0.8)]"
                    style={{ width: `${Math.min(energy.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-white/70">
                  Restam <strong className="text-white">{energy.remaining}</strong> créditos no ciclo
                  atual ({energy.limit} no total).
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Usados</p>
                <p className="mt-2 text-xl font-semibold text-white">{energy.usage}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Disponível</p>
                <p className="mt-2 text-xl font-semibold text-white">{energy.remaining}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Reset</p>
                <p className="mt-2 text-xl font-semibold text-white">00h UTC</p>
              </div>
            </div>

            {nearLimit && (
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                <PiWarningFill className="text-xl" />
                <div>
                  <p className="font-semibold uppercase tracking-[0.25em]">
                    Quase sem energia ({energy.percentUsed}%)
                  </p>
                  <p className="text-xs text-amber-100/80">
                    Restam {energy.remaining} créditos. Considere contratar um plano maior para
                    seguir criando sem pausas.
                  </p>
                </div>
                <Link
                  href="/planos"
                  className="ml-auto rounded-full border border-amber-200/40 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-50 transition hover:border-amber-200/60 hover:bg-amber-400/20"
                >
                  Ver planos
                </Link>
              </div>
            )}

            {limitReached && (
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
                <PiWarningFill className="text-xl" />
                <div>
                  <p className="font-semibold uppercase tracking-[0.25em]">
                    Limite atingido (100%)
                  </p>
                  <p className="text-xs text-rose-100/80">
                    Redirecionando você para planos e upgrades para liberar mais energia cósmica.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 backdrop-blur">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-white/70">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lg text-purple-200">
                <PiSparkleFill />
              </span>
              Merse Codex
            </div>
            <p className="text-sm text-white/70">
              Acompanhe e edite seus blueprints com o Merse Codex, mantendo o consumo de energia
              sob controle.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/codex-studio"
                className="rounded-full border border-purple-300/40 bg-purple-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-purple-300/60 hover:bg-purple-500/20"
              >
                Abrir Codex Studio
              </Link>
              <Link
                href="https://marketplace.visualstudio.com/items?itemName=Merse.merse-codex"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
              >
                Extensão VS Code
              </Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/60">
              Acesso rápido às ferramentas que consomem energia com rastreio ativo.
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
            Histórico rápido
          </h2>
          <ul className="grid gap-3 text-sm">
            {usageHistory.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <span className="text-white/70">{item.label}</span>
                <span className="text-white">{item.value}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                Onde a energia está sendo gasta
              </h2>
              <span className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                últimos {energy.usageLog.length ? "7 dias" : "dados"}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {usageByPage.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
                  Sem registros de gasto ainda. Gere algo para começar o rastreio.
                </div>
              )}
              {usageByPage.map((entry) => (
                <div
                  key={entry.path || entry.label}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">{entry.label}</p>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                      {entry.count} uso(s) · {formatTime(entry.lastUsedAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-200/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-100">
                    {entry.total} créditos
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                Atividades recentes
              </h2>
              <span className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                últimas ações
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {recentUsage.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
                  Nenhuma ação registrada ainda.
                </div>
              )}
              {recentUsage.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">{entry.label}</p>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                      {formatTime(entry.createdAt)} · {entry.amount} créditos
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
                    <PiCheckCircleFill className="text-emerald-200" />
                    Registrado
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
            Como otimizar seu uso
          </h2>
          <ul className="list-disc space-y-2 pl-4">
            <li>Organize lotes de geração próximos para aproveitar cache cósmico.</li>
            <li>
              Use o modo rascunho para validar ideias antes de renderizar em alta qualidade.
            </li>
            <li>Compartilhe limites com sua equipe via planos Pro e Enterprise.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
