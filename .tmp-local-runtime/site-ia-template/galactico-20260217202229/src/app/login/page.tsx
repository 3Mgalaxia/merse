import Link from "next/link";
import {
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";

const securityLayers = [
  {
    title: "Deteccao de anomalia em tempo real",
    text: "Regras de risco e bloqueio dinamico para tentativas suspeitas.",
    icon: ShieldCheck,
  },
  {
    title: "Autenticacao multifator por device",
    text: "Confirme acesso por app autenticador, SMS ou passkey biometrica.",
    icon: Fingerprint,
  },
  {
    title: "Sessao controlada por contexto",
    text: "Revogue acessos e force revalidacao com um clique no painel.",
    icon: Lock,
  },
];

export default function LoginPage() {
  return (
    <PageShell
      currentPath="/login"
      eyebrow="Acesso seguro"
      title="Entre na operacao com autenticação forte e controle total."
      description="Seu workspace de IA com camadas de seguranca enterprise, baixa friccao e rastreabilidade completa."
      primaryAction={{ href: "/criacao", label: "Ir para workspace" }}
      secondaryAction={{ href: "/conta", label: "Ver conta" }}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="merse-card merse-hover-rise reveal delay-1 p-6 md:p-8">
          <p className="merse-label">Security mesh</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100 md:text-3xl">
            Identidade blindada para equipes que operam em alto volume.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Cada acesso passa por verificacao contextual antes de liberar seus
            modelos, prompts e ativos de criacao.
          </p>

          <div className="mt-6 space-y-4">
            {securityLayers.map((layer) => (
              <article key={layer.title} className="merse-soft-card merse-hover-rise p-4">
                <div className="flex items-center gap-3">
                  <layer.icon className="size-5 text-cyan-300" />
                  <h3 className="text-base font-semibold text-slate-100">{layer.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{layer.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <article className="merse-kpi">
              <p className="merse-kpi-value">0.6s</p>
              <p className="merse-kpi-label">Tempo medio de autenticacao</p>
            </article>
            <article className="merse-kpi">
              <p className="merse-kpi-value">99.99%</p>
              <p className="merse-kpi-label">Disponibilidade de login</p>
            </article>
          </div>
        </section>

        <section className="merse-card reveal delay-2 p-6 md:p-8">
          <p className="merse-label">Entrar no studio</p>
          <form className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="merse-label">
                E-mail corporativo
              </label>
              <div className="flex items-center gap-3">
                <div className="relative w-full">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    className="merse-input pl-11"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="merse-label">
                Senha
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  className="merse-input pl-11"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
              <label className="inline-flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  className="size-4 rounded border-white/20 bg-slate-900/50"
                />
                Manter conectado
              </label>
              <a href="#" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Esqueci a senha
              </a>
            </div>

            <button type="submit" className="merse-button w-full">
              Entrar com seguranca
            </button>

            <button type="button" className="merse-button-ghost w-full">
              <Fingerprint className="size-4" />
              Entrar com passkey
            </button>

            <button type="button" className="merse-button-ghost w-full">
              <Smartphone className="size-4" />
              Continuar com Google
            </button>
          </form>

          <div className="merse-separator my-5" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="merse-tag">SOC2</span>
            <span className="merse-tag">GDPR</span>
            <span className="merse-tag">ISO 27001</span>
            <Link href="/conta" className="ml-auto text-sm font-semibold text-cyan-300">
              Configurar politicas
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
