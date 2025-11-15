"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EnergyProvider, useEnergy } from "@/contexts/EnergyContext";
import CodexEditor from "./CodexEditor";
import CodexSidebar from "./CodexSidebar";
import CodexPreview from "./CodexPreview";
import { callCodexEdit, consumeCodexCredits } from "./api";
import "./style.css";

type StatusState = {
  message: string;
  tone: "info" | "success" | "error";
} | null;

const DEFAULT_HTML = `<section class="hero-merse">
  <p class="badge">Codex Studio</p>
  <h1>Comece sua próxima interface cósmica</h1>
  <p>Envie comandos em linguagem natural e deixe o Merse Codex manipular o HTML por você.</p>
</section>`;

const CREDIT_FORMATTER = new Intl.NumberFormat("pt-BR");
const formatCredits = (value: number | null | undefined) =>
  CREDIT_FORMATTER.format(Math.max(0, Math.round(value ?? 0)));

function BackLink() {
  return (
    <Link href="/gerar" className="codex-back-link">
      VOLTAR
    </Link>
  );
}

function CodexStudioContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { remaining, planName } = useEnergy();

  const [html, setHtml] = useState<string>(DEFAULT_HTML);
  const [comando, setComando] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [creditsSnapshot, setCreditsSnapshot] = useState(remaining);

  useEffect(() => {
    setCreditsSnapshot(remaining);
  }, [remaining]);

  const presets = useMemo(
    () => [
      "Transformar hero em layout meia-lua com CTA duplo",
      "Adicionar sessão de depoimentos com cards em carrossel",
      "Aplicar gradiente Merse roxo/azul no fundo e tipografia Space Grotesk",
      "Incluir footer escuro com links e ícones sociais",
    ],
    [],
  );

  const executarComando = async () => {
    const trimmedCommand = comando.trim();
    if (!trimmedCommand) {
      setStatus({ message: "Descreva o ajuste que deseja fazer no código.", tone: "info" });
      return;
    }
    setLoading(true);
    setStatus({ message: "Reservando energia cósmica...", tone: "info" });

    let latestCredits: number | null = null;

    try {
      const consume = await consumeCodexCredits({ html });
      latestCredits = consume.remainingCredits;
      const creditsLabel = formatCredits(latestCredits);
      setStatus({ message: `⚡ ${creditsLabel} créditos restantes`, tone: "info" });

      const data = await callCodexEdit({ html, comando: trimmedCommand });
      const updatedHtml = data.htmlAtualizado ?? data.html ?? html;
      setHtml(updatedHtml);
      setHistory((prev) => [trimmedCommand, ...prev].slice(0, 6));
      const successLabel = creditsLabel;
      setStatus({ message: `Blueprint atualizado • ⚡ ${successLabel} créditos`, tone: "success" });
    } catch (error) {
      const reason = (error as { reason?: string })?.reason;
      if (reason === "NO_PLAN" || reason === "NO_CREDITS") {
        setStatus({
          message: "Créditos insuficientes. Vamos te levar para os planos para recarregar.",
          tone: "error",
        });
        setTimeout(() => router.push("/planos"), 1200);
      } else if (reason === "AUTH_REQUIRED") {
        setStatus({ message: "Entre na sua conta para usar o Merse Codex.", tone: "error" });
      } else {
        const message =
          error instanceof Error ? error.message : "Não foi possível atualizar o código agora.";
        setStatus({ message, tone: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  const insights = [
    "Combine comandos curtos e diretos para ajustes precisos.",
    "Reaproveite o histórico para iterar sem perder contexto.",
    "Copy/paste o HTML final direto no laboratório de sites.",
  ];

  const latestCommand = history[0] ?? "Nenhum comando executado ainda.";
  const cosmicCredits = creditsSnapshot ?? remaining;
  const creditsLabel = formatCredits(cosmicCredits);

  const renderGuardCard = (title: string, description: string, cta?: boolean) => (
    <section className="codex-card codex-guard-card">
      <p className="badge">Codex</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {cta ? (
        <Link href="/login?redirect=/codex-studio" className="codex-button">
          Entrar
        </Link>
      ) : null}
    </section>
  );

  const shouldShowMain = !authLoading && Boolean(user);

  return (
    <div className="codex-shell">
      <div className="codex-glow codex-glow--one" />
      <div className="codex-glow codex-glow--two" />

      <BackLink />

      <div className="codex-main">
        {!shouldShowMain ? (
          authLoading
            ? renderGuardCard("Conectando ao cockpit cósmico...", "Validando acesso ao Merse Codex.")
            : renderGuardCard(
                "Entre para usar o Merse Codex",
                "Seu login ativa a contagem de créditos cósmicos.",
                true,
              )
        ) : (
          <>
            <header className="codex-header">
              <div>
                <p className="codex-header__eyebrow">Merse Builder · Codex Studio</p>
                <h1>Edite HTML usando apenas comandos</h1>
                <p>
                  O Merse Codex interpreta descrições em português e devolve o código já ajustado
                  com a estética intergaláctica da marca.
                </p>
              </div>
              <div className="codex-header__meta">
                <p className="codex-credit-pill" aria-live="polite">
                  <span>⚡ {creditsLabel} créditos</span>
                  <small>{planName}</small>
                </p>
                {status && (
                  <div className={`codex-status codex-status--${status.tone}`}>
                    {status.message}
                  </div>
                )}
              </div>
            </header>

            <div className="codex-grid">
              <CodexSidebar
                comando={comando}
                setComando={setComando}
                loading={loading}
                onExecute={executarComando}
                status={status}
                history={history}
                presets={presets}
              />
              <CodexEditor html={html} setHtml={setHtml} loading={loading} />
              <CodexPreview html={html} viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <section className="codex-footer-grid">
              <div className="codex-card codex-summary-card">
                <header className="codex-card__header">
                  <div>
                    <p className="badge">Resumo</p>
                    <h3>Logs do laboratório</h3>
                  </div>
                </header>

                <ul className="codex-summary-stats">
                  <li>
                    <span>Último comando</span>
                    <p>{latestCommand}</p>
                  </li>
                  <li>
                    <span>Execuções nesta sessão</span>
                    <p>{history.length}</p>
                  </li>
                  <li>
                    <span>Créditos disponíveis</span>
                    <p>⚡ {creditsLabel}</p>
                  </li>
                  <li>
                    <span>Status atual</span>
                    <p>{status?.message ?? "Pronto para editar."}</p>
                  </li>
                </ul>
              </div>

              <div className="codex-card codex-next-card">
                <header className="codex-card__header">
                  <div>
                    <p className="badge">Próximos passos</p>
                    <h3>Dicas para acelerar</h3>
                  </div>
                </header>
                <ul className="codex-insight-list">
                  {insights.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function CodexStudioPage() {
  return (
    <AuthProvider>
      <EnergyProvider>
        <CodexStudioContent />
      </EnergyProvider>
    </AuthProvider>
  );
}
