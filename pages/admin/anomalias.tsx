import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { PiBugFill, PiWarningFill } from "react-icons/pi";

import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "tauruskennelgo@gmail.com";

const SEVERITY_STYLES = {
  Crítica: "bg-rose-500/25 text-rose-100",
  Alta: "bg-amber-500/25 text-amber-100",
  Média: "bg-emerald-500/20 text-emerald-100",
  Baixa: "bg-slate-500/20 text-slate-100",
} as const;

const STATUS_STYLES = {
  Resolvido: "bg-emerald-500/20 text-emerald-200",
  "Em triagem": "bg-sky-500/20 text-sky-100",
  Aberto: "bg-amber-500/20 text-amber-200",
} as const;

const REPORTS = [
  {
    cliente: "ana@orbital.co",
    titulo: "Erro ao gerar vídeo",
    detalhe: "Job travou em 92% na fila Runway Wear.",
    severidade: "Alta",
    status: "Aberto",
    horario: "Hoje · 09:42",
  },
  {
    cliente: "dev@firma.com",
    titulo: "Latência no site IA",
    detalhe: "Blueprint demorou 45s para compilar HTML.",
    severidade: "Média",
    status: "Em triagem",
    horario: "Hoje · 08:15",
  },
  {
    cliente: "pix@agency.com",
    titulo: "Prompt não respeitado",
    detalhe: "Tons pastel ignorados no Photon Forge.",
    severidade: "Baixa",
    status: "Resolvido",
    horario: "Ontem · 22:07",
  },
  {
    cliente: "studio@cine.ai",
    titulo: "Billing duplicado",
    detalhe: "Cobrança repetida em batch noturno.",
    severidade: "Crítica",
    status: "Aberto",
    horario: "Ontem · 17:51",
  },
] as const;

export default function AdminAnomalias() {
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

  return (
    <>
      <Head>
        <title>Admin · Anomalias e feedbacks</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main className="relative min-h-screen bg-black px-6 pb-16 pt-20 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.3),transparent_60%)] blur-[120px]" />
          <div className="absolute right-[-18%] top-[32%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3),transparent_60%)] blur-[120px]" />
          <div className="absolute left-[32%] bottom-[-12%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.26),transparent_60%)] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl space-y-8">
          <header className="flex items-center gap-3 text-white/80">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-500/20 text-white">
              <PiBugFill className="text-xl" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-rose-100/80">Admin · Anomalias</p>
              <h1 className="text-3xl font-semibold">Feedbacks e incidentes</h1>
            </div>
            <Link
              href="/admin"
              className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/20"
            >
              ← Voltar ao painel
            </Link>
          </header>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/80">
              <div className="flex items-center gap-2">
                <PiWarningFill className="text-lg" />
                <p className="text-sm font-semibold">Fila de reports</p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <table className="min-w-full text-sm text-white/80">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-white/60">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Detalhe</th>
                    <th className="px-4 py-3">Severidade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Quando</th>
                  </tr>
                </thead>

                <tbody>
                  {REPORTS.map(({ cliente, titulo, detalhe, severidade, status, horario }, idx) => (
                    <tr key={`${cliente}-${titulo}`} className={idx % 2 === 0 ? "bg-white/5" : undefined}>
                      <td className="px-4 py-3">{cliente}</td>
                      <td className="px-4 py-3 text-white">{titulo}</td>
                      <td className="px-4 py-3 text-white/70">{detalhe}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            SEVERITY_STYLES[severidade as keyof typeof SEVERITY_STYLES] ?? SEVERITY_STYLES.Baixa
                          }`}
                        >
                          {severidade}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.Aberto
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">{horario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-white/50">
              Plugar com os envios de /reportar-bug para trazer anomalias reais.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}