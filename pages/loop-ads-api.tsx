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
    id: "estilo",
    title: "Estilo Base",
    description: "Define o mood, o cenário e os elementos visuais do loop.",
    accent: "from-cyan-500/35 via-sky-500/15 to-transparent",
    items: [
      {
        name: "preset",
        type: "string",
        defaultValue: "ecom",
        options: "ecom | cosmic | minimal | premium",
        description: "Define a linguagem visual principal do loop.",
      },
      {
        name: "background_mode",
        type: "string",
        defaultValue: "studio_glass",
        options: "studio_glass | cosmic_nebula | packshot_studio",
        description: "Cenário base com luzes, reflexos e atmosfera.",
      },
      {
        name: "element",
        type: "string",
        defaultValue: "mixed",
        options: "none | orb | chroma_creature | mixed",
        description: "Elementos 3D flutuantes para dar identidade ao loop.",
      },
      {
        name: "particles",
        type: "boolean",
        defaultValue: "true",
        description: "Ativa partículas para brilho e profundidade.",
      },
      {
        name: "particle_style",
        type: "string",
        defaultValue: "mixed",
        options: "dust | comet | mixed",
        description: "Define o estilo das partículas em cena.",
      },
      {
        name: "palette_mode",
        type: "string",
        defaultValue: "auto",
        options: "auto | manual",
        description: "Define se a paleta sera automatic ou manual.",
      },
      {
        name: "manual_colors",
        type: "string",
        defaultValue: "#00D1FF,#8A2BE2,#FF2BD6,#00FFB2,#FFB200",
        description: "Paleta customizada quando palette_mode = manual.",
      },
    ],
  },
  {
    id: "produto",
    title: "Produto",
    description: "Controle de produto, recorte e reflexos.",
    accent: "from-fuchsia-500/35 via-purple-500/15 to-transparent",
    items: [
      {
        name: "with_product",
        type: "boolean",
        defaultValue: "false",
        description: "Ativa o modo com produto (requer product_image).",
      },
      {
        name: "product_image",
        type: "file | url",
        description: "Imagem do produto (arquivo ou URL publica).",
      },
      {
        name: "remove_bg",
        type: "boolean",
        defaultValue: "true",
        description: "Remove o fundo automaticamente antes de compor.",
      },
      {
        name: "reflection",
        type: "boolean",
        defaultValue: "true",
        description: "Ativa reflexo no piso para look premium.",
      },
      {
        name: "reflection_strength",
        type: "number",
        defaultValue: "0.22",
        range: "0 a 0.8",
        description: "Intensidade do reflexo do produto.",
      },
      {
        name: "product_scale",
        type: "number",
        defaultValue: "0.58",
        range: "0.2 a 0.9",
        description: "Escala do produto na cena.",
      },
      {
        name: "product_x",
        type: "number",
        defaultValue: "0.64",
        range: "0 a 1",
        description: "Posicao horizontal do produto.",
      },
      {
        name: "product_y",
        type: "number",
        defaultValue: "0.5",
        range: "0 a 1",
        description: "Posicao vertical do produto.",
      },
    ],
  },
  {
    id: "texto",
    title: "Texto e Identidade",
    description: "Titulos e animacoes tipograficas do loop.",
    accent: "from-emerald-500/35 via-teal-500/15 to-transparent",
    items: [
      {
        name: "title",
        type: "string",
        defaultValue: "MERSE",
        description: "Titulo principal exibido no loop.",
      },
      {
        name: "subtitle",
        type: "string",
        defaultValue: "Loop Ads Engine",
        description: "Subtitulo exibido abaixo do titulo.",
      },
      {
        name: "text_anim",
        type: "string",
        defaultValue: "fade",
        options: "none | fade | slide | type",
        description: "Animacao do texto entre cenas.",
      },
    ],
  },
  {
    id: "timing",
    title: "Timing e Loop",
    description: "Controle de tempo, motion e dimensoes do video.",
    accent: "from-indigo-500/35 via-blue-500/15 to-transparent",
    items: [
      {
        name: "scenes",
        type: "integer",
        defaultValue: "5",
        range: "3 a 10",
        description: "Quantidade de cenas no loop.",
      },
      {
        name: "seconds_per_scene",
        type: "number",
        defaultValue: "1",
        range: "0.6 a 3",
        description: "Duracao de cada cena.",
      },
      {
        name: "fps",
        type: "integer",
        defaultValue: "24",
        range: "12 a 60",
        description: "Frames por segundo do video.",
      },
      {
        name: "motion_intensity",
        type: "number",
        defaultValue: "0.9",
        range: "0 a 1",
        description: "Intensidade de movimento e parallax.",
      },
      {
        name: "loop_fade",
        type: "number",
        defaultValue: "0.35",
        range: "0.1 a 0.8",
        description: "Suavizacao do crossfade entre fim e inicio.",
      },
      {
        name: "width",
        type: "integer",
        defaultValue: "720",
        range: "512 a 1080",
        description: "Largura do video.",
      },
      {
        name: "height",
        type: "integer",
        defaultValue: "1280",
        range: "512 a 1920",
        description: "Altura do video.",
      },
    ],
  },
  {
    id: "batch",
    title: "Batch e Variacoes",
    description: "Controle de reproducao e quantidade de loops retornados.",
    accent: "from-orange-500/35 via-amber-500/15 to-transparent",
    items: [
      {
        name: "seed",
        type: "integer",
        defaultValue: "0",
        description: "0 = aleatorio. >0 = resultado reproduzivel.",
      },
      {
        name: "batch_count",
        type: "integer",
        defaultValue: "5",
        range: "1 a 8",
        description: "Quantidade de loops retornados por request.",
      },
      {
        name: "batch_start",
        type: "integer",
        defaultValue: "0",
        range: "0 a 9999",
        description: "Offset inicial de variacao.",
      },
    ],
  },
];

const quickStats = [
  {
    title: "Loop perfeito",
    value: "3-10 cenas",
    description: "Crossfade continuo entre inicio e fim.",
  },
  {
    title: "Produto opcional",
    value: "Recorte auto",
    description: "Remove fundo e aplica reflexo premium.",
  },
  {
    title: "Batch acelerado",
    value: "ate 8 loops",
    description: "Variacoes prontas em um unico request.",
  },
];

const requestExample = `curl -X POST https://seu-dominio.com/api/loop-ads/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "preset": "ecom",
    "background_mode": "studio_glass",
    "element": "mixed",
    "particles": true,
    "particle_style": "mixed",
    "with_product": false,
    "title": "MERSE",
    "subtitle": "Loop Ads Engine",
    "text_anim": "fade",
    "scenes": 5,
    "seconds_per_scene": 1,
    "fps": 24,
    "width": 720,
    "height": 1280,
    "motion_intensity": 0.9,
    "loop_fade": 0.35,
    "seed": 0,
    "batch_count": 5,
    "batch_start": 0
  }'`;

const responseExample = `{
  "id": "pred_abc123",
  "status": "starting"
}`;

const resultExample = `{
  "id": "pred_abc123",
  "status": "succeeded",
  "output": [
    "https://cdn.merse.ai/loop-1.mp4",
    "https://cdn.merse.ai/loop-2.mp4"
  ]
}`;

export default function LoopAdsApi() {
  return (
    <>
      <Head>
        <title>Loop Ads API · Merse</title>
        <meta
          name="description"
          content="API Merse para gerar loops de anuncios com multiplas cenas, efeitos cosmicos e produto opcional."
        />
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-cyan-950/30 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(217,70,239,0.14),transparent_60%),radial-gradient(circle_at_30%_85%,rgba(34,197,94,0.12),transparent_58%)]" />
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
        </div>

        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Loop Ads API</p>
                <h1 className="text-3xl font-semibold md:text-4xl">
                  <span className="bg-gradient-to-r from-cyan-200 via-emerald-200 to-fuchsia-200 bg-clip-text text-transparent">
                    Loops de anuncios cinematograficos em poucos segundos
                  </span>
                </h1>
                <p className="max-w-3xl text-sm text-white/70">
                  Gera videos em loop com 3 a 10 cenas, crossfade perfeito, elementos 3D, particulas e
                  produto opcional com reflexo. Pronto para campanhas e banners em motion.
                </p>
              </div>
              <Link
                href="/gerar"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-cyan-200/60 hover:bg-cyan-500/20"
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
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-transparent opacity-80" />
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
                    <h2 className="text-lg font-semibold">POST /api/loop-ads/create</h2>
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  O request cria um job assincrono e retorna o <strong>id</strong> da geracao. O output
                  final chega via webhook e fica disponivel como lista de URLs quando o status muda
                  para <strong>succeeded</strong>.
                </p>
                <div className="grid gap-3 text-sm text-white/70">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-cyan-300" />
                    <span>Retorno rapido com status inicial e id da previsao.</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <PiCheckCircleFill className="text-emerald-300" />
                    <span>Batch retorna multiplas variacoes do loop em uma chamada.</span>
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
                    1. Envie o payload com preset, cenas e estilo.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    2. Receba o id do job e acompanhe o status.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    3. Baixe os MP4s gerados quando o status for succeeded.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <header className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Parametros</p>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Controle total do loop e do produto
              </h2>
              <p className="max-w-3xl text-sm text-white/70">
                Combine presets, elementos, motion e paleta para criar loops de anuncios prontos para
                performance. Os parametros abaixo seguem o padrao da engine Merse.
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
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-transparent opacity-90" />
              <div className="relative space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Request</p>
                <h3 className="text-xl font-semibold text-white">Exemplo de chamada</h3>
                <p className="text-sm text-white/70">
                  Ajuste os parametros conforme seu produto. Para enviar imagem local, use uma URL
                  publica ou integre com storage.
                </p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                  <code>{requestExample}</code>
                </pre>
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/70">
                  Dica: use <strong>batch_count</strong> para explorar variacoes e <strong>seed</strong>{" "}
                  para reproduzir.
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-90" />
              <div className="relative space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">Resposta</p>
                  <h3 className="text-xl font-semibold text-white">Status inicial</h3>
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                  <code>{responseExample}</code>
                </pre>
                <div>
                  <h4 className="text-sm font-semibold text-white">Resultado final</h4>
                  <p className="text-xs text-white/60">
                    Quando o job finaliza, o output vem como lista de URLs MP4.
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
