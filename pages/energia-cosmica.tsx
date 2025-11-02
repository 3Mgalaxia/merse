import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { PiWarningFill } from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";

export default function EnergiaCosmica() {
  const energy = useEnergy();
  const router = useRouter();

  const nearLimit = energy.percentUsed >= 80 && energy.percentUsed < 100;
  const limitReached = energy.percentUsed >= 100;

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

      <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Status Atual</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Energia Cósmica</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-300">
              Acompanhe o consumo real das suas sessões de IA e planeje upgrades para manter a
              navegação fluida.
            </p>
          </div>
          <Link
            href="/gerar"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40 hover:bg-white/20"
          >
            Voltar
          </Link>
        </header>

        <section className="grid gap-4 rounded-3xl border border-purple-200/20 bg-white/5 p-8 backdrop-blur">
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

            {nearLimit && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
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
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
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
