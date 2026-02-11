import Head from "next/head";
import Link from "next/link";
import {
  PiVideoFill,
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
    id: "briefing",
    title: "Briefing Criativo",
    description: "Prompt, direcao e consistencia de marca.",
    accent: "from-cyan-500/35 via-sky-500/15 to-transparent",
    items: [
      {
        name: "prompt",
        type: "string",
        required: true,
        description: "O que o video deve comunicar.",
      },
      {
        name: "direction",
        type: "string",
        defaultValue: "",
        description: "Editor por intencao (ex.: mais luxo, mais agressivo).",
      },
      {
        name: "brand_id",
        type: "string",
        defaultValue: "default",
        description: "ID da marca para consistencia de identidade.",
      },
      {
        name: "language",
        type: "string",
        defaultValue: "pt-br",
        options: "pt-br | en-us | es-es",
        description: "Idioma do video.",
      },
      {
        name: "learn_style",
        type: "boolean",
        defaultValue: "true",
        description: "Aprende o estilo do brand_id (media movel).",
      },
    ],
  },
  {
    id: "output",
    title: "Ritmo e Qualidade",
    description: "Duracao, aspect e intensidade sonora.",
    accent: "from-emerald-500/35 via-teal-500/15 to-transparent",
    items: [
      {
        name: "duration",
        type: "integer",
        defaultValue: "10",
        range: "5 a 20",
        description: "Duracao total do video.",
      },
      {
        name: "aspect",
        type: "string",
        defaultValue: "vertical",
        options: "vertical | horizontal",
        description: "Formato do video.",
      },
      {
        name: "quality",
        type: "string",
        defaultValue: "normal",
        options: "normal | high",
        description: "Nivel de qualidade do render.",
      },
      {
        name: "bpm",
        type: "integer",
        defaultValue: "96",
        range: "70 a 140",
        description: "Ritmo da trilha e cortes.",
      },
      {
        name: "energy",
        type: "number",
        defaultValue: "0.55",
        range: "0 a 1",
        description: "Energia geral do clip.",
      },
    ],
  },
  {
    id: "produto",
    title: "Modo Produto",
    description: "Ativa o demo com nome e features.",
    accent: "from-fuchsia-500/35 via-purple-500/15 to-transparent",
    items: [
      {
        name: "product_name",
        type: "string",
        defaultValue: "",
        description: "Se preencher, ativa modo demo de produto.",
      },
      {
        name: "features",
        type: "string",
        defaultValue: "",
        description: "Features (1 por linha) para o demo.",
      },
      {
        name: "proof_points",
        type: "string",
        defaultValue: "",
        description: "Linhas com '- x' por linha (opcional).",
      },
    ],
  },
  {
    id: "variacoes",
    title: "Variacoes e Ranking",
    description: "Controle de campanhas e melhores takes.",
    accent: "from-indigo-500/35 via-blue-500/15 to-transparent",
    items: [
      {
        name: "auto_rank",
        type: "boolean",
        defaultValue: "true",
        description: "Escolhe e destaca a melhor variacao (BEST.mp4).",
      },
      {
        name: "auto_campaign",
        type: "boolean",
        defaultValue: "false",
        description: "Gera 4-6 variacoes e exporta ZIP.",
      },
      {
        name: "variants",
        type: "integer",
        defaultValue: "4",
        range: "2 a 6",
        description: "Quantas variacoes gerar.",
      },
    ],
  },
  {
    id: "storyboard",
    title: "Storyboard",
    description: "Controle total de cenas com JSON.",
    accent: "from-orange-500/35 via-amber-500/15 to-transparent",
    items: [
      {
        name: "storyboard_json",
        type: "string",
        defaultValue: "",
        description: "Se colar storyboard, ignora o resto.",
      },
    ],
  },
];

const quickStats = [
  {
    title: "Direcao criativa",
    value: "Prompt + intent",
    description: "Ajuste luxo, agressividade e tom em uma linha.",
  },
  {
    title: "Campanhas prontas",
    value: "2-6 variacoes",
    description: "Auto-rank destaca o melhor take em BEST.mp4.",
  },
  {
    title: "Consistencia",
    value: "Brand ID",
    description: "Aprende estilo e mantem identidade.",
  },
];

const requestExample = `curl -X POST https://seu-dominio.com/api/video-ads/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Apresente o novo smartwatch com foco em performance e design premium.",
    "duration": 10,
    "brand_id": "default",
    "direction": "mais luxo",
    "aspect": "vertical",
    "quality": "normal",
    "bpm": 96,
    "energy": 0.55,
    "language": "pt-br",
    "product_name": "Merse Watch",
    "features": "Display AMOLED\\nBateria 7 dias\\nModo treino IA",
    "auto_rank": true,
    "auto_campaign": false,
    "variants": 4,
    "storyboard_json": "",
    "learn_style": true
  }'`;

const responseExample = `{
  "id": "job_8f92",
  "status": "queued"
}`;

const resultExample = `{
  "id": "job_8f92",
  "status": "succeeded",
  "best_url": "https://cdn.merse.ai/BEST.mp4",
  "variants": [
    "https://cdn.merse.ai/v1.mp4",
    "https://cdn.merse.ai/v2.mp4"
  ],
  "zip_url": "https://cdn.merse.ai/campaign.zip"
}`;

export default function VideoAdsApi() {
  return (
    <>
      <Head>
        <title>Video Ads API - Merse</title>
        <meta
          name="description"
          content="API Merse para gerar videos de campanha com variacoes, auto-rank e consistencia de marca."
        />
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/30 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_30%_85%,rgba(236,72,153,0.12),transparent_58%)]" />
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
        </div>

        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">Video Ads API</p>
                <h1 className="text-3xl font-semibold md:text-4xl">
                  <span className="bg-gradient-to-r from-emerald-200 via-cyan-200 to-fuchsia-200 bg-clip-text text-transparent">
                    Campanhas em video com direcao e consistencia de marca
                  </span>
                </h1>
                <p className="max-w-3xl text-sm text-white/70">
                  Gere videos de campanha com duracao controlada, variacoes automaticas, ranking do
                  melhor take e suporte a storyboard completo em JSON.
                </p>
              </div>
              <Link
                href="/gerar"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-emerald-200/60 hover:bg-emerald-500/20"
              >
                <PiVideoFill /> Voltar ao Gerar
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickStats.map((stat) => (
                <div
                  key={stat.title}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-80" />
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
                    <h2 className="text-lg font-semibold">POST /api/video-ads/create</h2>
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  Envie o briefing, duracao e variacoes. Quando <strong>auto_campaign</strong> esta
                  ativo, o motor retorna um pacote ZIP com as variacoes geradas.
                </p>
                <div className="grid gap-3 text-sm text-white/70">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-emerald-300" />
                    <span>Auto-rank destaca o melhor take em BEST.mp4.</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-cyan-300" />
                    <span>Storyboard JSON ignora o resto do payload.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-90" />
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
                    1. Envie prompt, duracao e direcao criativa.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    2. Defina variacoes e auto-rank para BEST.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    3. Baixe BEST.mp4 e o ZIP da campanha.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <header className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">Parametros</p>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Controle de campanhas e variacoes
              </h2>
              <p className="max-w-3xl text-sm text-white/70">
                Ajuste energia, ritmo e consistencia por brand_id. Use storyboard JSON para controlar
                cenas manualmente.
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
                            {item.required ? (
                              <span className="rounded-full border border-rose-200/30 bg-rose-500/20 px-3 py-1 text-rose-100">
                                Obrigatorio
                              </span>
                            ) : item.defaultValue ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                Default: {item.defaultValue}
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-3 text-sm font-semibold text-white">{item.name}</h4>
                          <p className="mt-2 text-xs text-white/70">{item.description}</p>
                          {item.options ? (
                            <p className="mt-2 text-xs text-white/60">Opcoes: {item.options}</p>
                          ) : null}
                          {item.range ? (
                            <p className="mt-1 text-xs text-white/60">Faixa: {item.range}</p>
                          ) : null}
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
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-90" />
              <div className="relative space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">Request</p>
                <h3 className="text-xl font-semibold text-white">Exemplo de chamada</h3>
                <p className="text-sm text-white/70">
                  Ajuste o prompt e os modos. Use <strong>storyboard_json</strong> para controle total
                  de cenas.
                </p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                  <code>{requestExample}</code>
                </pre>
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/70">
                  Dica: ative <strong>auto_campaign</strong> para exportar o ZIP das variacoes.
                </div>
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
                  <p className="text-xs text-white/60">
                    Exemplo com BEST.mp4, variacoes e ZIP de campanha.
                  </p>
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
