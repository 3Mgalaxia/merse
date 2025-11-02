import Link from "next/link";
import PromptChat from "@/components/PromptChat";

export default function ChatPage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <Link
        href="/gerar"
        className="absolute left-6 top-6 z-20 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>
      <PromptChat />
    </div>
  );
}
