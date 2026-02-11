import { Suspense } from "react";
import CartaoCreditoPageContent from "./page-content";

function CartaoCreditoFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-white/20 bg-white/10 px-12 py-10 text-center shadow-lg">
        <span className="text-xs uppercase tracking-[0.5em] text-fuchsia-400">
          Preparando checkout
        </span>
        <p className="text-sm text-slate-300">
          estamos carregando os detalhes do pagamento. Por favor, aguarde um momento.
        </p>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500" />
        </div>
      </div>
    </div>
  );
}

function BoletoPageContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-2xl">Pagamento por Boleto</h1>
      <p className="text-sm text-slate-300">
        Por favor, siga as instruções para gerar seu boleto.
      </p>
      {/* Adicione mais detalhes sobre o boleto aqui */}
    </div>
  );
}

export default function CartaoCreditoPage() {
  return (
    <Suspense fallback={<CartaoCreditoFallback />}>
      <CartaoCreditoPageContent />
      <BoletoPageContent />
    </Suspense>
  );
}