import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { FaApple, FaGoogle } from "react-icons/fa";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const FRIENDLY_ERRORS: Record<string, string> = {
  "auth/configuration-not-found":
    "Configure o provedor selecionado no painel Firebase antes de tentar novamente.",
  "auth/popup-closed-by-user": "A janela de autenticação foi fechada antes de concluir o processo.",
  "auth/cancelled-popup-request": "Há outra janela de autenticação em andamento. Tente novamente.",
};

function mapFirebaseError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    const friendly = FRIENDLY_ERRORS[error.code];
    if (friendly) return friendly;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function Login() {
  const router = useRouter();
  const { user, login, signup, signInWithGoogle, signInWithApple, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    const redirectTo =
      typeof router.query.redirect === "string" && router.query.redirect.length > 0
        ? router.query.redirect
        : "/gerar";
    router.replace(redirectTo);
  }, [user, loading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || isSubmitting) return;
    if (!email.trim() || !password.trim()) {
      setError("Informe email e senha para continuar.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (authError) {
      setError(mapFirebaseError(authError, "Não foi possível completar a solicitação. Tente novamente."));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      {/* Caixa de login em estilo vidro */}
      <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8 shadow-lg w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/85">
            {mode === "login" ? "Bem-vindo de volta" : "Cadastre-se"}
          </p>
          <h2 className="text-2xl font-bold text-center text-white">
            {mode === "login" ? "Entrar na Merse" : "Criar conta na Merse"}
          </h2>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em]">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-1 transition ${
                mode === "login"
                  ? "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white shadow-[0_0_16px_rgba(168,85,247,0.55)]"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full px-4 py-1 transition ${
                mode === "signup"
                  ? "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white shadow-[0_0_16px_rgba(168,85,247,0.55)]"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              Cadastrar
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
            onClick={async () => {
              setError(null);
              setIsSubmitting(true);
              try {
                await signInWithGoogle();
              } catch (authError) {
                setError(
                  mapFirebaseError(authError, "Não foi possível autenticar com a conta Google agora."),
                );
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            <FaGoogle className="text-lg" /> {mode === "login" ? "Entrar" : "Cadastrar"} com Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
            onClick={async () => {
              setError(null);
              setIsSubmitting(true);
              try {
                await signInWithApple();
              } catch (authError) {
                setError(
                  mapFirebaseError(authError, "Não foi possível autenticar com a conta Apple agora."),
                );
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            <FaApple className="text-lg" /> {mode === "login" ? "Entrar" : "Cadastrar"} com Apple
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
          <span className="h-px flex-1 bg-white/20" />
          <span>Ou use seu email</span>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@merse.gg"
              required
              className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm mb-2">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita sua senha"
                required
                minLength={6}
                className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {error && (
            <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-gradient-to-r from-purple-500 via-pink-500 to-purple-700 px-4 py-2 text-center text-sm font-semibold text-white shadow-md transition-transform disabled:cursor-not-allowed disabled:opacity-60 hover:scale-105 hover:shadow-purple-500/50"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? "Processando..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <p className="text-center text-sm text-white/70">
          Esqueceu sua senha?{" "}
          <Link href="/reportar-bug" className="text-purple-200 underline underline-offset-4">
            Recuperar acesso
          </Link>
        </p>
      </div>
    </div>
  );
}
