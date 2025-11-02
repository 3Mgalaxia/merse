import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PiImagesFill,
  PiPlayCircleFill,
  PiCubeTransparentFill,
  PiStarFourFill,
  PiTimerFill,
  PiSparkleFill,
  PiTrashFill,
} from "react-icons/pi";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreationRecord,
  CreationRecordType,
  getUserStorageKey,
  loadUserCreations,
  removeUserCreation,
  subscribeToUserCreations,
} from "@/lib/creations";

type FilterOption = "all" | CreationRecordType;

const TYPE_INFO: Record<CreationRecordType, { label: string; icon: JSX.Element }> = {
  image: { label: "Imagem", icon: <PiImagesFill /> },
  video: { label: "Vídeo", icon: <PiPlayCircleFill /> },
  object: { label: "Objeto 3D", icon: <PiCubeTransparentFill /> },
};

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
}

export default function Criados() {
  const { user, loading } = useAuth();
  const userKey = useMemo(
    () => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined),
    [user?.email, user?.uid],
  );

  const [creations, setCreations] = useState<CreationRecord[]>([]);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;

    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const syncLocalFallback = async () => {
      const records = await loadUserCreations(userKey, { userId: user?.uid });
      if (isMounted) {
        setCreations(records);
      }
    };

    unsubscribe = subscribeToUserCreations(
      user?.uid,
      userKey,
      (records) => {
        if (isMounted) {
          setCreations(records);
        }
      },
      () => {
        void syncLocalFallback();
      },
    );

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [loading, user?.uid, userKey]);

  const filteredCreations = useMemo(() => {
    return creations.filter((creation) => {
      const matchesType = filter === "all" || creation.type === filter;
      const matchesSearch =
        search.trim().length === 0 ||
        creation.prompt.toLowerCase().includes(search.toLowerCase()) ||
        creation.id.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [creations, filter, search]);

  const removeCreationById = async (creation: CreationRecord) => {
    setCreations((prev) => prev.filter((item) => item.id !== creation.id));
    await removeUserCreation(userKey, creation.id, {
      userId: user?.uid,
      storagePath: creation.storagePath ?? undefined,
    });
  };

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-20 -z-10 h-[460px] bg-[radial-gradient(circle_at_30%_35%,rgba(236,72,153,0.28),transparent_60%),radial-gradient(circle_at_65%_25%,rgba(14,165,233,0.25),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Memória Cósmica</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">Criações do seu universo</h1>
            <p className="max-w-2xl text-sm text-white/70">
              Cada imagem, vídeo ou objeto 3D produzido fica registrado aqui com o prompt original, metadados e horários. Filtre e resgate seus assets a qualquer momento.
            </p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
            <PiStarFourFill className="text-2xl text-purple-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Dica Merse</p>
              <p>Use o prompt salvo como base para variações rápidas ou para enviar ao suporte.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.1)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] opacity-90" />
            <div className="relative space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Pesquisar
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Prompt, ID..."
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Tipo de criação</p>
                <div className="grid gap-3">
                  {(["all", "image", "video", "object"] as FilterOption[]).map((option) => {
                    const isActive = filter === option;
                  const label = option === "all" ? "Tudo" : TYPE_INFO[option].label;
                  const icon = option === "all" ? <PiSparkleFill /> : TYPE_INFO[option].icon;
                  return (
                    <button
                      key={option}
                      type="button"
                        onClick={() => setFilter(option)}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                          isActive
                            ? "border-purple-300/60 bg-purple-500/10 text-white shadow-[0_0_18px_rgba(168,85,247,0.3)]"
                            : "border-white/10 bg-black/30 text-white/65 hover:border-purple-300/40 hover:text-white"
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs uppercase tracking-[0.3em] text-white/60">
                <div className="flex items-center justify-between">
                  <span>Total salvos</span>
                  <span>{creations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Filtrados</span>
                  <span>{filteredCreations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Última criação</span>
                  <span>
                    {creations[0] ? formatDate(creations[0].createdAt) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex flex-col gap-6">
            {filteredCreations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-12 text-center text-sm text-white/60">
                <PiSparkleFill className="text-3xl text-purple-300" />
                <p>
                  Nenhuma criação encontrada com os filtros atuais. Gere algo novo em{" "}
                  <Link className="underline underline-offset-4" href="/gerar">
                    /gerar
                  </Link>{" "}
                  ou ajuste a busca.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredCreations.map((creation) => {
                  const typeMeta = TYPE_INFO[creation.type];
                  const metaEntries = Object.entries(creation.meta ?? {});

                  return (
                    <article
                      key={creation.id}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1 hover:border-purple-300/40"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.16),transparent_60%)] opacity-80 transition duration-300 group-hover:opacity-100" />
                      <div className="relative flex flex-col gap-4">
                        <header className="flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/65">
                            <span className="text-base text-white">{typeMeta.icon}</span>
                            {typeMeta.label}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              void removeCreationById(creation);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-red-400/60 hover:text-red-300"
                            title="Remover criação"
                          >
                            <PiTrashFill />
                          </button>
                        </header>

                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                          {creation.previewUrl ? (
                            creation.type === "video" ? (
                              <video
                                src={creation.previewUrl}
                                className="h-48 w-full rounded-2xl object-cover opacity-90"
                                muted
                                autoPlay
                                loop
                              />
                            ) : (
                              <img
                                src={creation.previewUrl}
                                alt={`Preview ${creation.id}`}
                                className="h-48 w-full rounded-2xl object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                              />
                            )
                          ) : (
                            <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-white/5 text-sm text-white/50">
                              Preview indisponível
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        </div>

                        <div className="flex flex-col gap-2 text-sm text-white/75">
                          <p className="text-xs uppercase tracking-[0.35em] text-white/45">Prompt</p>
                          <p className="text-white/85 leading-relaxed">{creation.prompt}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
                          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 py-1">
                            <PiTimerFill />
                            {formatDate(creation.createdAt)}
                          </span>
                          {metaEntries.map(([key, value]) => (
                            <span
                              key={`${creation.id}-${key}`}
                              className="rounded-full border border-white/10 bg-black/40 px-3 py-1"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>

                        {creation.downloadUrl && (
                          <div className="flex justify-end">
                            <a
                              href={creation.downloadUrl}
                              download={`${creation.type}-${creation.id}.png`}
                              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
