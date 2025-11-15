import Link from "next/link";
import PromptChat from "@/components/PromptChat";

function BackLink() {
  return (
    <Link
      href="/gerar"
      aria-label="Voltar para a página de geração"
      className="absolute left-6 top-6 z-30 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
    >
      VOLTAR
    </Link>
  );
}

export default function ChatPage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black/40"
        aria-hidden
      />
      <BackLink />
      <main className="relative z-20 mx-auto flex w-full max-w-6xl flex-col px-4 pb-12 pt-24 md:px-8">
        <PromptChat />
      </main>
    </div>
  );
}

