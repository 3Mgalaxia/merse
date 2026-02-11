import { Suspense } from "react";
import CategoriasPageContent from "./page-content";

function CategoriasFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#01000b] via-[#050321] to-[#071637] text-white">
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-white/20 bg-white/10 px-12 py-10 text-center shadow-lg transition-transform transform hover:scale-105">
        <span className="text-xs uppercase tracking-[0.5em] text-fuchsia-400 animate-pulse">
          Carregando catálogo...
        </span>
        <p className="max-w-md text-sm text-slate-300">
          Estamos preparando as coleções de pods da 3Mpods. Por favor, aguarde um momento.
        </p>
        <div className="h-2 w-48 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-sky-600" />
        </div>
      </div>
    </div>
  );
}

export default function CategoriasPage() {
  return (
    <Suspense fallback={<CategoriasFallback />}>
      <CategoriasPageContent />
    </Suspense>
  );
}