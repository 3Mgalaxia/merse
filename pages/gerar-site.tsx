import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { PiSparkleFill, PiCopySimpleFill, PiCheckBold } from "react-icons/pi";

type GenerationResponse = {
  id: string;
  status: string;
  output?: unknown;
  logs?: string;
};

const extractHtml = (output: unknown): string | null => {
  if (!output) return null;
  if (typeof output === "string") {
    return output.trim().startsWith("<") ? output : null;
  }
  if (Array.isArray(output)) {
    for (const entry of output) {
      const html = extractHtml(entry);
      if (html) return html;
    }
    return null;
  }
  if (typeof output === "object") {
    const maybe = (output as { html?: unknown; content?: unknown }).html ?? (output as any).content;
    if (maybe) return extractHtml(maybe);
  }
  return null;
};

export default function GerarSite() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const siteHtml = extractHtml(result?.output ?? null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch("/api/generate-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await response.json()) as GenerationResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o site.");
      }

      setResult(data);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Falha inesperada ao gerar site.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!siteHtml) return;
    try {
      await navigator.clipboard.writeText(siteHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Head>
        <title>Gerar Site • Merse Builder</title>
      </Head>
      <main className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.3),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.25),transparent_60%),linear-gradient(180deg,#030014,#010007)]" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-24">
          <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-10 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-purple-200/70">Merse Generator</p>
                <h1 className="mt-3 text-3xl font-semibold">Gerador de Sites via Replicate</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/70">
                  Use o motor Merse hospedado na Replicate para transformar prompts em sites completos,
                  com identidade cósmica e componentes já alinhados ao Merse Builder.
                </p>
              </div>
              <Link
                href="/gerar"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:text-white"
              >
                Voltar
              </Link>
            </div>
          </header>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.4)]">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                Briefing
              </p>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ex.: Site SaaS para agência espacial com CTA hero, cards de recursos e depoimentos holográficos."
                className="min-h-[220px] w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              {error && (
                <p className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !prompt.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_45px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PiSparkleFill className={`text-lg ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Gerando..." : "Gerar site"}
              </button>
            </div>

            <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Resultado</p>
                  <h2 className="text-xl font-semibold text-white">Blueprint Merse</h2>
                </div>
                {siteHtml && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <PiCheckBold />
                        Copiado
                      </>
                    ) : (
                      <>
                        <PiCopySimpleFill />
                        Copiar
                      </>
                    )}
                  </button>
                )}
              </div>

              {!result && !isLoading && (
                <p className="text-sm text-white/65">
                  Assim que o modelo terminar, o HTML gerado aparecerá aqui com preview ao vivo e opção
                  para copiar. Use prompts completos descrevendo estrutura, tom e seções.
                </p>
              )}

              {isLoading && (
                <div className="h-[420px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              )}

              {result && (
                <div className="space-y-4">
                  <div className="space-y-1 text-sm text-white/70">
                    <p>
                      <span className="text-white/50">Status:</span> {result.status}
                    </p>
                    <p className="text-white/50">
                      ID: <span className="text-white">{result.id}</span>
                    </p>
                  </div>

                  {siteHtml ? (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70">
                      <iframe
                        key={result.id}
                        title="Preview do site gerado"
                        srcDoc={siteHtml}
                        className="h-[420px] w-full border-0 bg-white"
                      />
                    </div>
                  ) : (
                    <pre className="max-h-[420px] overflow-auto rounded-2xl border border-white/10 bg-black/70 p-4 text-xs text-white/80">
                      {JSON.stringify(result.output ?? result, null, 2)}
                    </pre>
                  )}

                  {result.logs && (
                    <details className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/70">
                      <summary className="cursor-pointer text-white">Logs</summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px]">
                        {result.logs}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
