import Link from "next/link";

export default function Home() {
  const steps = [
    {
      title: "Início",
      description:
        "Conheça o conceito da 3Mpods, descubra o que nos diferencia e escolha o melhor caminho para o seu próximo pod.",
    },
    {
      title: "Login",
      description:
        "Acesse sua conta para liberar ofertas, acompanhar pedidos e receber recomendações personalizadas.",
    },
    {
      title: "Categorias",
      description:
        "Explore o catálogo completo de pods com filtros por marcas, promoções e lançamentos exclusivos.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02000d] via-[#04011a] to-[#07102b] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-12 md:px-12 md:py-16">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/80">
              Bem-vindo à 3Mpods
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Sua curadoria premium de pods
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-300">
              Selecionamos dispositivos com performance, sabor e estilo para
              cada perfil. Explore linhas exclusivas, ofertas especiais e as
              novidades que acabaram de chegar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
            >
              Fazer login
            </Link>
            <Link
              href="/categorias"
              className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-30px_rgba(56,189,248,0.8)] transition hover:shadow-[0_22px_55px_-28px_rgba(168,85,247,0.85)]"
            >
              Ver categorias
            </Link>
          </div>
        </header>

        <section className="grid gap-8 rounded-3xl bg-white/5 p-8 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Descubra o universo 3Mpods
            </h2>
            <p className="text-base leading-relaxed text-slate-300">
              A 3Mpods conecta você às melhores experiências em pods descartáveis
              e recarregáveis. Entregamos curadoria, conveniência e oferta ampla
              para cada ocasião.
            </p>
            <div className="flex flex-col gap-3 text-sm text-slate-200">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-300">
                  01
                </span>
                Catálogo selecionado com as marcas mais desejadas do mercado.
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-300">
                  02
                </span>
                Conteúdo atualizado com lançamentos e tendências semanais.
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-300">
                  03
                </span>
                Promoções exclusivas para clientes cadastrados.
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6">
            <div className="flex flex-col gap-4">
              <span className="text-sm uppercase tracking-[0.3em] text-fuchsia-200/80">
                Próximo passo
              </span>
              <p className="text-lg font-medium text-white">
                Faça login e ganhe acesso antecipado às campanhas e ao catálogo
                completo.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Acessar minha conta
              </Link>
              <Link
                href="/login"
                className="w-full rounded-2xl border border-white/30 px-5 py-3 text-center text-sm font-medium text-white transition hover:border-white/50 hover:bg-white/10"
              >
                Criar conta agora
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Cadastro gratuito com verificação rápida. Nenhum método de
              pagamento é solicitado nesta etapa.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/70">
              Jornada 3Mpods
            </span>
            <h2 className="text-3xl font-semibold text-white">
              Um fluxo simples para encontrar seu próximo pod
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-slate-300">
              Entenda rapidamente como navegar pelo ecossistema da 3Mpods e
              chegue às coleções mais desejadas em poucos cliques.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/40 hover:bg-white/10"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/20 text-lg font-semibold text-fuchsia-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-xl font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-200">
                  {step.description}
                </p>
                {step.title === "Categorias" ? (
                  <Link
                    href="/categorias"
                    className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-fuchsia-300 transition hover:text-sky-200"
                  >
                    Abrir categorias →
                  </Link>
                ) : (
                  <Link
                    href={step.title === "Login" ? "/login" : "/"}
                    className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-fuchsia-300 transition hover:text-sky-200"
                  >
                    Ir para {step.title.toLowerCase()} →
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} 3Mpods. Todos os direitos reservados.</span>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="transition hover:text-fuchsia-200">
              Termos de uso
            </a>
            <a href="#" className="transition hover:text-fuchsia-200">
              Política de privacidade
            </a>
            <a href="#" className="transition hover:text-fuchsia-200">
              Suporte
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
