import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { PiChartLineUpFill, PiCoinsFill, PiGaugeFill, PiShieldCheckFill } from "react-icons/pi";

import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "tauruskennelgo@gmail.com";
type SummaryMetrics = {
  revenue: number;
  revenueDelta: string;
  users: number;
  usersDelta: string;
  conversions: number;
  conversionsDelta: string;
  ticket: number;
  ticketDelta: string;
};

const DEFAULT_SUMMARY: SummaryMetrics = {
  revenue: 184200,
  revenueDelta: "+12% vs mês anterior",
  users: 8420,
  usersDelta: "+6% sem/sem",
  conversions: 742,
  conversionsDelta: "+4,8% sem/sem",
  ticket: 248,
  ticketDelta: "+3,1% sem/sem",
};

const REVENUE_SERIES = {
  diario: {
    label: "Faturamento diário",
    periodLabel: "Últimos 7 dias",
    data: [
      { label: "Seg", value: 42 },
      { label: "Ter", value: 48 },
      { label: "Qua", value: 56 },
      { label: "Qui", value: 68 },
      { label: "Sex", value: 74 },
      { label: "Sáb", value: 58 },
      { label: "Dom", value: 46 },
    ],
  },
  semanal: {
    label: "Faturamento semanal",
    periodLabel: "Últimas 8 semanas",
    data: [
      { label: "S1", value: 220 },
      { label: "S2", value: 240 },
      { label: "S3", value: 260 },
      { label: "S4", value: 280 },
      { label: "S5", value: 310 },
      { label: "S6", value: 330 },
      { label: "S7", value: 350 },
      { label: "S8", value: 370 },
    ],
  },
  mensal: {
    label: "Faturamento mensal (K)",
    periodLabel: "Últimos 12 meses",
    data: [
      {
        label: "Jan",
        value: 12,
        metrics: {
          revenue: 12000,
          revenueDelta: "-4% vs mês anterior",
          users: 6200,
          usersDelta: "+2% sem/sem",
          conversions: 530,
          conversionsDelta: "-1,5% sem/sem",
          ticket: 225,
          ticketDelta: "+0,8% sem/sem",
        },
      },
      {
        label: "Fev",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Mar",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Abr",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Mai",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Jun",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Jul",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Ago",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Set",
        value: 0,
        metrics: {
          revenue: 0,
          revenueDelta: "0% vs mês anterior",
          users: 0,
          usersDelta: "0% sem/sem",
          conversions: 0,
          conversionsDelta: "0% sem/sem",
          ticket: 0,
          ticketDelta: "0% sem/sem",
        },
      },
      {
        label: "Out",
        value: 52,
        metrics: {
          revenue: 52000,
          revenueDelta: "+5% vs mês anterior",
          users: 9600,
          usersDelta: "+2,4% sem/sem",
          conversions: 720,
          conversionsDelta: "-1,8% sem/sem",
          ticket: 247,
          ticketDelta: "-0,6% sem/sem",
        },
      },
      {
        label: "Nov",
        value: 64,
        metrics: {
          revenue: 64000,
          revenueDelta: "+8% vs mês anterior",
          users: 10100,
          usersDelta: "+3,2% sem/sem",
          conversions: 780,
          conversionsDelta: "+2,2% sem/sem",
          ticket: 252,
          ticketDelta: "+0,8% sem/sem",
        },
      },
      {
        label: "Dez",
        value: 78,
        metrics: {
          revenue: 78000,
          revenueDelta: "+6% vs mês anterior",
          users: 10800,
          usersDelta: "+3,8% sem/sem",
          conversions: 820,
          conversionsDelta: "+2,5% sem/sem",
          ticket: 258,
          ticketDelta: "+1,2% sem/sem",
        },
      },
    ],
  },
} as const;

export default function AdminArea() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const normalizedEmail = useMemo(() => user?.email?.trim().toLowerCase() ?? null, [user]);
  const isAdmin = normalizedEmail === ADMIN_EMAIL;
  const [revenueMode, setRevenueMode] = useState<keyof typeof REVENUE_SERIES>("mensal");
  const activeRevenue = REVENUE_SERIES[revenueMode];
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics>(DEFAULT_SUMMARY);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const summaryStats = [
    {
      label: "Faturamento MTD",
      value: summaryMetrics.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
      delta: summaryMetrics.revenueDelta,
    },
    {
      label: "Usuários ativos",
      value: summaryMetrics.users.toLocaleString("pt-BR"),
      delta: summaryMetrics.usersDelta,
    },
    {
      label: "Conversões (pagas)",
      value: summaryMetrics.conversions.toLocaleString("pt-BR"),
      delta: summaryMetrics.conversionsDelta,
    },
    {
      label: "Ticket médio",
      value: summaryMetrics.ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
      delta: summaryMetrics.ticketDelta,
    },
  ];

  const planBreakdown = [
    { label: "Free", percent: 38, color: "bg-slate-300" },
    { label: "Pro", percent: 34, color: "bg-purple-400" },
    { label: "Enterprise", percent: 28, color: "bg-emerald-400" },
  ];

  const aiUsage = [
    { label: "Imagem (Photon Forge)", value: 46 },
    { label: "Vídeo (Runway Wear)", value: 26 },
    { label: "Site IA (Blueprint)", value: 18 },
    { label: "Avatar/Persona", value: 10 },
  ];

  const paymentSplit = [
    { label: "Cartão crédito", value: 62 },
    { label: "Pix", value: 29 },
    { label: "Apple/Google Pay", value: 9 },
  ];

  const revenueSeries = {
    diario: {
      label: "Faturamento diário",
      periodLabel: "Últimos 7 dias",
      data: [
        { label: "Seg", value: 42 },
        { label: "Ter", value: 48 },
        { label: "Qua", value: 56 },
        { label: "Qui", value: 68 },
        { label: "Sex", value: 74 },
        { label: "Sáb", value: 58 },
        { label: "Dom", value: 46 },
      ],
    },
    semanal: {
      label: "Faturamento semanal",
      periodLabel: "Últimas 8 semanas",
      data: [
        { label: "S1", value: 220 },
        { label: "S2", value: 240 },
        { label: "S3", value: 260 },
        { label: "S4", value: 280 },
        { label: "S5", value: 310 },
        { label: "S6", value: 330 },
        { label: "S7", value: 350 },
        { label: "S8", value: 370 },
      ],
    },
    mensal: {
      label: "Faturamento mensal (K)",
      periodLabel: "Últimos 12 meses",
      data: [
        { label: "Jan", value: 12 },
        { label: "Fev", value: 16 },
        { label: "Mar", value: 18 },
        { label: "Abr", value: 22 },
        { label: "Mai", value: 28 },
        { label: "Jun", value: 32 },
        { label: "Jul", value: 36 },
        { label: "Ago", value: 42 },
        { label: "Set", value: 45 },
        { label: "Out", value: 52 },
        { label: "Nov", value: 64 },
        { label: "Dez", value: 78 },
      ],
    },
  } as const;

  const creationFeed = [
    { user: "ana@orbital.co", type: "Imagem", title: "Campanha Neon", spend: "R$ 62", status: "Ok" },
    { user: "dev@firma.com", type: "Site IA", title: "Landing SaaS", spend: "R$ 118", status: "Ok" },
    { user: "studio@cine.ai", type: "Vídeo", title: "Teaser Moda 3D", spend: "R$ 204", status: "Fila" },
    { user: "marca@luxo.com", type: "Imagem", title: "Lookbook Aurora", spend: "R$ 78", status: "Ok" },
    { user: "lucas@atlas.io", type: "Imagem", title: "Key Visual Orion", spend: "R$ 84", status: "Ok" },
    { user: "vitor@nova.tech", type: "Site IA", title: "Portal Metaverso", spend: "R$ 136", status: "Ok" },
    { user: "paula@stella.com", type: "Vídeo", title: "Teaser Runway", spend: "R$ 212", status: "Fila" },
    { user: "mila@aurora.ag", type: "Imagem", title: "Campanha Prisma", spend: "R$ 58", status: "Ok" },
    { user: "rafa@nebula.ai", type: "Imagem", title: "Editorial Glow", spend: "R$ 92", status: "Ok" },
    { user: "beto@fluxy.io", type: "Site IA", title: "Landing Web3", spend: "R$ 124", status: "Ok" },
    { user: "gi@cinema.st", type: "Vídeo", title: "Trailer Imersivo", spend: "R$ 248", status: "Fila" },
    { user: "livia@prime.co", type: "Imagem", title: "Catálogo Lunar", spend: "R$ 74", status: "Ok" },
    { user: "tom@delta.com", type: "Imagem", title: "Moodboard Solar", spend: "R$ 69", status: "Ok" },
    { user: "nina@skyline.gg", type: "Site IA", title: "Microsite Expo", spend: "R$ 142", status: "Ok" },
    { user: "leo@hyper.art", type: "Vídeo", title: "Spot Neon", spend: "R$ 198", status: "Fila" },
    { user: "camila@zenit.io", type: "Imagem", title: "Heroic Poster", spend: "R$ 66", status: "Ok" },
  ];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    if (!isAdmin) {
      void router.replace("/");
    }
  }, [router, loading, user, isAdmin]);

  if (loading || !user || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span className="h-3 w-3 animate-ping rounded-full bg-purple-400" />
          Validando credenciais cósmicas...
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Merse · Área Segura</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="relative min-h-screen bg-black px-6 pb-16 pt-20 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.3),transparent_60%)] blur-[120px]" />
          <div className="absolute right-[-18%] top-[28%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.32),transparent_60%)] blur-[120px]" />
          <div className="absolute left-[32%] bottom-[-12%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.28),transparent_60%)] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl space-y-8">
          <div className="flex items-center gap-3 text-white/80">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/20 text-white">
              <PiShieldCheckFill className="text-xl" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Admin seguro</p>
              <h1 className="text-3xl font-semibold">Painel do comandante</h1>
            </div>
            <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60">
              Painel privado
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            {summaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                <p className="text-xs uppercase tracking-[0.32em] text-white/50">{stat.label}</p>
                <div className="mt-3 flex items-center gap-2 text-2xl font-semibold text-white">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-emerald-300/80">{stat.delta}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center justify-between text-white/80">
                <div className="flex items-center gap-2">
                  <PiChartLineUpFill className="text-lg" />
                  <p className="text-sm font-semibold">{activeRevenue.label}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 p-1">
                  {(
                    [
                      { id: "diario", label: "Dia" },
                      { id: "semanal", label: "Semana" },
                      { id: "mensal", label: "Mês" },
                    ] as const
                  ).map((option) => {
                    const isActive = revenueMode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                      onClick={() => {
                        setRevenueMode(option.id);
                        setSelectedMonth(null);
                        setSummaryMetrics(DEFAULT_SUMMARY);
                      }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                          isActive ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-x-auto pb-2 -mb-2 cursor-grab active:cursor-grabbing">
                <div className="flex min-w-[780px] items-end gap-3">
                  {activeRevenue.data.map((item) => {
                    const hasBar = item.value > 0;
                    return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (revenueMode === "mensal" && "metrics" in item && item.metrics) {
                          const isSame = selectedMonth === item.label;
                          if (isSame) {
                            setSelectedMonth(null);
                            setSummaryMetrics(DEFAULT_SUMMARY);
                          } else {
                            setSelectedMonth(item.label);
                            setSummaryMetrics(item.metrics);
                          }
                        } else {
                          setSelectedMonth(null);
                          setSummaryMetrics(DEFAULT_SUMMARY);
                        }
                      }}
                      className="flex flex-col items-center gap-2 min-w-[56px] focus:outline-none"
                    >
                      {hasBar ? (
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-purple-500/40 via-indigo-500/50 to-emerald-400/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] hover:shadow-[0_14px_40px_rgba(79,70,229,0.35)]"
                          style={{ height: `${item.value}px` }}
                          aria-label={`Selecionar ${item.label}`}
                        />
                      ) : (
                        <div className="h-8 w-full" aria-hidden />
                      )}
                      <p className="text-xs text-white/60">{item.label}</p>
                    </button>
                  );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/50">
                <span>Arraste para ver todos os pontos</span>
                <span>{activeRevenue.periodLabel}</span>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/80">
                <PiCoinsFill className="text-lg" />
                <p className="text-sm font-semibold">Split de pagamentos</p>
              </div>
              <div className="space-y-3">
                {paymentSplit.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>{item.label}</span>
                      <span className="text-white">{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-purple-400"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Resumo 30 dias</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/80">
                <PiGaugeFill className="text-lg" />
                <p className="text-sm font-semibold">Uso por plano</p>
              </div>
              <div className="space-y-3">
                {planBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`inline-block h-3 w-3 rounded-full ${item.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <span>{item.label}</span>
                        <span className="text-white">{item.percent}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/10">
                        <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Distribuição ativa</p>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/80">
                <PiChartLineUpFill className="text-lg" />
                <p className="text-sm font-semibold">IAs mais usadas</p>
              </div>
              <div className="space-y-3">
                {aiUsage.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>{item.label}</span>
                      <span className="text-white">{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Últimos 7 dias</p>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/80">
                <PiShieldCheckFill className="text-lg" />
                <p className="text-sm font-semibold">Sessão</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-sm text-white/80">
                  <span>Conta autenticada</span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {normalizedEmail}
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  Apenas esta identidade abre o painel. Mantenha sessão ativa só em dispositivos confiáveis.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                <p className="font-semibold text-white">Ações rápidas</p>
                <div className="mt-2 flex flex-col gap-2">
                  <Link
                    href="/admin/criacoes"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-[1px] hover:border-white/20"
                  >
                    Revisar criações recentes →
                  </Link>
                  <Link
                    href="/admin/seguranca"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-[1px] hover:border-white/20"
                  >
                    Ajustar dados e segurança →
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/anomalias")}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white transition hover:-translate-y-[1px] hover:border-white/20"
                  >
                    Ver anomalias e feedbacks →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/80">
              <div className="flex items-center gap-2">
                <PiChartLineUpFill className="text-lg" />
                <p className="text-sm font-semibold">Atividade de criações</p>
              </div>
              <span className="text-xs uppercase tracking-[0.32em] text-white/50">Últimas execuções</span>
            </div>
            <div
              className="max-h-96 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-black/30"
              tabIndex={0}
              aria-label="Lista de criações recentes"
            >
              <table className="min-w-full text-sm text-white/80">
                <thead className="sticky top-0 bg-white/10 text-left text-xs uppercase tracking-[0.3em] text-white/60 backdrop-blur">
                  <tr>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Projeto</th>
                    <th className="px-4 py-3">Gasto</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {creationFeed.map((item, idx) => (
                    <tr key={item.title} className={idx % 2 === 0 ? "bg-white/5" : ""}>
                      <td className="px-4 py-3">{item.user}</td>
                      <td className="px-4 py-3 text-white/70">{item.type}</td>
                      <td className="px-4 py-3 text-white">{item.title}</td>
                      <td className="px-4 py-3 text-white/70">{item.spend}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === "Ok" ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
              Conteúdo ilustrativo — conecte aos dados reais da sua conta.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
