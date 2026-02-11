import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useEnergy, planCatalog } from "@/contexts/EnergyContext";

type TierInfo = {
  id: string;
  badge?: string;
  title: string;
  subtitle: string;
  highlight: string;
  priceLabel: string;
  priceValue: number | null;
  features: string[];
  accent: string;
  planKey?: keyof typeof planCatalog;
  isContactOnly?: boolean;
  ctaLabel?: string;
};

const tiers: TierInfo[] = [
  {
    id: "navigator",
    badge: "Guia",
    title: "Plano Ideal",
    subtitle: "Decida em 20 segundos",
    highlight: "Responda 3 perguntas e eu recomendo 1 dos 4 planos",
    priceLabel: "Recomendação automática",
    priceValue: null,
    features: [
      "Recomenda Free, Pulse, Nebula ou Galáxia",
      "Explica o porquê com base no seu uso",
      "Te leva direto para o checkout certo",
    ],
    accent: "from-fuchsia-500/45 via-purple-500/15 to-cyan-500/0",
    ctaLabel: "Descobrir meu plano",
  },
  {
    id: "free",
    badge: "Explorar",
    title: "Free Orbit",
    subtitle: "Experimente a Merse",
    highlight: "300 créditos Merse / mês",
    priceLabel: "Gratuito",
    priceValue: 0,
    features: [
      "Geração básica com motores comunitários",
      "Download ilimitado em resolução padrão",
      "Acesso ao Prompt Chat compacto",
    ],
    accent: "from-slate-500/40 via-slate-500/15 to-slate-500/0",
    planKey: "free",
  },
  {
    id: "pulse",
    badge: "Novo ciclo",
    title: "Pulse Starter",
    subtitle: "Primeiro salto intergaláctico",
    highlight: "900 créditos Merse / mês",
    priceLabel: "US$ 10/mês",
    priceValue: 10,
    features: [
      "900 créditos mensais — 1 imagem Merse AI (ou Flux) = 10 créditos (≈90 imagens)",
      "Geração com ChatGPT Vision custa 25 créditos por imagem",
      "Galeria compartilhada e downloads ilimitados",
      "Até 3 projetos ativos no Photon Forge",
    ],
    accent: "from-purple-500/50 via-purple-500/10 to-purple-500/0",
    planKey: "pulse",
  },
  {
    id: "nebula",
    badge: "Mais popular",
    title: "Nebula Studio",
    subtitle: "Fluxo contínuo para creators",
    highlight: "5.000 créditos Merse / mês",
    priceLabel: "US$ 35/mês",
    priceValue: 35,
    features: [
      "5.000 créditos mensais — 1 imagem Merse AI = 10 créditos (≈500 imagens)",
      "ChatGPT Vision consome 25 créditos por geração (≈200 por ciclo)",
      "Automação de variações e estilos",
      "Biblioteca privada com controle de equipe",
      "Acesso antecipado aos motores Merse",
      "Suporte em 12h com consultoria de prompts",
    ],
    accent: "from-indigo-500/50 via-indigo-500/10 to-indigo-500/0",
    planKey: "nebula",
  },
  {
    id: "galaxy",
    badge: "Sob medida",
    title: "Galáxia Prime",
    subtitle: "Escala ilimitada para squads",
    highlight: "Créditos sob demanda",
    priceLabel: "Fale com a Merse",
    priceValue: null,
    features: [
      "Modelos proprietários Merse treinados na sua base",
      "SLA 24/7 com squad dedicado",
      "Governança e assinatura eletrônica integrada",
      "Blueprints exclusivos e co-criação de features",
    ],
    accent: "from-cyan-500/50 via-cyan-500/10 to-cyan-500/0",
    isContactOnly: true,
  },
];

type PaymentMethod = "credit" | "pix" | "debit";

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "credit", label: "Cartão de crédito" },
  { id: "pix", label: "Pix instantâneo" },
  { id: "debit", label: "Cartão de débito" },
];

const PIX_PLAN_PRICES_BRL: Partial<Record<keyof typeof planCatalog, number>> = {
  pulse: 54.89,
  nebula: 192.98,
};

export default function Planos() {
  const { setPlan, plan } = useEnergy();
  const [selectedTier, setSelectedTier] = useState<TierInfo | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("credit");
  const [finderOpen, setFinderOpen] = useState(false);
  const [finderStep, setFinderStep] = useState(0);
  const [finderGoal, setFinderGoal] = useState<"test" | "creator" | "pro" | "team" | null>(null);
  const [finderVolume, setFinderVolume] = useState<"low" | "mid" | "high" | "ultra" | null>(null);
  const [finderSupport, setFinderSupport] = useState<"none" | "guided" | null>(null);
  const [finderResult, setFinderResult] = useState<TierInfo | null>(null);
  const [highlightTierId, setHighlightTierId] = useState<string | null>(null);
  const [pixCheckout, setPixCheckout] = useState<{
    qrCode: string;
    qrCodeBase64?: string;
    copyPasteCode?: string;
    expiresAt?: string | null;
  } | null>(null);
  const [pixCopyStatus, setPixCopyStatus] = useState<"idle" | "copied">("idle");
  const checkoutSectionRef = useRef<HTMLDivElement | null>(null);
  const tierRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedTierInfo = useMemo(() => {
    if (!selectedTier) return null;
    return tiers.find((tier) => tier.id === selectedTier.id) ?? null;
  }, [selectedTier]);

  const handleSelectTier = (tier: TierInfo) => {
    if (tier.id === "navigator") {
      setFinderOpen(true);
      setFinderStep(0);
      setFinderGoal(null);
      setFinderVolume(null);
      setFinderSupport(null);
      setFinderResult(null);
      return;
    }

    setSelectedTier(tier);
    if (tier.isContactOnly) {
      setSelectedTier(null);
      window.location.href =
        "mailto:hello@merse.gg?subject=Gal%C3%A1xia%20Prime%20-%20Quero%20um%20plano%20sob%20medida";
      return;
    }
    if (!tier.planKey) return;
    setShowCheckout(true);
    setCheckoutError(null);
    setSelectedPaymentMethod("credit");
    setPixCheckout(null);
    setPixCopyStatus("idle");
  };

  const recommendTier = (
    goal: "test" | "creator" | "pro" | "team" | null,
    volume: "low" | "mid" | "high" | "ultra" | null,
    support: "none" | "guided" | null,
  ) => {
    if (!goal || !volume || !support) return null;
    if (goal === "team") return tiers.find((t) => t.id === "galaxy") ?? null;

    const volumeScore = volume === "low" ? 0 : volume === "mid" ? 1 : volume === "high" ? 2 : 3;
    const supportScore = support === "guided" ? 1 : 0;
    const goalScore = goal === "test" ? 0 : goal === "creator" ? 1 : 2;
    const score = volumeScore + supportScore + goalScore;

    if (score <= 1) return tiers.find((t) => t.id === "free") ?? null;
    if (score <= 3) return tiers.find((t) => t.id === "pulse") ?? null;
    return tiers.find((t) => t.id === "nebula") ?? null;
  };

  useEffect(() => {
    if (!finderOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFinderOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finderOpen]);

  useEffect(() => {
    if (!showCheckout) return;
    const timer = window.setTimeout(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showCheckout]);

  const handleCheckoutSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTierInfo) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      plan: selectedTierInfo.planKey,
      price: selectedTierInfo.priceValue,
      customer: {
        name: formData.get("buyerName"),
        email: formData.get("email"),
        document: formData.get("document"),
        zip: formData.get("zip"),
        city: formData.get("city"),
        state: formData.get("state"),
      },
    };

    // Planos gratuitos não disparam checkout.
    if (!selectedTierInfo.priceValue || !selectedTierInfo.planKey) {
      if (selectedTierInfo.planKey) {
        setPlan(selectedTierInfo.planKey);
      }
      setShowCheckout(false);
      setSelectedTier(null);
      setPixCheckout(null);
      setPixCopyStatus("idle");
      setSelectedPaymentMethod("credit");
      return;
    }

    if (selectedPaymentMethod === "pix") {
      try {
        setIsProcessing(true);
        setCheckoutError(null);
        setPixCheckout(null);
        const pixAmount =
          (selectedTierInfo.planKey && PIX_PLAN_PRICES_BRL[selectedTierInfo.planKey]) ??
          selectedTierInfo.priceValue;
        const response = await fetch("/api/payments/create-pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: pixAmount,
            description: selectedTierInfo.title,
            customer: {
              name: payload.customer.name,
              email: payload.customer.email,
            },
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
      } catch (error) {
        setCheckoutError(error instanceof Error ? error.message : "Falha ao gerar Pix.");
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
          plan: selectedTierInfo.planKey,
          title: selectedTierInfo.title,
          price: selectedTierInfo.priceValue,
          customer: payload.customer,
          paymentMethod: selectedPaymentMethod,
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
      } else {
        setCheckoutError("Preferência criada, mas não foi possível abrir o checkout.");
      }
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/70 to-black" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pb-24 pt-40">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Planos Merse</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Escolha sua órbita ideal</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Atualize sua nave para desbloquear limites de energia maiores, automações avançadas e
              suporte de primeira linha. Os planos podem ser alterados a qualquer momento.
            </p>
            <p className="mt-2 text-xs text-white/60">
              Todos os planos são mensais: ao confirmar o pagamento, o crédito fica ativo por 30 dias. Caso
              o pagamento não seja identificado no próximo ciclo, retornamos automaticamente para o plano Free.
            </p>
          </div>
          <Link
            href="/gerar"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40 hover:bg-white/20"
          >
            Voltar
          </Link>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => {
            const isCurrent = tier.planKey ? plan === tier.planKey : false;
            const limitLabel = tier.planKey
              ? `${planCatalog[tier.planKey].limit.toLocaleString("en-US")} créditos`
              : tier.id === "navigator"
              ? "Free • Pulse • Nebula • Galáxia"
              : tier.highlight;
            return (
              <div
                key={tier.id}
                ref={(el) => {
                  if (el) tierRefs.current.set(tier.id, el);
                  else tierRefs.current.delete(tier.id);
                }}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white/5 p-6 text-sm text-white/80 backdrop-blur-xl transition hover:bg-white/10 ${
                  tier.id === "navigator" ? "md:col-span-2 lg:col-span-4" : ""
                } ${
                  highlightTierId === tier.id
                    ? "border-purple-300/60 shadow-[0_0_0_1px_rgba(216,180,254,0.35)]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${tier.accent} opacity-40 transition group-hover:opacity-60`}
                />
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {tier.badge && (
                      <span className="self-start rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-purple-100">
                        {tier.badge}
                      </span>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-purple-100/80">
                        {tier.subtitle}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{tier.title}</h3>
                      <p className="mt-2 text-lg font-medium text-white/90">{tier.priceLabel}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/60">
                        {limitLabel}
                      </p>
                      <p className="mt-2 text-sm text-white/70">{tier.highlight}</p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm text-white/75">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/60" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`mt-auto rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                      isCurrent
                        ? "border-white/50 bg-white/20 text-white/90 cursor-default"
                        : "border-white/30 bg-white/10 text-white hover:border-white/50 hover:bg-white/20"
                    }`}
                    onClick={() => handleSelectTier(tier)}
                    disabled={isCurrent}
                  >
                    {tier.isContactOnly
                      ? "Falar com a Merse"
                      : isCurrent
                      ? "Plano atual"
                      : tier.ctaLabel ?? "Assinar agora"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {finderOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-label="Fechar"
              onClick={() => setFinderOpen(false)}
            />
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-black/80 text-white shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/25 via-fuchsia-500/10 to-cyan-500/0" />
              <div className="relative z-10 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">
                      Plano Ideal
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">Qual plano combina com você?</h2>
                    <p className="mt-2 text-sm text-white/70">
                      Responda 3 perguntas rápidas e eu te levo para o plano certo.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/10"
                    onClick={() => setFinderOpen(false)}
                  >
                    Fechar
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                    <span>Pergunta {Math.min(finderStep + 1, 3)} / 3</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      ~20s
                    </span>
                  </div>

                  {finderStep === 0 ? (
                    <div className="grid gap-3">
                      <p className="text-sm font-semibold">Seu objetivo principal</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          {
                            id: "test" as const,
                            title: "Só testar",
                            desc: "Quero explorar a Merse sem compromisso.",
                          },
                          {
                            id: "creator" as const,
                            title: "Criar com frequência",
                            desc: "Posts, variações e experimentos semanais.",
                          },
                          {
                            id: "pro" as const,
                            title: "Profissional",
                            desc: "Conteúdo recorrente e entrega para clientes.",
                          },
                          {
                            id: "team" as const,
                            title: "Equipe / empresa",
                            desc: "Fluxo com governança e escala sob medida.",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setFinderGoal(opt.id);
                              setFinderStep(1);
                            }}
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                              finderGoal === opt.id
                                ? "border-purple-300/60 bg-purple-500/15"
                                : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                            }`}
                          >
                            <p className="text-sm font-semibold">{opt.title}</p>
                            <p className="mt-1 text-xs text-white/60">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {finderStep === 1 ? (
                    <div className="grid gap-3">
                      <p className="text-sm font-semibold">Volume por mês (estimativa)</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { id: "low" as const, title: "Até 50 imagens", desc: "Exploração e testes." },
                          { id: "mid" as const, title: "50–200 imagens", desc: "Criação regular." },
                          { id: "high" as const, title: "200–600 imagens", desc: "Produção intensa." },
                          { id: "ultra" as const, title: "600+ imagens", desc: "Alta escala." },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setFinderVolume(opt.id);
                              setFinderStep(2);
                            }}
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                              finderVolume === opt.id
                                ? "border-purple-300/60 bg-purple-500/15"
                                : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                            }`}
                          >
                            <p className="text-sm font-semibold">{opt.title}</p>
                            <p className="mt-1 text-xs text-white/60">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {finderStep === 2 ? (
                    <div className="grid gap-3">
                      <p className="text-sm font-semibold">Nível de suporte</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          {
                            id: "none" as const,
                            title: "Autônomo",
                            desc: "Só quero créditos e acesso aos recursos.",
                          },
                          {
                            id: "guided" as const,
                            title: "Guiado",
                            desc: "Quero consultoria de prompts e automação.",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setFinderSupport(opt.id);
                              const result = recommendTier(finderGoal, finderVolume, opt.id);
                              setFinderResult(result);
                              setFinderStep(3);
                            }}
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                              finderSupport === opt.id
                                ? "border-purple-300/60 bg-purple-500/15"
                                : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                            }`}
                          >
                            <p className="text-sm font-semibold">{opt.title}</p>
                            <p className="mt-1 text-xs text-white/60">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {finderStep >= 3 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">
                        Recomendação
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {finderResult?.title ?? "Não consegui decidir"}
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        {finderResult?.id === "free"
                          ? "Ideal para explorar a Merse com baixo volume e sem compromisso."
                          : finderResult?.id === "pulse"
                          ? "Ótimo para criação regular com um salto de créditos e projetos ativos."
                          : finderResult?.id === "nebula"
                          ? "Recomendado para produção intensa e para quem quer automação + suporte rápido."
                          : finderResult?.id === "galaxy"
                          ? "Para squads e empresas que precisam de escala, governança e modelos sob medida."
                          : "Tente responder novamente para eu recomendar melhor."}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="rounded-full border border-purple-300/30 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white"
                          onClick={() => {
                            if (!finderResult) {
                              setFinderStep(0);
                              setFinderGoal(null);
                              setFinderVolume(null);
                              setFinderSupport(null);
                              return;
                            }
                            setFinderOpen(false);
                            setHighlightTierId(finderResult.id);
                            const el = tierRefs.current.get(finderResult.id);
                            el?.scrollIntoView({ behavior: "smooth", block: "start" });
                            window.setTimeout(() => setHighlightTierId(null), 2400);
                            if (finderResult.planKey && finderResult.priceValue === 0) {
                              setPlan(finderResult.planKey);
                              return;
                            }
                            handleSelectTier(finderResult);
                          }}
                        >
                          {finderResult?.isContactOnly
                            ? "Falar com a Merse"
                            : finderResult?.priceValue === 0
                            ? "Ativar grátis"
                            : "Assinar agora"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/80 transition hover:bg-white/10"
                          onClick={() => {
                            setFinderStep(0);
                            setFinderGoal(null);
                            setFinderVolume(null);
                            setFinderSupport(null);
                            setFinderResult(null);
                          }}
                        >
                          Refazer
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      className="text-xs uppercase tracking-[0.28em] text-white/60 transition hover:text-white disabled:opacity-40"
                      onClick={() => {
                        if (finderStep <= 0) return;
                        if (finderStep === 3) {
                          setFinderStep(2);
                          return;
                        }
                        setFinderStep((s) => Math.max(0, s - 1));
                      }}
                      disabled={finderStep === 0}
                    >
                      Voltar
                    </button>
                    <p className="text-xs text-white/50">
                      Dica: você pode mudar de plano a qualquer momento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
            Perguntas frequentes
          </h2>
          <div className="mt-4 grid gap-4 text-white/70">
            <div>
              <p className="text-sm font-semibold text-white">Posso migrar entre planos a qualquer momento?</p>
              <p className="mt-1 text-sm">
                Sim. A cobrança é ajustada proporcionalmente e você mantém o histórico de energia
                intacto durante a transição.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Há desconto para equipes?</p>
              <p className="mt-1 text-sm">
                Planos Pro e Enterprise oferecem assentos adicionais com compartilhamento de limites
                e dashboards unificados de monitoramento.
              </p>
            </div>
          </div>
        </section>

        {showCheckout && selectedTierInfo && (
          <section
            ref={checkoutSectionRef}
            className="rounded-3xl border border-purple-300/40 bg-black/60 p-8 text-sm text-white/80 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.3)]"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-purple-200/90">
                  Ativar plano
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {selectedTierInfo.title}
                </h2>
                <p className="mt-2 text-xs text-white/60">
                  {selectedTierInfo.priceValue && selectedTierInfo.planKey
                    ? `Investimento: ${selectedTierInfo.priceLabel} | Limite: ${planCatalog[
                        selectedTierInfo.planKey
                      ].limit.toLocaleString("en-US")} créditos`
                    : "Plano gratuito - confirme seus dados para ativar."}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCheckout(false);
                  setSelectedTier(null);
                  setCheckoutError(null);
                  setPixCheckout(null);
                  setPixCopyStatus("idle");
                  setSelectedPaymentMethod("credit");
                }}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white transition hover:border-white/40 hover:bg-white/20"
              >
                Cancelar
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isActive = selectedPaymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod(method.id);
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
                <span className="text-xs uppercase tracking-[0.25em] text-white">
                  Nome completo
                </span>
                <input
                  type="text"
                  name="buyerName"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                  placeholder="Ex.: Alex T. Merse"
                  required
                />
              </label>
              {selectedPaymentMethod !== "pix" && (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.25em] text-white">
                      Número do cartão
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={19}
                      name="cardNumber"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                      placeholder="0000 0000 0000 0000"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.25em] text-white">Validade</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      name="cardExpiry"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                      placeholder="MM/AA"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.25em] text-white">CVV</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      name="cardCvv"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                      placeholder="***"
                      required
                    />
                  </label>
                </>
              )}

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white">CPF / CNPJ</span>
                <input
                  type="text"
                  name="document"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                  placeholder="000.000.000-00"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white">CEP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  name="zip"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                  placeholder="00000-000"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white">Cidade</span>
                <input
                  type="text"
                  name="city"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                  placeholder="São Paulo"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white">Estado</span>
                <input
                  type="text"
                  name="state"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                  placeholder="SP"
                  required
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white">E-mail de contato</span>
                <input
                  type="email"
                  name="email"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-300/60"
                  placeholder="voce@merse.gg"
                  required
                />
              </label>
              {selectedPaymentMethod === "pix" && (
                <p className="md:col-span-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                  Ao confirmar, geramos o QR Code Pix em reais (Pulse R$ 54,89 • Nebula R$ 192,98).
                  Escaneie com seu banco e aguarde a confirmação automática da Merse (plano válido por 30 dias).
                </p>
              )}
              <div className="md:col-span-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input type="checkbox" required className="h-4 w-4 rounded border border-white/40 bg-black/40" />
                  Aceito os termos de contratação e a política de privacidade Merse.
                </label>
                <button
                  type="submit"
                  className="rounded-full border border-purple-300/30 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] transition hover:shadow-[0_0_28px_rgba(168,85,247,0.7)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processando..." : "Confirmar pagamento"}
                </button>
              </div>
              {checkoutError && (
                <p className="md:col-span-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                  {checkoutError}
                </p>
              )}
            </form>

            {pixCheckout && (
              <div className="mt-6 grid gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6 text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">Pix ativo</p>
                    <p className="text-sm text-white">Escaneie o QR Code para concluir o pagamento.</p>
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
                        : "Expira em alguns minutos."}
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
      </main>
    </div>
  );
}
