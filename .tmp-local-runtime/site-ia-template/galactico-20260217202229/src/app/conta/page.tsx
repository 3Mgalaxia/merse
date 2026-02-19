import {
  Activity,
  Bell,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  UserCircle2,
  Users2,
  WalletCards,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";

const sessions = [
  { device: "MacBook Pro - Chrome", location: "Sao Paulo, BR", status: "Atual" },
  { device: "iPhone 15 - Safari", location: "Sao Paulo, BR", status: "Confiavel" },
  { device: "Windows Desktop - Edge", location: "Lisboa, PT", status: "Revisar" },
];

const invoices = [
  { period: "Jan 2026", amount: "US$ 249", status: "Pago" },
  { period: "Dez 2025", amount: "US$ 249", status: "Pago" },
  { period: "Nov 2025", amount: "US$ 249", status: "Pago" },
];

const usage = [
  { name: "Creditos de render", value: 78 },
  { name: "Geracao de copy", value: 64 },
  { name: "Exports e publicacoes", value: 52 },
];

export default function AccountPage() {
  return (
    <PageShell
      currentPath="/conta"
      eyebrow="Conta e governanca"
      title="Governanca completa para operar IA sem risco."
      description="Monitore uso, faturamento e seguranca com visao executiva e controle tecnico no mesmo painel."
      primaryAction={{ href: "/criacao", label: "Voltar para criacao" }}
      secondaryAction={{ href: "/modelos", label: "Atualizar stack" }}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="merse-card merse-hover-rise reveal delay-1 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserCircle2 className="size-10 text-cyan-300" />
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Astronauta Orion Vega</h2>
                <p className="text-sm text-slate-300">orion.vega@orbital-labs.ai</p>
              </div>
            </div>
            <span className="rounded-full border border-blue-200/30 bg-blue-500/12 px-3 py-1 text-xs font-semibold text-slate-100">
              Plano Enterprise
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="merse-soft-card p-4">
              <div className="flex items-center gap-2">
                <WalletCards className="size-4 text-cyan-300" />
                <p className="merse-label">Creditos usados</p>
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-slate-100">78%</p>
              <div className="mt-3 merse-meter">
                <div className="merse-meter-bar w-[78%]" />
              </div>
            </article>
            <article className="merse-soft-card p-4">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-cyan-300" />
                <p className="merse-label">Notificacoes ativas</p>
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-slate-100">12</p>
              <p className="mt-2 text-sm text-slate-300">Alertas de uso, seguranca e billing.</p>
            </article>
          </div>

          <div className="merse-soft-card mt-4 p-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-cyan-300" />
              <p className="merse-label">Mapa de uso atual</p>
            </div>
            <div className="mt-4 space-y-4">
              {usage.map((item) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>{item.name}</span>
                    <span className="font-mono text-slate-100">{item.value}%</span>
                  </div>
                  <div className="merse-meter">
                    <div className="merse-meter-bar" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <article className="merse-kpi">
              <p className="merse-kpi-value">27</p>
              <p className="merse-kpi-label">Membros no workspace</p>
            </article>
            <article className="merse-kpi">
              <p className="merse-kpi-value">3</p>
              <p className="merse-kpi-label">Ambientes ativos</p>
            </article>
          </div>
        </section>

        <section className="merse-card merse-hover-rise reveal delay-2 p-6 md:p-8">
          <p className="merse-label">Faturamento</p>
          <div className="mt-4 space-y-3">
            {invoices.map((invoice) => (
              <article
                key={invoice.period}
                className="merse-soft-card flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="size-4 text-cyan-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{invoice.period}</p>
                    <p className="text-xs text-slate-300">{invoice.amount}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/15 bg-slate-800/70 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  {invoice.status}
                </span>
              </article>
            ))}
          </div>

          <div className="merse-separator my-5" />
          <article className="merse-soft-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <WalletCards className="size-4 text-cyan-300" />
                <p className="merse-label">Metodo de pagamento</p>
              </div>
              <span className="merse-tag">Padrao</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-100">Visa ending in 4408</p>
            <p className="text-xs text-slate-400">Proxima cobranca em 28 Feb 2026</p>
          </article>

          <article className="merse-soft-card mt-3 p-4">
            <div className="flex items-center gap-2">
              <Users2 className="size-4 text-cyan-300" />
              <p className="merse-label">Permissoes de equipe</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              8 administradores, 14 editores e 5 revisores com politicas
              separadas por workspace.
            </p>
          </article>
        </section>
      </div>

      <section className="merse-card reveal delay-3 mt-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-semibold text-slate-100">Seguranca de acesso</h3>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/30 bg-blue-500/12 px-3 py-1 text-xs font-semibold text-slate-100">
            <ShieldCheck className="size-4 text-cyan-300" />
            MFA obrigatorio
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <article
              key={session.device}
              className="merse-soft-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3">
                <LockKeyhole className="size-4 text-cyan-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{session.device}</p>
                  <p className="text-xs text-slate-300">{session.location}</p>
                </div>
              </div>
              <span className="rounded-full border border-white/15 bg-slate-800/70 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                {session.status}
              </span>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
