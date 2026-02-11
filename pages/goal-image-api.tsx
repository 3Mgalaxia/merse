import Head from "next/head";
import Link from "next/link";
import {
  PiImageFill,
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
    title: "Briefing",
    description: "Objetivo, referencia e modo de iteracao.",
    accent: "from-emerald-500/35 via-cyan-500/15 to-transparent",
    items: [
      {
        name: "goal",
        type: "string",
        required: true,
        description: "O objetivo do que voce quer criar.",
      },
      {
        name: "reference_image",
        type: "file",
        description: "Imagem referencia para ligar no fluxo (opcional).",
      },
      {
        name: "mode",
        type: "string",
        defaultValue: "evolve",
        options: "single | evolve",
        description: "single = 1 tentativa. evolve = varias iteracoes.",
      },
      {
        name: "iterations",
        type: "integer",
        defaultValue: "3",
        range: "1 a 6",
        description: "Quantas iteracoes no modo evolve.",
      },
    ],
  },
  {
    id: "output",
    title: "Output",
    description: "Tamanho final, qualidade e fidelidade.",
    accent: "from-cyan-500/35 via-sky-500/15 to-transparent",
    items: [
      {
        name: "size",
        type: "string",
        defaultValue: "1024x1536",
        description: "Tamanho final da imagem.",
      },
      {
        name: "quality",
        type: "string",
        defaultValue: "high",
        options: "auto | high | medium | low",
        description: "Qualidade da imagem.",
      },
      {
        name: "input_fidelity",
        type: "string",
        defaultValue: "high",
        description: "Quanto manter tracos da imagem.",
      },
    ],
  },
  {
    id: "models",
    title: "Modelos",
    description: "Selecao de modelos de imagem e texto.",
    accent: "from-fuchsia-500/35 via-purple-500/15 to-transparent",
    items: [
      {
        name: "image_model",
        type: "string",
        defaultValue: "gpt-image-1.5",
        description: "Modelo de imagem.",
      },
      {
        name: "text_model",
        type: "string",
        defaultValue: "gpt-4.1-mini",
        description: "Modelo de texto/visao (Responses API).",
      },
    ],
  },
  {
    id: "style",
    title: "Estilo",
    description: "Assinatura visual e protecao contra drift.",
    accent: "from-orange-500/35 via-amber-500/15 to-transparent",
    items: [
      {
        name: "brand_style",
        type: "string",
        defaultValue:
          "Merse signature: cinematic realism, iPhone photo feel, clean composition, premium contrast, subtle cosmic/neon accents, no AI look, no text, no logos.",
        description: "DNA visual fixo da marca.",
      },
      {
        name: "anti_drift",
        type: "boolean",
        defaultValue: "true",
        description: "Cria locks e forca consistencia.",
      },
    ],
  },
  {
    id: "auth",
    title: "Credenciais",
    description: "Chaves e seguranca.",
    accent: "from-indigo-500/35 via-blue-500/15 to-transparent",
    items: [
      {
        name: "openai_api_key",
        type: "secret",
        description: "Se vazio, usa OPENAI_API_KEY do ambiente.",
      },
    ],
  },
];

const quickStats = [
  {
    title: "Evolve mode",
    value: "1-6 iteracoes",
    description: "Melhoria progressiva com score.",
  },
  {
    title: "Assinatura fixa",
    value: "brand_style",
    description: "DNA visual consistente por projeto.",
  },
  {
    title: "Anti drift",
    value: "locks ativos",
    description: "Evita desvio de identidade.",
  },
];

const requestExample = `curl -X POST https://seu-dominio.com/api/goal-image/create \\
  -F "goal=Hero premium com produto em destaque" \\
  -F "mode=evolve" \\
  -F "iterations=3" \\
  -F "size=1024x1536" \\
  -F "quality=high" \\
  -F "image_model=gpt-image-1.5" \\
  -F "text_model=gpt-4.1-mini" \\
  -F "input_fidelity=high" \\
  -F "brand_style=Merse signature: cinematic realism, iPhone photo feel, clean composition, premium contrast, subtle cosmic/neon accents, no AI look, no text, no logos." \\
  -F "anti_drift=true" \\
  -F "reference_image=@./ref.png"`;

const responseExample = `{
  "id": "img_92fa",
  "status": "running"
}`;

const resultExample = `{
  "id": "img_92fa",
  "status": "succeeded",
  "image_url": "https://cdn.merse.ai/goal.png",
  "score": 0.92,
  "iterations": 3
}`;

export default function GoalImageApi() {
  return (
    <>
      <Head>
        <title>Goal Image API - Merse</title>
        <meta
          name="description"
          content="API Merse para gerar imagens com modo evolve, anti drift e assinatura visual fixa."
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
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">Goal Image API</p>
                <h1 className="text-3xl font-semibold md:text-4xl">
                  <span className="bg-gradient-to-r from-emerald-200 via-cyan-200 to-fuchsia-200 bg-clip-text text-transparent">
                    Imagens com evolucao guiada e assinatura fixa
                  </span>
                </h1>
                <p className="max-w-3xl text-sm text-white/70">
                  Use goal para orientar a criacao, ligue uma imagem de referencia e deixe o modo
                  evolve iterar com consistencia de marca.
                </p>
              </div>
              <Link
                href="/gerar"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-emerald-200/60 hover:bg-emerald-500/20"
              >
                <PiImageFill /> Voltar ao Gerar
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
                    <h2 className="text-lg font-semibold">POST /api/goal-image/create</h2>
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  Envie o goal e opcionalmente uma referencia. O modo evolve executa iteracoes e
                  retorna a melhor imagem com score.
                </p>
                <div className="grid gap-3 text-sm text-white/70">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-emerald-300" />
                    <span>Anti drift cria locks para manter consistencia.</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-cyan-300" />
                    <span>Reference image ajuda a manter composicao.</span>
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
                    1. Envie o goal e a imagem referencia.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    2. Defina mode, iteracoes e fidelidade.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    3. Receba a imagem final e o score.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <header className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">Parametros</p>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Controle fino de estilo e consistencia
              </h2>
              <p className="max-w-3xl text-sm text-white/70">
                Ajuste modelo, fidelidade e locks para manter identidade visual sem drift.
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
                  Envie multipart para upload da imagem. Sem referencia, basta enviar o goal.
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
                  <p className="text-xs text-white/60">Exemplo com score e total de iteracoes.</p>
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
