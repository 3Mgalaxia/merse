import Head from "next/head";
import Link from "next/link";

const curlExample = `curl -X POST https://yourdomain.com/api/v1/image \\
  -H "Authorization: Bearer merse_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "prompt": "astro merse", "provider": "openai" }'`;

const jsExample = `import fetch from "node-fetch";

const resp = await fetch("https://yourdomain.com/api/v1/image", {
  method: "POST",
  headers: {
    Authorization: "Bearer merse_live_xxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prompt: "astro merse", provider: "openai" }),
});
const { jobId } = await resp.json();`;

const errorDocs = [
  { code: 401, reason: "API key ausente ou inválida." },
  { code: 403, reason: "Chave sem permissão para o recurso." },
  { code: 429, reason: "Rate limit atingido (veja limites por plano)." },
  { code: 402, reason: "Créditos insuficientes." },
];

const limits = [
  { tier: "Basic", image: "30/min", video: "6/min", site: "12/min" },
  { tier: "Pro", image: "120/min", video: "30/min", site: "60/min" },
  { tier: "Enterprise", image: "600/min", video: "120/min", site: "200/min" },
];

export default function Developers() {
  return (
    <>
      <Head>
        <title>Developers · Merse API</title>
      </Head>
      <main className="min-h-screen bg-black px-6 py-14 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Developer Portal</p>
            <h1 className="text-3xl font-semibold md:text-4xl">Integre com a Merse API</h1>
            <p className="max-w-3xl text-sm text-white/70">
              Use chaves Merse (`merse_live_...`), consulte status de jobs e respeite limites por plano. Suporte a imagem,
              vídeo, site e objetos.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Exemplo cURL</p>
              <pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
                {curlExample}
              </pre>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Exemplo JS</p>
              <pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
                {jsExample}
              </pre>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Status & Jobs</p>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li>
                `POST /api/v1/image|video|site|object` → retorna `jobId`, status `queued`.
              </li>
              <li>
                `GET /api/v1/job/:id` → traz status `queued|processing|completed|failed` e `result` quando pronto.
              </li>
            </ul>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Erros comuns</p>
              <ul className="mt-3 space-y-2 text-sm text-white/75">
                {errorDocs.map((err) => (
                  <li key={err.code}>
                    <span className="font-semibold text-white">{err.code}</span> — {err.reason}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Limites por plano</p>
              <div className="mt-3 space-y-2 text-sm text-white/75">
                {limits.map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                    <span className="font-semibold text-white">{tier.tier}</span>
                    <span>Img {tier.image} · Vídeo {tier.video} · Site {tier.site}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Status page</p>
            <p className="text-sm text-white/75">
              Consulte a página de status para latência e uptime das engines.
            </p>
            <Link href="/status" className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20">
              Ver status
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
