import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { PiChartLineUpFill, PiGaugeFill, PiUsersThreeFill } from "react-icons/pi";

import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "tauruskennelgo@gmail.com";

export default function AdminCriacoes() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const normalizedEmail = useMemo(() => user?.email?.trim().toLowerCase() ?? null, [user]);
  const isAdmin = normalizedEmail === ADMIN_EMAIL;

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

  const creationFeed = [
    { client: "ana@orbital.co", tipo: "Imagem", projeto: "Campanha Neon", plano: "Pro", gasto: "R$ 62", status: "Concluído", horario: "Hoje · 12:04" },
    { client: "dev@firma.com", tipo: "Site IA", projeto: "Landing SaaS", plano: "Enterprise", gasto: "R$ 118", status: "Concluído", horario: "Hoje · 11:40" },
    { client: "studio@cine.ai", tipo: "Vídeo", projeto: "Teaser Moda 3D", plano: "Pro", gasto: "R$ 204", status: "Fila", horario: "Hoje · 11:02" },
    { client: "marca@luxo.com", tipo: "Imagem", projeto: "Lookbook Aurora", plano: "Pro", gasto: "R$ 78", status: "Concluído", horario: "Ontem · 20:16" },
    { client: "pix@agency.com", tipo: "Avatar", projeto: "Persona Glow", plano: "Free", gasto: "R$ 18", status: "Erro", horario: "Ontem · 18:33" },
  ];

  const summary = [
    { label: "Criações (24h)", value: "1.284" },
    { label: "Clientes ativos", value: "8.420" },
    { label: "Falhas/erros", value: "12" },
    { label: "Gasto médio", value: "R$ 74" },
  ];

  const byTipo = [
    { label: "Imagem", value: 46 },
    { label: "Vídeo", value: 22 },
    { label: "Site IA", value: 18 },
    { label: "Avatar/Persona", value: 14 },
  ];

  return (
    <>
      <Head>
        <title>Admin · Criações</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="relative min-h-screen bg-black px-6 pb-16 pt-20 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.28),transparent_60%)] blur-[120px]" />
          <div className="absolute right-[-18%] top-[28%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.28),transparent_60%)] blur-[120px]" />
          <div className="absolute left-[32%] bottom-[-12%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.24),transparent_60%)] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl space-y-8">
          <div className="flex items-center gap-3 text-white/80">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/20 text-white">
              <PiChartLineUpFill className="text-xl" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Admin · Criações</p>
              <h1 className="text-3xl font-semibold">Visão de clientes</h1>
            </div>
            <Link
              href="/admin"
              className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/20"
            >
              ← Voltar ao painel
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {summary.map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.32em] text-white/50">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <div className="flex items-center justify-between text-white/80">
                  <div className="flex items-center gap-2">
                    <PiUsersThreeFill className="text-lg" />
                    <p className="text-sm font-semibold">Últimas criações de clientes</p>
                  </div>
                </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <table className="min-w-full text-sm text-white/80">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-white/60">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Projeto</th>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Gasto</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creationFeed.map((item, idx) => (
                      <tr key={`${item.client}-${item.projeto}`} className={idx % 2 === 0 ? "bg-white/5" : ""}>
                        <td className="px-4 py-3">{item.client}</td>
                        <td className="px-4 py-3 text-white/70">{item.tipo}</td>
                        <td className="px-4 py-3 text-white">{item.projeto}</td>
                        <td className="px-4 py-3 text-white/70">{item.plano}</td>
                        <td className="px-4 py-3 text-white/70">{item.gasto}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === "Concluído"
                                ? "bg-emerald-500/20 text-emerald-200"
                                : item.status === "Fila"
                                  ? "bg-amber-500/20 text-amber-200"
                                  : "bg-rose-500/20 text-rose-200"
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
                Conecte ao backend para listar criações reais dos clientes.
              </p>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/80">
                <PiGaugeFill className="text-lg" />
                <p className="text-sm font-semibold">Mix por tipo</p>
              </div>
              <div className="space-y-3">
                {byTipo.map((item) => (
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
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
                <p className="font-semibold text-white">Como usar</p>
                <p className="mt-2">
                  Tabela exibe criações de clientes (não do admin). Substitua pelo feed real de jobs no Firestore/API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
