import { useState } from "react";
import Link from "next/link";

export default function ReportarBug() {
  const [message, setMessage] = useState("");
  const [component, setComponent] = useState("gerar-foto");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage("");
    }, 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/70 to-black" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">
              Reportar Anomalia
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Ajude a Merse a evoluir</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Encontrou um comportamento estranho ou explosão inesperada em sua jornada? Descreva
              com detalhes para nossa equipe de manutenção cósmica.
            </p>
          </div>
          <Link
            href="/gerar"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40 hover:bg-white/20"
          >
            Voltar
          </Link>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/75 backdrop-blur"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
              Onde aconteceu?
            </span>
            <select
              value={component}
              onChange={(event) => setComponent(event.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-purple-300/60"
            >
              <option value="gerar-foto">Gerar Foto</option>
              <option value="gerar-video">Gerar Vídeo</option>
              <option value="galeria">Galeria</option>
              <option value="chat">Chat de Prompt</option>
              <option value="outro">Outro fluxo</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
              Descreva a anomalia
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder="Ex.: ao gerar vídeo, a tela fica em branco e aparece o código 503..."
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-purple-300/60"
              required
            />
          </label>

          <button
            type="submit"
            className="rounded-full border border-purple-300/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!message}
          >
            {submitted ? "Enviado! Obrigado ✨" : "Enviar relatório"}
          </button>
        </form>
      </main>
    </div>
  );
}
