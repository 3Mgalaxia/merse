import Head from "next/head";
import Link from "next/link";
import {
  PiBrowsersFill,
  PiSparkleFill,
  PiSlidersFill,
  PiCheckCircleFill,
  PiCodeFill,
} from "react-icons/pi";

type ParameterItem = {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  defaultValue?: string;
  options?: string;
  range?: string;
};

type ParameterGroup = {
  id: string;
  title: string;
  description: string;
  accent: string;
  items: ParameterItem[];
};

const parameterGroups: ParameterGroup[] = [
  {
    id: "project",
    title: "Projeto",
    description: "Nome, briefing e identidade base.",
    accent: "from-indigo-500/35 via-cyan-500/15 to-transparent",
    items: [
      {
        name: "project_name",
        type: "string",
        defaultValue: "Galactico",
        description: "Nome do projeto.",
      },
      {
        name: "brief",
        type: "string",
        defaultValue: "Site com estetica Merse e foco em conversao.",
        description: "Brief do site.",
      },
      {
        name: "brand_colors",
        type: "string",
        defaultValue: "azul, roxo",
        description: "Cores da marca (texto).",
      },
      {
        name: "tone",
        type: "string",
        defaultValue: "futurista",
        description: "Tom do site.",
      },
    ],
  },
  {
    id: "audience",
    title: "Publico e CTA",
    description: "Alvo e chamada principal.",
    accent: "from-emerald-500/35 via-teal-500/15 to-transparent",
    items: [
      {
        name: "audience",
        type: "string",
        defaultValue: "Criadores e designers",
        description: "Publico-alvo.",
      },
      {
        name: "cta",
        type: "string",
        defaultValue: "Explorar",
        description: "CTA principal.",
      },
    ],
  },
  {
    id: "blueprint",
    title: "Blueprint",
    description: "Features e paginas customizadas.",
    accent: "from-fuchsia-500/35 via-purple-500/15 to-transparent",
    items: [
      {
        name: "features_json",
        type: "string",
        defaultValue: "{\"preview\":true,\"seo\":true,\"auth\":false,\"cms\":false}",
        description: "JSON de features.",
      },
      {
        name: "pages_json",
        type: "string",
        defaultValue: "[]",
        description: "JSON de paginas do blueprint.",
      },
    ],
  },
];

const quickStats = [
  {
    title: "Blueprint pronto",
    value: "Pages + SEO",
    description: "Estrutura completa com SEO e preview.",
  },
  {
    title: "Identidade clara",
    value: "Tone + cores",
    description: "Direcao visual consistente.",
  },
  {
    title: "CTA direto",
    value: "Conversao",
    description: "Chamada principal definida no payload.",
  },
];

const requestExample = `curl -X POST https://seu-dominio.com/api/site-blueprint/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_name": "Galactico",
    "brief": "Site com estetica Merse e foco em conversao.",
    "brand_colors": "azul, roxo",
    "tone": "futurista",
    "features_json": "{\\"preview\\":true,\\"seo\\":true,\\"auth\\":false,\\"cms\\":false}",
    "pages_json": "[]",
    "audience": "Criadores e designers",
    "cta": "Explorar"
  }'`;

const responseExample = `{
  "project_id": "site_42b9",
  "status": "blueprint_ready"
}`;

const resultExample = `{
  "project_id": "site_42b9",
  "pages": [
    { "slug": "/", "title": "Hero Merse" }
  ]
}`;

export default function SiteBlueprintApi() {
  return (
    <>
      <Head>
        <title>Site Blueprint API - Merse</title>
        <meta
          name="description"
          content="API Merse para gerar blueprint de site com briefing, cores, tom e features."
        />
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/30 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_30%_85%,rgba(236,72,153,0.12),transparent_58%)]" />
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
        </div>

        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-indigo-200/80">Site Blueprint API</p>
                <h1 className="text-3xl font-semibold md:text-4xl">
                  <span className="bg-gradient-to-r from-indigo-200 via-cyan-200 to-fuchsia-200 bg-clip-text text-transparent">
                    Blueprint completo a partir do briefing
                  </span>
                </h1>
                <p className="max-w-3xl text-sm text-white/70">
                  Envie nome, briefing, tom e cores e receba um blueprint com paginas e estrutura
                  pronta para evoluir o site.
                </p>
              </div>
              <Link
                href="/gerar"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200/30 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-indigo-200/60 hover:bg-indigo-500/20"
              >
                <PiBrowsersFill /> Voltar ao Gerar
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickStats.map((stat) => (
                <div
                  key={stat.title}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent opacity-80" />
                  <div className="relative space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">{stat.title}</p>
                    <h3 className="text-2xl font-semibold text-white">{stat.value}</h3>
                    <p className="text-sm text-white/60">{stat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 via-transparent to-transparent opacity-90" />
              <div className="relative space-y-5">
                <div className="flex items-center gap-3 text-white/80">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <PiCodeFill className="text-lg" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Endpoint</p>
                    <h2 className="text-lg font-semibold">POST /api/site-blueprint/create</h2>
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  Use o payload para gerar o blueprint. Features e paginas podem ser enviados como JSON
                  (texto) para controle total.
                </p>
                <div className="grid gap-3 text-sm text-white/70">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-emerald-300" />
                    <span>Blueprint pronto para evoluir com builders.</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-cyan-300" />
                    <span>CTA e publico-alvo ja entram no contexto.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent opacity-90" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-3 text-white/80">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <PiSparkleFill className="text-lg" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Fluxo</p>
                    <h2 className="text-lg font-semibold">Como usar em 3 passos</h2>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-white/70">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    1. Envie briefing, tom e cores da marca.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    2. Opcionalmente passe features e paginas em JSON.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    3. Receba o blueprint com paginas e SEO.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <header className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-200/80">Parametros</p>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Controle da estrutura do site
              </h2>
              <p className="max-w-3xl text-sm text-white/70">
                Ajuste o briefing, publico, CTA e os JSONs para features e paginas.
              </p>
            </header>

            <div className="grid gap-6">
              {parameterGroups.map((group) => (
                <div
                  key={group.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${group.accent} opacity-90`} />
                  <div className="relative space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                        <PiSlidersFill className="text-lg text-white/80" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                        <p className="text-sm text-white/60">{group.description}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {group.items.map((item) => (
                        <div
                          key={item.name}
                          className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                        >
                          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/60">
                            <span>{item.type}</span>
                            {item.defaultValue ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                Default: {item.defaultValue}
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-3 text-sm font-semibold text-white">{item.name}</h4>
                          <p className="mt-2 text-xs text-white/70">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent opacity-90" />
              <div className="relative space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-indigo-200/80">Request</p>
                <h3 className="text-xl font-semibold text-white">Exemplo de chamada</h3>
                <p className="text-sm text-white/70">
                  Envie JSON com briefing, cores e publico para gerar o blueprint.
                </p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                  <code>{requestExample}</code>
                </pre>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 via-transparent to-transparent opacity-90" />
              <div className="relative space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-200/80">Resposta</p>
                  <h3 className="text-xl font-semibold text-white">Status inicial</h3>
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                  <code>{responseExample}</code>
                </pre>
                <div>
                  <h4 className="text-sm font-semibold text-white">Resultado final</h4>
                  <p className="text-xs text-white/60">Exemplo com paginas geradas.</p>
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                  <code>{resultExample}</code>
                </pre>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
