"use client";

import Link from "next/link";
import { useState, FormEvent, useEffect } from "react";
import { HiMail, HiLockClosed } from "react-icons/hi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      return;
    }

    // Simulação de autenticação
    const response = await fetch('/api/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      setIsAuthenticated(true);
    }
  };

  useEffect(() => {
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Is Authenticated:", isAuthenticated);
  }, [email, password, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02000d] via-[#060322] to-[#041235] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-6 py-12 md:px-12 md:py-16">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition hover:text-fuchsia-200">
            Início
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-fuchsia-200">Login</span>
        </nav>

        <header className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/80">
            Entrar na 3Mpods
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Acesse sua conta
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-300">
            Entre com seus dados para desbloquear as categorias exclusivas,
            visualizar promoções e acompanhar lançamentos em tempo real.
          </p>
        </header>

        <section className="grid gap-8 rounded-3xl bg-white/5 p-8 backdrop-blur md:grid-cols-[1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                E-mail
              </label>
              <div className="flex items-center border border-white/10 bg-white/10 rounded-xl">
                <HiMail className="text-slate-400 mx-3" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-xl bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-fuchsia-300 focus:outline-none"
                  placeholder="nome@email.com"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-200">
                Senha
              </label>
              <div className="flex items-center border border-white/10 bg-white/10 rounded-xl">
                <HiLockClosed className="text-slate-400 mx-3" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-xl bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-fuchsia-300 focus:outline-none"
                  placeholder="Insira sua senha"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(236,72,153,0.75)] transition hover:shadow-[0_20px_50px_-25px_rgba(56,189,248,0.7)]"
            >
              Entrar
            </button>
            <p className="text-xs text-slate-400">
              Ao continuar você concorda com os termos e políticas da 3Mpods.
            </p>
          </form>

          <aside className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Ainda não possui conta?</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              O cadastro é gratuito e libera alertas especiais, suporte
              prioritário e cupons surpresa nas campanhas sazonais.
            </p>
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
            >
              Criar minha conta
            </Link>
            <div className="rounded-2xl bg-fuchsia-400/10 p-4 text-sm text-fuchsia-200">
              Use qualquer e-mail e senha para visualizar o fluxo de exemplo.
            </div>
          </aside>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
          {isAuthenticated ? (
            <>
              <span className="text-sm uppercase tracking-[0.3em] text-fuchsia-300/80">
                Login confirmado
              </span>
              <h2 className="text-2xl font-semibold text-white">
                Tudo pronto para navegar pelas categorias
              </h2>
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-300">
                Clique abaixo para seguir para a página de categorias e explorar
                todas as coleções disponíveis na 3Mpods.
              </p>
              <Link
                href="/categorias?auth=true"
                className="mx-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(236,72,153,0.75)] transition hover:shadow-[0_20px_50px_-25px_rgba(56,189,248,0.7)]"
              >
                Ir para categorias →
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm uppercase tracking-[0.3em] text-fuchsia-300/50">
                Acesso restrito
              </span>
              <h2 className="text-2xl font-semibold text-white">
                Faça login para liberar as categorias
              </h2>
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-300">
                Assim que você entrar, direcionaremos para a página com todas as
                coleções disponíveis. Use o formulário acima para continuar.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}