"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const deliveryOptions = [
  {
    id: "premium",
    title: "Entrega Premium",
    description:
      "Prioridade máxima no despacho. Seu pod entra na frente da fila e chega o quanto antes.",
    eta: "Previsão: até 24h úteis",
    priceNote: "+ R$ 14,90 sobre a entrega normal",
  },
  {
    id: "normal",
    title: "Entrega Normal",
    description:
      "Cumpre a fila padrão de pedidos com custo reduzido, ideal para quem pode esperar um pouco mais.",
    eta: "Previsão: 2 a 4 dias úteis",
    priceNote: "Frete econômico",
  },
];

const paymentOptions = [
  { id: "debito", label: "Cartão de Débito" },
  { id: "credito", label: "Cartão de Crédito" },
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro na entrega" },
];

export default function EntregaPageContent() {
  const searchParams = useSearchParams();
  const produto = searchParams.get("produto") ?? "Ignite";
  const modelo = searchParams.get("modelo") ?? "Modelo personalizado";
  const sabor = searchParams.get("sabor") ?? "Sabores variados";

  const [deliveryType, setDeliveryType] = useState<string>("premium");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [location, setLocation] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDelivery = useMemo(
    () => deliveryOptions.find((option) => option.id === deliveryType),
    [deliveryType]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!location.trim()) {
      setError("Informe a localização para prosseguir com a reserva.");
      return;
    }
    setError(null);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#01000b] via-[#060328] to-[#07183a] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-14 px-6 py-12 md:px-12 md:py-16">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition hover:text-fuchsia-200">
            Início
          </Link>
          <span className="text-slate-600">/</span>
          <Link href="/categorias?auth=true" className="transition hover:text-fuchsia-200">
            Categorias
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-fuchsia-200">Entrega</span>
        </nav>

        <header className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/80">
            Confirmar reserva
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Escolha delivery e pagamento
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-300">
            Finalize a reserva definindo a prioridade de entrega, forma de pagamento e sua
            localização. Em seguida, nossa equipe confirma a disponibilização do pedido.
          </p>
        </header>

        <section className="grid gap-10 rounded-3xl bg-white/5 p-8 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-white">Entrega</h2>
              <div className="grid gap-4">
                {deliveryOptions.map((option) => {
                  const isActive = deliveryType === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`cursor-pointer rounded-2xl border p-5 transition ${
                        isActive
                          ? "border-fuchsia-300/70 bg-fuchsia-500/10 shadow-lg shadow-fuchsia-500/15"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <input
                            type="radio"
                            name="delivery"
                            value={option.id}
                            checked={isActive}
                            onChange={() => setDeliveryType(option.id)}
                            className="h-4 w-4 cursor-pointer accent-fuchsia-300"
                          />
                          <div className="flex flex-col">
                            <span className="text-base font-semibold text-white">
                              {option.title}
                            </span>
                            <p className="text-sm text-slate-300">{option.description}</p>
                          </div>
                        </div>
                        <div className="min-w-[120px] text-right text-xs uppercase tracking-[0.2em] text-fuchsia-200/80">
                          <p>{option.eta}</p>
                          <p className="text-fuchsia-200">{option.priceNote}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-white">Pagamento</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {paymentOptions.map((option) => {
                  const isActive = paymentMethod === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${
                        isActive
                          ? "border-fuchsia-300/70 bg-fuchsia-500/15 shadow-lg shadow-fuchsia-500/15"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value={option.id}
                          checked={isActive}
                          onChange={() => setPaymentMethod(option.id)}
                          className="h-4 w-4 cursor-pointer accent-fuchsia-300"
                        />
                        <span className="text-sm font-medium text-white">{option.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white">Localização</h2>
              <p className="text-sm text-slate-300">
                Informe o endereço ou marque um ponto de retirada para sabermos onde entregar seu
                pod.
              </p>
              <textarea
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Rua, número, complemento, bairro, cidade..."
                className="min-h-[120px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-fuchsia-300 focus:outline-none"
              />
              {error && <span className="text-sm text-rose-300">{error}</span>}
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(236,72,153,0.75)] transition hover:shadow-[0_22px_52px_-30px_rgba(56,189,248,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-100"
            >
              Confirmar reserva
            </button>
          </form>

          <aside className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/70">
                Pedido selecionado
              </span>
              <h2 className="text-2xl font-semibold text-white">{produto}</h2>
              <p className="text-sm text-slate-300">
                Modelo <span className="font-medium text-white">{modelo}</span> na cor/sabor{" "}
                <span className="font-medium text-white">{sabor}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">
                  Tipo de entrega
                </span>
                <p className="text-sm font-medium text-white">
                  {selectedDelivery?.title ?? "Selecionar"}
                </p>
                <p className="text-xs text-slate-400">{selectedDelivery?.eta}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">
                  Pagamento
                </span>
                <p className="text-sm font-medium capitalize text-white">
                  {paymentOptions.find((option) => option.id === paymentMethod)?.label ??
                    "Selecionar"}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">
                  Localização
                </span>
                <p className="text-sm text-slate-300">
                  {location.trim() ? location : "Preencha o endereço para estimar o frete."}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Após confirmar, nossa equipe enviará um resumo com o valor final do pedido e o link
              para pagamento (Pix ou cartão) ou instruções para pagamento presencial em dinheiro.
            </p>

            {isSubmitted && (
              <div className="rounded-2xl border border-fuchsia-300/50 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100">
                <p className="font-medium text-white">Reserva recebida!</p>
                <p>
                  Em instantes você receberá um contato via e-mail/WhatsApp com a confirmação da
                  entrega e instruções de pagamento.
                </p>
                <Link
                  href="/categorias?auth=true"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-200 transition hover:text-sky-100"
                >
                  Voltar para catálogo →
                </Link>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
