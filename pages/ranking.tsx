import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PiBookmarkSimpleFill, PiFireFill, PiMedalFill, PiStarFill } from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";

type LeaderboardPlayer = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  likes: number;
  prompt: string;
  category: string;
  saves: number;
};

type SortOption = "likes" | "saves";

const DATA_SOURCE = "/leaderboard.json";

const CATEGORY_PRICING: Record<
  string,
  { planId: string; priceValue: number; priceLabel: string; description: string }
> = {
  imagem: {
    planId: "leaderboard-image",
    priceValue: 1,
    priceLabel: "US$ 1",
    description: "Download da combinação de prompt em resolução máxima.",
  },
  "objeto 3d": {
    planId: "leaderboard-object",
    priceValue: 2,
    priceLabel: "US$ 2",
    description: "Inclui variações e mapas para uso em renders 3D comerciais.",
  },
  vídeo: {
    planId: "leaderboard-video",
    priceValue: 3,
    priceLabel: "US$ 3",
    description: "Pacote com keyframes e ajustes recomendados para motion.",
  },
  video: {
    planId: "leaderboard-video",
    priceValue: 3,
    priceLabel: "US$ 3",
    description: "Pacote com keyframes e ajustes recomendados para motion.",
  },
};

type PaymentMethod = "credit" | "pix" | "debit";

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "credit", label: "Cartão de crédito" },
  { id: "pix", label: "Pix instantâneo" },
  { id: "debit", label: "Cartão de débito" },
];

function normalizeCategory(category: string) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatNumber(num: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(num);
}

export default function Ranking() {
  const { plan } = useEnergy();
  const canPublish = plan === "nebula";

  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [sort, setSort] = useState<SortOption>("likes");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEntry, setSelectedEntry] = useState<LeaderboardPlayer | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit");
  const [pixCheckout, setPixCheckout] = useState<{
    qrCode: string;
    qrCodeBase64?: string;
    copyPasteCode?: string;
    expiresAt?: string | null;
  } | null>(null);
  const [pixCopyStatus, setPixCopyStatus] = useState<"idle" | "copied">("idle");
  const checkoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(DATA_SOURCE)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar o ranking.");
        }
        const data = (await response.json()) as { players?: LeaderboardPlayer[] };
        setPlayers(data.players ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro inesperado ao carregar o ranking.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sortedPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => (sort === "likes" ? b.likes - a.likes : b.saves - a.saves))
      .slice(0, 10);
  }, [players, sort]);

  const topThree = sortedPlayers.slice(0, 3);
  const remainder = sortedPlayers.slice(3);

  useEffect(() => {
    if (!showCheckout) return;
    const timer = window.setTimeout(() => {
      checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showCheckout]);

  const handleOpenCheckout = (player: LeaderboardPlayer) => {
    const pricing = CATEGORY_PRICING[normalizeCategory(player.category)] ?? null;
    if (!pricing) {
      setCheckoutError("Categoria ainda não disponível para licenciamento.");
      return;
    }
    setSelectedEntry(player);
    setShowCheckout(true);
    setCheckoutError(null);
    setCheckoutSuccess(false);
    setPaymentMethod("credit");
    setPixCheckout(null);
    setPixCopyStatus("idle");
  };

  const handleCheckoutSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEntry) return;

    const pricing = CATEGORY_PRICING[normalizeCategory(selectedEntry.category)];
    if (!pricing) return;

    const formData = new FormData(event.currentTarget);
    const customer = {
      name: (formData.get("buyerName") as string | null) ?? "",
      email: (formData.get("buyerEmail") as string | null) ?? "",
    };

    if (paymentMethod === "pix") {
      try {
        setIsProcessing(true);
        setCheckoutError(null);
        setPixCheckout(null);
        const response = await fetch("/api/payments/create-pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: pricing.priceValue,
            description: `Prompt • ${selectedEntry.name}`,
            customer,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível gerar o QR Code Pix.");
        }
        setPixCheckout({
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          copyPasteCode: data.copyPasteCode,
          expiresAt: data.expiresAt ?? null,
        });
        setCheckoutSuccess(true);
      } catch (err) {
        setCheckoutError(
          err instanceof Error ? err.message : "Erro inesperado ao gerar Pix.",
        );
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      setIsProcessing(true);
      setCheckoutError(null);
      const response = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: pricing.planId,
          title: `Prompt • ${selectedEntry.name}`,
          price: pricing.priceValue,
          customer,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Não foi possível iniciar o pagamento.");
      }

      const data = await response.json();
      const initPoint = (data.init_point ?? data.initPoint) as string | undefined;
      if (initPoint) {
        window.location.href = initPoint;
        setCheckoutSuccess(true);
      } else {
        setCheckoutError("Preferência criada, mas o link do checkout não foi retornado.");
      }
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Erro inesperado ao iniciar o checkout.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setSelectedEntry(null);
    setCheckoutError(null);
    setCheckoutSuccess(false);
    setPixCheckout(null);
    setPixCopyStatus("idle");
    setPaymentMethod("credit");
  };

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[480px] bg-[radial-gradient(circle_at_65%_25%,rgba(236,72,153,0.32),transparent_60%),radial-gradient(circle_at_25%_30%,rgba(37,99,235,0.25),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">
              Constelação Merse
            </p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              Ranking Nebula Studio — top 10 criadores
            </h1>
            <p className="max-w-2xl text-sm text-white/70">
              Somente pilotos do plano <strong>Nebula Studio</strong> aparecem aqui. As posições são
              calculadas via curtidas e saves reais; cada prompt pode ser salvo mediante licenciamento
              rápido via checkout Merse.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">
            <button
              type="button"
              onClick={() => setSort("likes")}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.35em] transition ${
                sort === "likes"
                  ? "border-purple-400/60 bg-purple-500/20 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              <PiFireFill />
              Curtidas
            </button>
            <button
              type="button"
              onClick={() => setSort("saves")}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.35em] transition ${
                sort === "saves"
                  ? "border-purple-400/60 bg-purple-500/20 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              <PiBookmarkSimpleFill />
              Saves
            </button>
          </div>
        </header>

        {!canPublish && (
          <section className="rounded-3xl border border-purple-300/30 bg-black/60 p-6 text-sm text-white/75 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.25)]">
            <h2 className="text-base font-semibold text-white">Visualização liberada</h2>
            <p className="mt-2 text-sm text-white/70">
              Qualquer piloto pode explorar o ranking. Para publicar novas artes, vídeos ou objetos e
              disputar o top 10, faça upgrade para o plano{" "}
              <strong className="text-white">Nebula Studio</strong>.
            </p>
            <Link
              href="/planos"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/40 hover:bg-white/20"
            >
              Conhecer Nebula Studio
            </Link>
          </section>
        )}

        {error ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]"
              >
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-500/10 via-white/10 to-blue-500/10" />
                <div className="relative flex h-48 flex-col justify-end">
                  <div className="h-16 w-16 rounded-full bg-white/10" />
                  <div className="mt-4 h-3 w-32 rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-3">
              {topThree.map((player, index) => {
                const pricing = CATEGORY_PRICING[normalizeCategory(player.category)];
                return (
                  <article
                    key={player.id}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.45)]"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%)] opacity-80 transition duration-300 group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-5 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl ${
                              index === 0
                                ? "border-yellow-400/60 bg-yellow-500/20 text-yellow-200"
                                : index === 1
                                ? "border-gray-300/60 bg-gray-400/20 text-gray-100"
                                : "border-orange-400/60 bg-orange-500/20 text-orange-200"
                            }`}
                          >
                            <PiMedalFill />
                          </span>
                          <div>
                            <h2 className="text-lg font-semibold">{player.name}</h2>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                              {player.handle}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60">
                          {player.category}
                        </span>
                      </div>

                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="h-48 w-full rounded-2xl object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                      />

                      <p className="text-sm text-white/75">
                        <strong>Prompt:</strong> {player.prompt}
                      </p>

                      <div className="flex items-center justify-between text-sm text-white/80">
                        <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
                          <span className="flex items-center gap-1">
                            <PiStarFill />
                            {formatNumber(player.likes)} curtidas
                          </span>
                          <span className="flex items-center gap-1 text-white/50">
                            <PiBookmarkSimpleFill />
                            {formatNumber(player.saves)} saves
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenCheckout(player)}
                          className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/80 transition hover:border-purple-300/40 hover:bg-purple-500/20 hover:text-white"
                        >
                          Salvar prompt
                        </button>
                      </div>
                      {pricing && (
                        <p className="text-xs text-white/60">
                          Licenciamento rápido: <strong>{pricing.priceLabel}</strong>
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              {remainder.map((player) => {
                const pricing = CATEGORY_PRICING[normalizeCategory(player.category)];
                return (
                  <article
                    key={player.id}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/70 shadow-[0_22px_70px_rgba(0,0,0,0.35)]"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_60%)] opacity-70 transition duration-300 group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-semibold text-white">{player.name}</h2>
                          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                            {player.handle}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/60">
                          {player.category}
                        </span>
                      </div>
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="h-36 w-full rounded-2xl object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                      />
                      <p className="text-xs text-white/70">{player.prompt}</p>
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/55">
                        <span className="flex items-center gap-2">
                          <PiStarFill className="text-yellow-300" />
                          {formatNumber(player.likes)} curtidas
                        </span>
                        <span className="flex items-center gap-2">
                          <PiBookmarkSimpleFill className="text-purple-300" />
                          {formatNumber(player.saves)} saves
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenCheckout(player)}
                        className="self-end rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20 hover:text-white"
                      >
                        Salvar prompt
                      </button>
                      {pricing && (
                        <p className="text-[11px] text-white/55">
                          Licenciamento rápido: <strong>{pricing.priceLabel}</strong>
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_60%)] opacity-80" />
            <div className="relative space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Como subir no ranking
              </p>
              <ul className="space-y-2">
                <li>• Publique com regularidade usando prompts detalhados e consistentes.</li>
                <li>• Compartilhe o link público das suas criações para captar curtidas.</li>
                <li>• Engaje a comunidade, responda comentários e colabore em coleções.</li>
              </ul>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_60%)] opacity-80" />
            <div className="relative space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Benefícios para o top 10
              </p>
              <ul className="space-y-2">
                <li>• Energia cósmica bônus automática toda segunda-feira.</li>
                <li>• Destaque no Alien Menu e recomendações do Prompt Chat.</li>
                <li>• Convites para betas fechados e parcerias com marcas Merse.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {showCheckout && selectedEntry && (
        <section
          ref={checkoutRef}
          className="mx-auto mt-12 w-full max-w-4xl rounded-3xl border border-purple-300/40 bg-black/60 p-8 text-sm text-white/80 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.3)]"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/90">
                Licenciar prompt destaque
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{selectedEntry.name}</h2>
              <p className="mt-2 text-xs text-white/60">
                Categoria: {selectedEntry.category} •{" "}
                {
                  CATEGORY_PRICING[normalizeCategory(selectedEntry.category)]?.priceLabel ??
                  "US$ 1"
                }
              </p>
              <p className="mt-3 text-xs text-white/70">{selectedEntry.prompt}</p>
              <p className="mt-3 text-xs text-white/60">
                {
                  CATEGORY_PRICING[normalizeCategory(selectedEntry.category)]?.description ??
                  "Licença individual válida para uso comercial."
                }
              </p>
            </div>
            <button
              onClick={closeCheckout}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white transition hover:border-white/40 hover:bg-white/20"
            >
              Cancelar
            </button>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => {
              const isActive = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id);
                    setPixCheckout(null);
                    setPixCopyStatus("idle");
                  }}
                  className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] transition ${
                    isActive
                      ? "border-purple-300/60 bg-purple-500/20 text-white"
                      : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {method.label}
                </button>
              );
            })}
          </div>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleCheckoutSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white">Nome</span>
              <input
                type="text"
                name="buyerName"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                placeholder="Ex.: Alex Merse"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white">E-mail</span>
              <input
                type="email"
                name="buyerEmail"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                placeholder="voce@merse.gg"
                required
              />
            </label>
            {paymentMethod === "pix" && (
              <p className="md:col-span-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                Vamos gerar um QR Code Pix exclusivo para este prompt. Após o pagamento, mantenha o
                comprovante — o acesso fica associado ao seu e-mail durante todo o mês.
              </p>
            )}
            <div className="md:col-span-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
              <span>
                Valor total:{" "}
                <span className="text-white/90">
                  {
                    CATEGORY_PRICING[normalizeCategory(selectedEntry.category)]?.priceLabel ??
                    "US$ 1"
                  }
                </span>
              </span>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-white/70">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">Formas de pagamento</p>
              <div className="flex flex-wrap gap-2 text-white">
                {["Cartão", "Pix", "Débito"].map((method) => (
                  <span
                    key={method}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.25em]"
                  >
                    {method}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-white/60">
                Checkout seguro via Mercado Pago com as chaves atualizadas para esta conta Merse.
              </p>
            </div>
            <div className="md:col-span-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
              <span>
                Valor total:{" "}
                <span className="text-white/90">
                  {
                    CATEGORY_PRICING[normalizeCategory(selectedEntry.category)]?.priceLabel ??
                    "US$ 1"
                  }
                </span>
              </span>
              <button
                type="submit"
                className="rounded-full border border-purple-300/30 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] transition hover:shadow-[0_0_28px_rgba(168,85,247,0.7)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? "Processando..." : "Confirmar compra"}
              </button>
            </div>
            {checkoutError && (
              <p className="md:col-span-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                {checkoutError}
              </p>
            )}
            {checkoutSuccess && !checkoutError && (
              <p className="md:col-span-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                Preferência criada! Você será redirecionado ao checkout do Mercado Pago.
              </p>
            )}
          </form>

          {pixCheckout && (
            <div className="mt-6 grid gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6 text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">Pix ativo</p>
                  <p className="text-sm text-white">
                    Escaneie o QR Code para finalizar a licença deste prompt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!pixCheckout.copyPasteCode) return;
                    try {
                      await navigator.clipboard.writeText(pixCheckout.copyPasteCode);
                      setPixCopyStatus("copied");
                      setTimeout(() => setPixCopyStatus("idle"), 2000);
                    } catch {
                      setPixCopyStatus("idle");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  {pixCopyStatus === "copied" ? "Copiado" : "Copiar código"}
                </button>
              </div>
              {pixCheckout.qrCodeBase64 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <img
                    src={`data:image/png;base64,${pixCheckout.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="h-52 w-52 rounded-xl border border-white/15 bg-white p-3"
                  />
                  <p className="text-xs text-white/60">
                    {pixCheckout.expiresAt
                      ? `Expira em ${new Date(pixCheckout.expiresAt).toLocaleString()}`
                      : "Use este QR Code em até 15 minutos."}
                  </p>
                </div>
              ) : (
                <pre className="overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
                  {pixCheckout.copyPasteCode}
                </pre>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
