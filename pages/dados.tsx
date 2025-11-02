import Link from "next/link";

const dataOptions = [
  {
    title: "Exportar histórico",
    description: "Faça download das interações, imagens e prompts gerados nos últimos 90 dias.",
    action: "Exportar arquivos .zip",
  },
  {
    title: "Sincronizar com storage externo",
    description:
      "Conecte sua conta com buckets S3, GCP ou Azure para arquivar automaticamente conteúdos gerados.",
    action: "Conectar provedor",
  },
  {
    title: "Logs em tempo real",
    description:
      "Acompanhe a execução das APIs e detecte gargalos com métricas de latência e uso de tokens.",
    action: "Abrir cockpit",
  },
];

export default function Dados() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/70 to-black" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">
              Dados & Segurança
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Gerencie sua telemetria</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Acompanhe suas integrações, exporte histórico e personalize fluxos de sincronização
              para manter sua operação organizada na Merse.
            </p>
          </div>
          <Link
            href="/gerar"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40 hover:bg-white/20"
          >
            Voltar
          </Link>
        </header>

        <section className="space-y-4">
          {dataOptions.map((option) => (
            <div
              key={option.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/75 backdrop-blur transition hover:border-purple-300/40 hover:bg-white/10"
            >
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                {option.title}
              </h2>
              <p className="mt-2 text-sm text-white/70">{option.description}</p>
              <button className="mt-4 rounded-full border border-purple-300/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20">
                {option.action}
              </button>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
            Proteção de dados
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>• Logs e arquivos exportados são criptografados com AES-256.</li>
            <li>• Tokens de acesso às integrações externas são rotacionados a cada 30 dias.</li>
            <li>
              • Você pode solicitar anonimização total dos dados pelo portal de privacidade a
              qualquer momento.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
