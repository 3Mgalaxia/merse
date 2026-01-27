import Head from "next/head";
import Link from "next/link";

export default function CardPublicidade() {
  return (
    <>
      <Head>
        <title>Outros Portais Merse</title>
        <meta
          name="description"
          content="Romexx e Shopverse também são da nossa constelação. Explore experiências Merse em e-commerce e varejo tech."
        />
      </Head>
      <main className="relative min-h-screen bg-black px-6 pb-20 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Outros Portais Merse</p>
            <h1 className="text-3xl font-semibold md:text-4xl">
              Romexx e Shopverse também são da nossa constelação
            </h1>
            <p className="max-w-3xl text-sm text-white/70">
              A Merse expande sua estética para e-commerce e varejo tech. Conheça nossas outras naves e veja como elas
              entregam experiências imersivas com o mesmo padrão de design futurista.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-white/60">
              Mesma estética · Novos destinos
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <Link
              href="https://romexx.com.br"
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-left shadow-[0_18px_70px_rgba(0,0,0,0.45)] transition hover:-translate-y-[2px] hover:border-purple-200/30"
            >
              <div className="mt-[2px] h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500/60 via-indigo-500/60 to-blue-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)]" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-white">Romexx</p>
                <p className="text-xs text-white/70">E-commerce com estética Merse aplicada a varejo tech.</p>
              </div>
              <span className="text-[12px] text-white/60 transition group-hover:text-white">↗</span>
            </Link>

            <Link
              href="https://shopverse.com.br"
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-left shadow-[0_18px_70px_rgba(0,0,0,0.45)] transition hover:-translate-y-[2px] hover:border-purple-200/30"
            >
              <div className="mt-[2px] h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/60 via-cyan-500/60 to-blue-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)]" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-white">Shopverse</p>
                <p className="text-xs text-white/70">Marketplace futurista com curadoria visual Merse.</p>
              </div>
              <span className="text-[12px] text-white/60 transition group-hover:text-white">↗</span>
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
