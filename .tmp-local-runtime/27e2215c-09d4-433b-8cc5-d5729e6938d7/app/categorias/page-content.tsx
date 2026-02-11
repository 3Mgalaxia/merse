"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type IgniteProduct = {
  name: string;
  tag: string;
  price: string;
  flavors: string[];
  image?: string;
  imageAlt?: string;
};

const defaultIgniteFlavors = [
  "Icy Mint",
  "Pineapple Ice",
  "Strawberry Kiwi",
  "Watermelon Ice",
];

const flavorPalette: Record<
  string,
  { from: string; to: string; accent: string; text: string }
> = {
  "Icy Mint": {
    from: "#47d7d1",
    to: "#0f1f2d",
    accent: "#47d7d1",
    text: "#041015",
  },
  "Pineapple Ice": {
    from: "#ffd05c",
    to: "#1d1826",
    accent: "#ffd05c",
    text: "#2f1a00",
  },
  "Strawberry Kiwi": {
    from: "#ff6f91",
    to: "#1c2c24",
    accent: "#ff6f91",
    text: "#310313",
  },
  "Watermelon Ice": {
    from: "#ff4d67",
    to: "#1b1424",
    accent: "#ff4d67",
    text: "#3f0a16",
  },
  Menthol: {
    from: "#72f2eb",
    to: "#11212d",
    accent: "#72f2eb",
    text: "#042226",
  },
  "Minty Melon": {
    from: "#8ce39b",
    to: "#11241c",
    accent: "#8ce39b",
    text: "#062111",
  },
  "Strawberry Ice": {
    from: "#ff6b88",
    to: "#241722",
    accent: "#ff6b88",
    text: "#390212",
  },
  "Strawberry Banana": {
    from: "#ffae5f",
    to: "#29161d",
    accent: "#ffae5f",
    text: "#3f2009",
  },
  "Green Apple": {
    from: "#6fe27b",
    to: "#0f1d15",
    accent: "#6fe27b",
    text: "#021604",
  },
};

const hexToRgba = (hex: string, alpha: number): string => {
  const sanitized = hex.replace("#", "");
  const fullHex =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => char + char)
          .join("")
      : sanitized;
  const bigint = parseInt(fullHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const igniteProducts: IgniteProduct[] = [
  {
    name: "Ignite V120",
    tag: "V120",
    price: "R$ 87,90",
    flavors: defaultIgniteFlavors,
  },
  {
    name: "Ignite P100",
    tag: "P100",
    price: "R$ 99,90",
    flavors: defaultIgniteFlavors,
    image: "/pod-descartavel-ignite-p100-green-apple.png.webp",
    imageAlt: "Pod descartável Ignite P100",
  },
  {
    name: "Ignite 28.000",
    tag: "28.000",
    price: "R$ 92,90",
    flavors: ["Menthol", "Minty Melon", "Strawberry Ice", "Strawberry Banana"],
  },
  {
    name: "Ignite V300",
    tag: "V300",
    price: "R$ 94,90",
    flavors: defaultIgniteFlavors,
  },
  {
    name: "Ignite V400",
    tag: "V400",
    price: "R$ 98,90",
    flavors: defaultIgniteFlavors,
    image: "/Pod-Ignite-V400-Mix-40.000-Puffs-Strawberry-Watermelon-Ice-Aloe-Grape.webp",
    imageAlt: "Pod descartável Ignite V400",
  },
  {
    name: "Ignite V400 Mix",
    tag: "V400 MIX",
    price: "R$ 102,90",
    flavors: defaultIgniteFlavors,
  },
  {
    name: "Ignite P100 Refil",
    tag: "P100 Refil",
    price: "R$ 70,90",
    flavors: defaultIgniteFlavors,
  },
];

const fallbackPalette = {
  from: "#ffffff",
  to: "#1c1c1c",
  accent: "#e2e8f0",
  text: "#0f172a",
};

const categories = [
  {
    name: "Elf Bar",
    description: "Sabores intensos com vapor equilibrado e design ergonômico.",
    accent: "from-violet-500/20 to-violet-500/5 border-violet-400/30",
  },
  {
    name: "Ignite",
    description: "Performance potente e acabamento premium para uso diário.",
    accent: "from-fuchsia-500/20 via-purple-500/10 to-sky-500/10 border-fuchsia-400/30",
  },
  {
    name: "Promoções",
    description: "Combos especiais, descontos progressivos e frete diferenciado.",
    accent: "from-sky-500/20 via-cyan-500/10 to-fuchsia-500/10 border-sky-400/30",
  },
  {
    name: "Novidades",
    description: "Lançamentos recentes com tecnologia aprimorada e sabores únicos.",
    accent: "from-sky-500/20 to-sky-500/5 border-sky-400/30",
  },
  {
    name: "Lost Mary",
    description: "Coleção minimalista com foco em autonomia e suavidade.",
    accent: "from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-400/30",
  },
  {
    name: "Geek Bar",
    description: "Inovação e praticidade com opções compactas e recarregáveis.",
    accent: "from-cyan-500/20 to-cyan-500/5 border-cyan-400/30",
  },
];

const initialFlavorSelection = igniteProducts.reduce<Record<string, string>>(
  (accumulator, product) => {
    accumulator[product.tag] = product.flavors[0];
    return accumulator;
  },
  {}
);

const initialSpinState = igniteProducts.reduce<Record<string, number>>(
  (accumulator, product) => {
    accumulator[product.tag] = 0;
    return accumulator;
  },
  {}
);

export default function CategoriasPageContent() {
  const searchParams = useSearchParams();
  const isAuthorized = searchParams.get("auth") === "true";
  const [selectedFlavors, setSelectedFlavors] = useState(initialFlavorSelection);
  const [spinCounts, setSpinCounts] = useState(initialSpinState);

  const handleFlavorSelect = (productTag: string, flavor: string) => {
    setSelectedFlavors((previous) => ({
      ...previous,
      [productTag]: flavor,
    }));
    setSpinCounts((previous) => ({
      ...previous,
      [productTag]: (previous[productTag] ?? 0) + 1,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#01000b] via-[#050321] to-[#071637] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-6 py-12 md:px-12 md:py-16">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition hover:text-fuchsia-200">
            Início
          </Link>
          <span className="text-slate-600">/</span>
          <Link href="/login" className="transition hover:text-fuchsia-200">
            Login
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-fuchsia-200">Categorias</span>
        </nav>

        <header className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/80">
            Coleções 3Mpods
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Escolha sua próxima experiência
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-slate-300">
            Aqui você encontra as principais linhas de pods com curadoria 3Mpods.
            Use os filtros, compare sabores e selecione as promoções que combinam
            com seu estilo de consumo.
          </p>
        </header>

        {!isAuthorized && (
          <section className="flex flex-col gap-4 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-300">
            <span className="text-sm uppercase tracking-[0.3em] text-fuchsia-300/60">
              acesso exclusivo
            </span>
            <h2 className="text-2xl font-semibold text-white">
              Faça login para visualizar as coleções completas
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed">
              A página de categorias fica restrita a clientes autenticados.
              Retorne ao login, valide seu acesso e volte com o link liberado.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/login"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                Voltar para login
              </Link>
              <Link
                href="/categorias?auth=true"
                className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(236,72,153,0.75)] transition hover:shadow-[0_22px_52px_-30px_rgba(56,189,248,0.7)]"
              >
                Visualizar demonstração
              </Link>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/70">
              {isAuthorized ? "Categorias disponíveis" : "Prévia das coleções"}
            </span>
            <h2 className="text-3xl font-semibold text-white">
              {isAuthorized
                ? "Navegue entre marcas, promoções e novidades"
                : "Veja como organizamos nosso catálogo de pods"}
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300">
              {isAuthorized
                ? "Escolha uma categoria para acessar descrições detalhadas, disponibilidade e sugestões de sabores complementares."
                : "Esta visualização demonstra como os pods são agrupados por marca e contexto. Faça login para liberar todos os dados e ações."}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <article
                key={category.name}
                className={`group flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br ${category.accent} p-6 transition hover:border-white/40 hover:shadow-2xl hover:shadow-fuchsia-400/15`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">
                    {category.name}
                  </h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                    {isAuthorized ? "Ver detalhes" : "Exemplo"}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">
                  {category.description}
                </p>
                <div className="mt-auto flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                  <span>{isAuthorized ? "Disponível" : "Pré-visualização"}</span>
                  <span>Sabores 18+</span>
                </div>
                {isAuthorized ? (
                  <Link
                    href="#colecao"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-fuchsia-200 transition hover:text-sky-100"
                  >
                    Ver catálogo →
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-fuchsia-200 transition hover:text-sky-100"
                  >
                    Fazer login para acessar →
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/70">
              Linha Ignite
            </span>
            <h2 className="text-3xl font-semibold text-white">
              Potência, sabores gelados e preço transparente
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300">
              Explore os modelos Ignite com curadoria 3Mpods. Compare preços,
              descubra os sabores disponíveis e escolha o dispositivo ideal para
              a sua rotina.
            </p>
          </div>

          {isAuthorized ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {igniteProducts.map((product) => {
                const activeFlavor =
                  selectedFlavors[product.tag] ?? product.flavors[0];
                const palette = flavorPalette[activeFlavor] ?? fallbackPalette;
                const spinAngle = (spinCounts[product.tag] ?? 0) * 360;
                const reserveHref = `/entrega?${new URLSearchParams({
                  produto: product.name,
                  modelo: product.tag,
                  sabor: activeFlavor,
                }).toString()}`;
                const cardGradient = `radial-gradient(circle at 20% -10%, ${hexToRgba(
                  palette.from,
                  0.45
                )} 0%, transparent 65%), linear-gradient(135deg, ${hexToRgba(
                  palette.from,
                  0.18
                )}, ${hexToRgba(palette.to, 0.65)})`;

                return (
                  <article
                    key={product.tag}
                    className="flex h-full flex-col gap-5 rounded-3xl border bg-slate-950/40 p-6 transition duration-500 hover:-translate-y-1 hover:shadow-2xl"
                    style={{
                      backgroundImage: cardGradient,
                      borderColor: hexToRgba(palette.accent, 0.35),
                      boxShadow: `0 22px 45px -30px ${hexToRgba(
                        palette.accent,
                        0.55
                      )}`,
                    }}
                  >
                    {product.image && (
                      <div
                        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl transition-all duration-500"
                        style={{
                          backgroundImage: `radial-gradient(circle at 30% 20%, ${hexToRgba(
                            palette.from,
                            0.5
                          )}, transparent 68%), linear-gradient(140deg, ${hexToRgba(
                            palette.from,
                            0.12
                          )}, ${hexToRgba(palette.to, 0.5)})`,
                          boxShadow: `inset 0 0 0 1px ${hexToRgba(
                            palette.accent,
                            0.25
                          )}`,
                        }}
                      >
                        <div
                          className="absolute inset-0 transition-transform duration-700 ease-out"
                          style={{ transform: `rotate(${spinAngle}deg)` }}
                        >
                          <Image
                            src={product.image}
                            alt={product.imageAlt ?? product.name}
                            fill
                            className="object-contain p-4 drop-shadow-[0_20px_45px_rgba(15,23,42,0.45)]"
                            sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 80vw"
                            priority={product.tag === "P100"}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-semibold text-white">
                          {product.name}
                        </h3>
                        <span
                          className="text-xs uppercase tracking-[0.3em]"
                          style={{ color: hexToRgba(palette.accent, 0.8) }}
                        >
                          {product.tag}
                        </span>
                      </div>
                      <span
                        className="rounded-full px-4 py-2 text-sm font-semibold"
                        style={{
                          backgroundColor: hexToRgba(palette.accent, 0.2),
                          color: palette.accent,
                          boxShadow: `0 10px 20px -12px ${hexToRgba(
                            palette.accent,
                            0.65
                          )}`,
                        }}
                      >
                        {product.price}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                        Sabores
                      </span>
                      <ul className="flex flex-wrap gap-2 text-sm">
                        {product.flavors.map((flavor) => {
                          const isActive = activeFlavor === flavor;
                          const flavorPaletteValue =
                            flavorPalette[flavor] ?? fallbackPalette;
                          return (
                            <li key={`${product.tag}-${flavor}`}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleFlavorSelect(product.tag, flavor)
                                }
                                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                style={
                                  isActive
                                    ? {
                                        backgroundColor:
                                          flavorPaletteValue.accent,
                                        color: flavorPaletteValue.text,
                                        borderColor:
                                          flavorPaletteValue.accent,
                                        boxShadow: `0 14px 30px -18px ${hexToRgba(
                                          flavorPaletteValue.accent,
                                          0.65
                                        )}`,
                                      }
                                    : {
                                        borderColor: "rgba(255,255,255,0.18)",
                                        backgroundColor:
                                          "rgba(255,255,255,0.06)",
                                        color: "rgba(226,232,240,0.9)",
                                      }
                                }
                              >
                                {flavor}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                      <span>Pronto para uso</span>
                      <span>Estoque 3Mpods</span>
                    </div>
                    <Link
                      href={reserveHref}
                      className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      style={{
                        backgroundColor: palette.accent,
                        color: palette.text,
                        boxShadow: `0 18px 35px -20px ${hexToRgba(
                          palette.accent,
                          0.7
                        )}`,
                      }}
                    >
                      Reservar agora →
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-300">
              <span className="text-sm uppercase tracking-[0.3em] text-fuchsia-300/60">
                Ignite exclusivo
              </span>
              <h3 className="text-2xl font-semibold text-white">
                Acesse sua conta para ver preços e sabores da linha Ignite
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed">
                Liberamos o comparativo completo dos modelos Ignite somente
                após o login. São sete dispositivos com combinações diferentes de
                sabor e capacidade.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Link
                  href="/login"
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
                >
                  Entrar ou cadastrar
                </Link>
                <Link
                  href="/categorias?auth=true"
                  className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-28px_rgba(236,72,153,0.75)] transition hover:shadow-[0_22px_52px_-30px_rgba(56,189,248,0.7)]"
                >
                  Ver demonstração
                </Link>
              </div>
            </div>
          )}
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} 3Mpods. Todos os direitos reservados.</span>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="transition hover:text-fuchsia-200">
              Termos de uso
            </a>
            <a href="#" className="transition hover:text-fuchsia-200">
              Política de privacidade
            </a>
            <a href="#" className="transition hover:text-fuchsia-200">
              Suporte
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
