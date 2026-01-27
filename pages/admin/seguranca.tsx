import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { PiDatabaseFill, PiShieldCheckFill } from "react-icons/pi";

import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "tauruskennelgo@gmail.com";

export default function AdminSeguranca() {
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
        <title>Admin · Dados e segurança</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="relative min-h-screen bg-black px-6 pb-16 pt-20 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.3),transparent_60%)] blur-[120px]" />
          <div className="absolute right-[-18%] top-[28%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.3),transparent_60%)] blur-[120px]" />
          <div className="absolute left-[32%] bottom-[-12%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.22),transparent_60%)] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl space-y-8">
          <div className="flex items-center gap-3 text-white/80">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-white">
              <PiShieldCheckFill className="text-xl" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-100/80">Admin · Segurança</p>
              <h1 className="text-3xl font-semibold">Dados e controles</h1>
            </div>
            <Link
              href="/admin"
              className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/20"
            >
              ← Voltar ao painel
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/80">
                <PiDatabaseFill className="text-lg" />
                <p className="text-sm font-semibold">Checklist sugerido</p>
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="font-semibold text-white">Regras de acesso</p>
                  <p className="text-xs text-white/60">Garanta que somente {ADMIN_EMAIL} tenha role admin no backend.</p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="font-semibold text-white">Logs e alertas</p>
                  <p className="text-xs text-white/60">Ative auditoria de login, falhas e billing na sua stack.</p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="font-semibold text-white">Backups</p>
                  <p className="text-xs text-white/60">Agende export de Firestore/DB e criptografe snapshots.</p>
                </li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                Conecte aqui os controles reais da sua infraestrutura.
              </p>
            </div>

            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/80">
                <PiShieldCheckFill className="text-lg" />
                <p className="text-sm font-semibold">Sessão</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                <div className="flex items-center justify-between text-white">
                  <span>Conta autenticada</span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {normalizedEmail}
                  </span>
                </div>
                <p className="mt-3 text-xs text-white/60">
                  Mantenha a sessão apenas em dispositivos confiáveis. Deslogue após uso.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                <p className="font-semibold text-white">Próximos passos</p>
                <ul className="mt-2 space-y-2 text-xs">
                  <li>• Integrar com storage seguro de segredos (ex.: Vault).</li>
                  <li>• Configurar alertas de falha de pagamento e SLA.</li>
                  <li>• Forçar 2FA na conta admin e rotacionar chaves.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
