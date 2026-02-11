import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PiBrowsersFill,
  PiCheckCircleFill,
  PiCopySimpleFill,
  PiImageFill,
  PiRocketFill,
  PiSwapFill,
} from "react-icons/pi";

const apiShowcase = [
  {
    id: "merse-gerador-de-imagem",
    title: "Merse · Gerador de Imagem",
    description: "Transforme prompts em renders cinematográficos no endpoint otimizado da Merse.",
    badge: "Imagem",
    accent: "from-purple-500/40 via-blue-500/25 to-transparent",
    icon: PiImageFill,
    command: "npx create-replicate --model=3mgalaxia/merse-gerador-de-imagem",
  },
  {
    id: "merse",
    title: "Merse · Base Criativa",
    description:
      "Envie uma foto e receba a versão masculina ou feminina com estilo Merse mantendo o rosto original.",
    badge: "Gênero",
    accent: "from-fuchsia-500/35 via-indigo-500/25 to-transparent",
    icon: PiSwapFill,
    command: "npx create-replicate --model=3mgalaxia/merse",
  },
  {
    id: "merse-gerador-de-site",
    title: "Merse · Gerador de Site",
    description: "Receba HTML completo para landings e seções futuristas com estética Merse.",
    badge: "Sites",
    accent: "from-cyan-500/35 via-emerald-500/25 to-transparent",
    icon: PiBrowsersFill,
    command: "npx create-replicate --model=3mgalaxia/merse-gerador-de-site",
  },
] as const;

type ApiId = (typeof apiShowcase)[number]["id"];

const setupSteps = [
  {
    title: "Defina o token",
    description: "Use a chave Replicate ou Merse para autenticar seus requests.",
    accent: "from-emerald-500/30 via-teal-500/20 to-transparent",
  },
  {
    title: "Rode o starter",
    description: "Execute o comando npx create-replicate para criar o template da engine.",
    accent: "from-cyan-500/35 via-blue-500/20 to-transparent",
  },
  {
    title: "Dispare o request",
    description: "Envie prompt, imagem ou briefing e receba o output em segundos.",
    accent: "from-purple-500/35 via-fuchsia-500/20 to-transparent",
  },
] as const;

const baseCommands = [
  {
    label: "Token",
    value: "export REPLICATE_API_TOKEN=seu_token_aqui",
  },
  {
    label: "Project",
    value: "npm create replicate@latest",
  },
] as const;

const apiDemos = [
  {
    id: "merse-gerador-de-imagem",
    title: "Demo · Gerador de Imagem",
    badge: "Imagem",
    accent: "from-purple-500/45 via-blue-500/25 to-transparent",
    inputs: [
      { label: "prompt", value: "tenis futurista em neon com fundo limpo" },
      { label: "provider", value: "merse" },
      { label: "aspectRatio", value: "16:9" },
    ],
    command: `curl -X POST https://seu-dominio.com/api/generate-image \\
  -H "Content-Type: application/json" \\
  -d '{ "prompt": "tenis futurista em neon", "provider": "merse", "count": 1, "aspectRatio": "16:9" }'`,
    response: `{
  "images": ["https://cdn.merse.ai/render.png"],
  "provider": "merse",
  "usage": { "credits": 10 }
}`,
    preview: "Render cinematográfico pronto para campanhas",
  },
  {
    id: "merse",
    title: "Demo · Troca de Gênero",
    badge: "Gênero",
    accent: "from-fuchsia-500/40 via-indigo-500/25 to-transparent",
    inputs: [
      { label: "image", value: "data:image/png;base64,<base64-da-foto>" },
      { label: "targetGender", value: "feminino" },
      { label: "intensity", value: "75" },
    ],
    command: `curl -X POST https://seu-dominio.com/api/gender-swap \\
  -H "Content-Type: application/json" \\
  -d '{ "image": "data:image/png;base64,<base64>", "targetGender": "feminino" }'`,
    response: `{
  "imageUrl": "https://cdn.merse.ai/identity.png",
  "provider": "merse"
}`,
    preview: "Identidade ajustada mantendo traços originais",
  },
  {
    id: "merse-gerador-de-site",
    title: "Demo · Gerador de Site",
    badge: "Sites",
    accent: "from-cyan-500/40 via-emerald-500/25 to-transparent",
    inputs: [
      { label: "prompt", value: "landing fintech com glow e CTA para app" },
      { label: "industry", value: "fintech" },
      { label: "sections", value: "hero, beneficios, depoimentos" },
    ],
    command: `curl -X POST https://seu-dominio.com/api/generate-site \\
  -H "Content-Type: application/json" \\
  -d '{ "prompt": "landing fintech neon", "industry": "fintech" }'`,
    response: `{
  "html": "<!DOCTYPE html>...",
  "sections": ["hero", "features", "cta"]
}`,
    preview: "Blueprint HTML completo com visual Merse",
  },
] as const;

type CopyStatus = "idle" | "copied";

export default function ApisPublicas() {
  const [apiGuideOpen, setApiGuideOpen] = useState(true);
  const [selectedApiId, setSelectedApiId] = useState<ApiId>(apiShowcase[0].id);
  const [apiCopyStatus, setApiCopyStatus] = useState<CopyStatus>("idle");

  const selectedApi = useMemo(
    () => apiShowcase.find((api) => api.id === selectedApiId) ?? apiShowcase[0],
    [selectedApiId],
  );

  useEffect(() => {
    setApiCopyStatus("idle");
  }, [selectedApiId]);

  const handleOpenApiGuide = (apiId: ApiId) => {
    setSelectedApiId(apiId);
    setApiGuideOpen(true);
  };

  const handleCloseApiGuide = () => {
    setApiGuideOpen(false);
  };

  const handleCopyApiCommand = async () => {
    if (!selectedApi.command) return;
    try {
      await navigator.clipboard.writeText(selectedApi.command);
      setApiCopyStatus("copied");
      window.setTimeout(() => setApiCopyStatus("idle"), 1600);
    } catch {
      setApiCopyStatus("idle");
    }
  };

  return (
    <>
      <Head>
        <title>APIs Públicas · Merse</title>
        <meta
          name="description"
          content="Conecte seu stack às engines Merse hospedadas no Replicate e acelere protótipos de imagem, troca de gênero e HTML."
        />
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-24 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/30 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.18),transparent_55%),radial-gradient(circle_at_78%_35%,rgba(59,130,246,0.16),transparent_60%),radial-gradient(circle_at_30%_80%,rgba(236,72,153,0.14),transparent_58%)]" />
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
        </div>

        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">APIs públicas</p>
                <h1 className="text-3xl font-semibold md:text-4xl">
                  <span className="bg-gradient-to-r from-emerald-200 via-cyan-200 to-purple-200 bg-clip-text text-transparent">
                    Integre direto com o laboratório Merse
                  </span>
                </h1>
                <p className="max-w-3xl text-sm text-white/70">
                  Conecte seu stack às engines hospedadas no Replicate e acelere protótipos de imagem,
                  troca de gênero e HTML.
                </p>
              </div>
              <Link
                href="/dev-hub"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-emerald-200/60 hover:bg-emerald-500/20"
              >
                <PiRocketFill /> Dev Hub
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/60">
              <span className="rounded-full border border-emerald-200/20 bg-white/10 px-4 py-1">
                3 engines ativas
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-white/10 px-4 py-1">
                setup em minutos
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-white/10 px-4 py-1">
                comandos prontos
              </span>
            </div>
          </header>

          <section className="grid gap-6 md:grid-cols-3">
            {setupSteps.map((step) => (
              <article
                key={step.title}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${step.accent} opacity-80`} />
                <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-white/10 blur-[120px]" />
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Passo</p>
                  <h2 className="text-lg font-semibold text-white">{step.title}</h2>
                  <p className="text-sm text-white/70">{step.description}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            {baseCommands.map((command) => (
              <article
                key={command.label}
                className="rounded-3xl border border-white/10 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">{command.label}</p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <code className="block break-all font-mono text-xs text-white/80">
                    {command.value}
                  </code>
                </div>
              </article>
            ))}
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Engines disponíveis</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-white/60">Escolha sua API</span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {apiShowcase.map((api) => {
                const Icon = api.icon;
                return (
                  <button
                    key={api.id}
                    type="button"
                    onClick={() => handleOpenApiGuide(api.id)}
                    className="group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-1"
                  >
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${api.accent} opacity-85`} />
                    <div className="absolute -top-16 -right-24 h-40 w-40 rounded-full bg-white/10 blur-[120px]" />
                    <div className="relative flex h-full flex-col gap-4 text-white">
                      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/70">
                        {api.badge}
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70">
                        <Icon className="text-lg" />
                      </span>
                      <h2 className="text-xl font-semibold">{api.title}</h2>
                      <p className="text-sm text-white/70">{api.description}</p>
                      <span className="mt-auto inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/60 transition group-hover:text-white">
                        Ver guia <span aria-hidden>→</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {apiGuideOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 18 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
                >
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -right-20 -top-16 h-52 w-52 rounded-full bg-white/10 blur-[120px]" />
                    <div
                      className={`absolute -left-16 bottom-[-30%] h-72 w-72 rounded-full bg-gradient-to-br ${selectedApi.accent} opacity-70 blur-[140px]`}
                    />
                  </div>
                  <div className="relative flex flex-col gap-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/70">Guia de instalação</p>
                        <h3 className="text-2xl font-semibold text-white">{selectedApi.title}</h3>
                        <p className="text-sm text-white/70">{selectedApi.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCloseApiGuide}
                        className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/35 hover:bg-white/20"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
                        <span>Comando</span>
                        <button
                          type="button"
                          onClick={handleCopyApiCommand}
                          className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r ${selectedApi.accent} px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/40`}
                        >
                          {apiCopyStatus === "copied" ? (
                            <>
                              <PiCheckCircleFill /> Copiado
                            </>
                          ) : (
                            <>
                              <PiCopySimpleFill /> Copiar comando
                            </>
                          )}
                        </button>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                        <code className="block break-all font-mono text-xs text-white/80">
                          {selectedApi.command}
                        </code>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Passo 01</p>
                        <p className="mt-3 text-white">Abra o terminal</p>
                        <p className="mt-2 text-xs text-white/60">
                          Use o terminal do seu sistema para rodar o comando.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Passo 02</p>
                        <p className="mt-3 text-white">Cole o comando</p>
                        <p className="mt-2 text-xs text-white/60">
                          Copie o comando acima e cole no terminal.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Passo 03</p>
                        <p className="mt-3 text-white">Siga o assistente</p>
                        <p className="mt-2 text-xs text-white/60">
                          O setup cria a estrutura e prepara o endpoint.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Demonstrações rápidas</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-white/60">
                exemplos prontos para testar
              </span>
            </div>

            <div className="grid gap-6">
              {apiDemos.map((demo) => (
                <article
                  key={demo.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${demo.accent} opacity-75`} />
                  <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full bg-white/10 blur-[120px]" />
                  <div className="relative flex flex-col gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/70">{demo.badge}</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{demo.title}</h3>
                        <p className="mt-2 text-sm text-white/70">{demo.preview}</p>
                      </div>
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-white/60">
                        Demo visual
                      </span>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Entrada</p>
                          <div className="mt-3 space-y-2 text-sm text-white/70">
                            {demo.inputs.map((input) => (
                              <div key={input.label} className="flex flex-col gap-1">
                                <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                                  {input.label}
                                </span>
                                <span className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80">
                                  {input.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Comando rápido</p>
                          <pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
                            {demo.command}
                          </pre>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Preview</p>
                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/60 p-4">
                            {demo.id === "merse-gerador-de-site" ? (
                              <div className="space-y-3">
                                <div className="h-10 rounded-xl bg-white/10" />
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="h-20 rounded-xl bg-white/10" />
                                  <div className="h-20 rounded-xl bg-white/10" />
                                </div>
                                <div className="h-12 rounded-xl bg-white/10" />
                              </div>
                            ) : (
                              <div className="flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent text-xs uppercase tracking-[0.35em] text-white/60">
                                Preview merse
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Resposta esperada</p>
                          <pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
                            {demo.response}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
