import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { firebaseAuth } from "@/lib/firebase";

type AuthStatus = "checking" | "redirecting" | "sent-to-login" | "error";

export default function AuthVSCode() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [message, setMessage] = useState<string>("Verificando sua sessão...");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [legacyDeepLink, setLegacyDeepLink] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [authCodeExpiresAt, setAuthCodeExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const openedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const scheme = useMemo(() => {
    if (typeof router.query.scheme === "string" && router.query.scheme.length > 0) {
      return router.query.scheme;
    }
    return "vscode";
  }, [router.query.scheme]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!firebaseAuth) {
      setStatus("error");
      setMessage(
        "Não consegui inicializar o login aqui (Firebase não configurado). Volte para a página anterior e tente novamente.",
      );
      return;
    }

    const unsub = firebaseAuth.onAuthStateChanged(async (user) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (!user) {
        setStatus("sent-to-login");
        setMessage("Você precisa entrar para conectar. Redirecionando para o login...");
        void router.replace("/login?redirect=/auth/vscode");
        return;
      }

      try {
        setStatus("redirecting");
        setMessage("Gerando um código único e abrindo o VS Code...");

        const token = await user.getIdToken(true);
        setLegacyDeepLink(`${scheme}://merse.codex/auth?token=${encodeURIComponent(token)}`);

        const response = await fetch("/api/auth/vscode/create-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true; code: string; expiresAt: string }
          | { ok: false; error: string }
          | null;

        if (!response.ok || !data || !("ok" in data) || !data.ok) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Não consegui criar o código de conexão.",
          );
        }

        setAuthCode(data.code);
        setAuthCodeExpiresAt(data.expiresAt);
        const redirectUrl = `${scheme}://merse.codex/auth?code=${encodeURIComponent(data.code)}`;
        setDeepLink(redirectUrl);

        if (!openedRef.current) {
          openedRef.current = true;
          window.location.assign(redirectUrl);
        }
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? `Não consegui gerar o token: ${error.message}`
            : "Não consegui gerar o token agora. Tente novamente.",
        );
      }
    });

    return () => unsub();
  }, [router.isReady, router, scheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status !== "checking") return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setStatus("error");
      setMessage(
        "Isso está demorando mais do que o normal. Verifique se você está logado e tente recarregar a página.",
      );
    }, 8000);
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [status]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Merse Codex</p>
        <h1 className="mt-3 text-2xl font-semibold">Conectar com o VS Code</h1>
        <p className="mt-4 text-sm text-white/70">{message}</p>

        {deepLink ? (
          <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-sm font-medium">Se não abriu automaticamente:</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 px-4 py-2 text-sm font-semibold"
                href={deepLink}
              >
                Abrir no VS Code
              </a>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                onClick={async () => {
                  try {
                    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(deepLink);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }
                  } catch {
                    // Ignore clipboard failures.
                  }
                }}
              >
                {copied ? "Link copiado!" : "Copiar link"}
              </button>
            </div>
            <p className="mt-3 break-all rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
              {deepLink}
            </p>
            {authCode ? (
              <div className="mt-4 rounded-xl border border-purple-300/20 bg-purple-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Código único</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg font-semibold tracking-[0.25em] text-white">
                    {authCode}
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                    onClick={async () => {
                      try {
                        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                          await navigator.clipboard.writeText(authCode);
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 2000);
                        }
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    {copied ? "Copiado!" : "Copiar código"}
                  </button>
                </div>
                {authCodeExpiresAt ? (
                  <p className="mt-2 text-xs text-white/60">
                    Expira em {new Date(authCodeExpiresAt).toLocaleString()}.
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="mt-3 text-xs text-white/60">
              Dica: alguns navegadores só permitem abrir o <code>vscode://</code> após um clique.
            </p>
            {legacyDeepLink ? (
              <details className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/70">
                <summary className="cursor-pointer select-none text-white/70">
                  Modo compatibilidade (token)
                </summary>
                <p className="mt-2 text-white/60">Use apenas se sua extensão ainda não suporta código.</p>
                <a className="mt-2 inline-block underline underline-offset-4" href={legacyDeepLink}>
                  Abrir no VS Code (token)
                </a>
              </details>
            ) : null}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-6 w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-left text-sm text-rose-100">
            <p className="font-semibold">Não foi possível concluir.</p>
            <p className="mt-1 text-rose-100/80">
              Tente entrar novamente e depois abrir esta página. Se continuar, copie o link acima (quando
              aparecer) e cole no navegador.
            </p>
          </div>
        ) : null}

        <div className="mt-8 text-xs text-white/50">
          <a className="underline underline-offset-4 hover:text-white/70" href="/">
            Voltar para a Merse
          </a>
        </div>
      </div>
    </div>
  );
}
