import { useSiteProjectStatus } from "@/hooks/useSiteProjectStatus";

interface Props {
  projectId?: string | null;
}

export function SiteBuildProgress({ projectId }: Props) {
  const status = useSiteProjectStatus(projectId);

  if (!projectId || !status) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/60 to-black/80 border border-white/5 p-6 text-slate-200">
        <p className="text-sm text-slate-400">Nenhum projeto selecionado ainda.</p>
      </div>
    );
  }

  const progress = Math.min(Math.max(status.progress ?? 0, 0), 100);

  const statusLabelMap: Record<string, string> = {
    draft: "Rascunho",
    blueprint_pending: "Gerando blueprint...",
    blueprint_ready: "Blueprint pronto",
    assets_generating: "Gerando imagens e código...",
    assets_ready: "Assets prontos",
    reviewing: "IA revisando o site...",
    review_done: "Revisão concluída",
    completed: "Site finalizado",
    failed: "Falha na geração",
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-black/90 border border-white/10 p-6 flex flex-col gap-4 shadow-[0_0_40px_rgba(0,0,0,0.65)]">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">MERSE · CONSTRUÇÃO INTELIGENTE</p>
          <h2 className="text-lg font-semibold text-slate-50">Progresso da criação do site</h2>
          <p className="text-xs text-slate-400 mt-1">
            Status atual:{" "}
            <span className="text-sky-400 font-medium">{statusLabelMap[status.status] ?? status.status}</span>
          </p>
        </div>
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500/40 to-fuchsia-500/40 blur-xl" />
          <div className="relative flex items-center justify-center w-full h-full rounded-full border border-sky-400/50 bg-black/60">
            <span className="text-sm font-semibold text-sky-100">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full">
        <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-fuchsia-500 to-violet-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">{status.currentStep || "Aguardando próximo passo..."}</p>
      </div>

      {/* Linha do tempo */}
      <div className="mt-2 max-h-40 overflow-y-auto pr-1 space-y-2">
        {status.events.length === 0 && (
          <p className="text-xs text-slate-500">
            Nenhum evento registrado ainda. Aguardando a IA começar a construir o site.
          </p>
        )}

        {status.events.map((event) => {
          const palette =
            event.level === "error"
              ? { bg: "from-rose-500 to-orange-500", dot: "bg-rose-400", label: "Problema" }
              : event.level === "warning"
              ? { bg: "from-amber-400 to-amber-500", dot: "bg-amber-300", label: "Aviso" }
              : event.step === "start" || event.step === "code" || event.step === "images"
              ? { bg: "from-sky-500 to-fuchsia-500", dot: "bg-sky-300", label: "Processando" }
              : { bg: "from-emerald-500 to-sky-500", dot: "bg-emerald-300", label: "Sucesso" };

          return (
            <div key={event.id} className="flex gap-2 items-start">
              <div className="relative mt-0.5 h-6 w-6">
                <span
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${palette.bg} opacity-40 blur-md`}
                  aria-hidden
                />
                <span
                  className={`relative block h-6 w-6 rounded-full border border-white/15 bg-black/70 shadow-[0_0_15px_rgba(59,130,246,0.35)]`}
                >
                  <span className={`absolute inset-1 rounded-full ${palette.dot}`} />
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/70">
                    {palette.label}
                  </span>
                  <p className="text-xs text-slate-300">{event.message}</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(event.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {event.step && <> · {event.step}</>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
