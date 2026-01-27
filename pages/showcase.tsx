import { useEffect, useMemo, useState } from "react";

type ShowcaseItem = {
  id: string;
  title: string;
  media: "Imagem" | "Video" | "Site" | "3D";
  industry: "Moda" | "Retail" | "Fintech" | "Eventos" | "SaaS" | "Lifestyle" | "Edu" | "Beauty";
  desc: string;
  format: string;
  tags: string[];
  highlights: string[];
  accent: string;
  updatedAt: number;
  likes: number;
  saves: number;
  featured?: boolean;
};

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "neon-lookbook",
    title: "Neon Lookbook",
    media: "Imagem",
    industry: "Moda",
    desc: "Lookbook com poses editoriais, glow controlado e textura high-end.",
    format: "9:16",
    tags: ["Lookbook", "Neon", "Editorial"],
    highlights: ["Tipografia condensada", "Glow em camada dupla", "Contraste para feed"],
    accent: "from-fuchsia-500/45 via-purple-500/20 to-transparent",
    updatedAt: 1725400000,
    likes: 412,
    saves: 126,
    featured: true,
  },
  {
    id: "retail-rotation",
    title: "Retail IA Motion",
    media: "Video",
    industry: "Retail",
    desc: "Vitrine animada com produto girando em 3D e call-to-action dinamico.",
    format: "16:9",
    tags: ["Vitrine", "3D", "Varejo"],
    highlights: ["Loop curto", "CTA com glow", "Foco no produto"],
    accent: "from-cyan-500/40 via-blue-500/20 to-transparent",
    updatedAt: 1725100000,
    likes: 298,
    saves: 92,
  },
  {
    id: "fintech-landing",
    title: "Landing Fintech",
    media: "Site",
    industry: "Fintech",
    desc: "Hero Merse com gradientes cian/roxo e cards de valor.",
    format: "Desktop",
    tags: ["Hero", "Dashboard", "Conversao"],
    highlights: ["CTA principal em destaque", "Cards com blur", "Metricas visuais"],
    accent: "from-indigo-500/40 via-sky-500/20 to-transparent",
    updatedAt: 1725000000,
    likes: 540,
    saves: 210,
  },
  {
    id: "festival-promo",
    title: "Festival Promo",
    media: "Video",
    industry: "Eventos",
    desc: "Teaser curto com ritmo forte e tipografia gigante.",
    format: "9:16",
    tags: ["Teaser", "Eventos", "Energia"],
    highlights: ["Texto pulsante", "Cortes ritmados", "Atmosfera noturna"],
    accent: "from-rose-500/45 via-amber-500/20 to-transparent",
    updatedAt: 1724200000,
    likes: 234,
    saves: 64,
  },
  {
    id: "saas-portal",
    title: "Portal SaaS",
    media: "Site",
    industry: "SaaS",
    desc: "Portal com navegacao por modulos e onboarding em steps.",
    format: "Desktop",
    tags: ["Onboarding", "Modulos", "UX"],
    highlights: ["Fluxo guiado", "Microcopy direto", "Cards com depth"],
    accent: "from-violet-500/40 via-fuchsia-500/18 to-transparent",
    updatedAt: 1723800000,
    likes: 188,
    saves: 52,
  },
  {
    id: "creator-kit",
    title: "Creator Kit",
    media: "Imagem",
    industry: "Lifestyle",
    desc: "Pack de posts com headlines curtas e blend pastel.",
    format: "1:1",
    tags: ["Pack", "Social", "Lifestyle"],
    highlights: ["Hierarquia limpa", "Tags prontos", "Visual leve"],
    accent: "from-emerald-500/35 via-cyan-500/18 to-transparent",
    updatedAt: 1723000000,
    likes: 276,
    saves: 84,
  },
  {
    id: "catalog-3d",
    title: "Catalogo 3D",
    media: "3D",
    industry: "Retail",
    desc: "Produtos flutuando com luz volumetrica e sombra suave.",
    format: "1:1",
    tags: ["Produto", "3D", "Catalogo"],
    highlights: ["Luz volumetrica", "Material metalizado", "Sombras suaves"],
    accent: "from-teal-500/40 via-emerald-500/18 to-transparent",
    updatedAt: 1722500000,
    likes: 312,
    saves: 109,
  },
  {
    id: "edu-launch",
    title: "Edu Launch",
    media: "Video",
    industry: "Edu",
    desc: "Anuncio rapido com ritmo leve e foco no beneficio.",
    format: "16:9",
    tags: ["Educacao", "Video curto", "Beneficios"],
    highlights: ["Narrativa simples", "Icones grandes", "Callout destacado"],
    accent: "from-blue-500/35 via-indigo-500/18 to-transparent",
    updatedAt: 1722000000,
    likes: 164,
    saves: 41,
  },
  {
    id: "beauty-hero",
    title: "Beauty Hero",
    media: "Imagem",
    industry: "Beauty",
    desc: "Hero com textura glossy, glow rosa e tipografia delicada.",
    format: "4:5",
    tags: ["Beauty", "Glow", "Premium"],
    highlights: ["Reflexo glossy", "Cores quentes", "CTA minimal"],
    accent: "from-pink-500/45 via-purple-500/18 to-transparent",
    updatedAt: 1721600000,
    likes: 356,
    saves: 132,
  },
];

const MEDIA_FILTERS = ["Todos", "Imagem", "Video", "Site", "3D"] as const;
const INDUSTRY_FILTERS = [
  "Todos",
  "Moda",
  "Retail",
  "Fintech",
  "Eventos",
  "SaaS",
  "Lifestyle",
  "Edu",
  "Beauty",
] as const;

const SORTS = [
  { id: "recent", label: "Mais recente" },
  { id: "popular", label: "Mais salvo" },
  { id: "liked", label: "Mais curtido" },
] as const;

export default function Showcase() {
  const [mediaFilter, setMediaFilter] = useState<(typeof MEDIA_FILTERS)[number]>("Todos");
  const [industryFilter, setIndustryFilter] = useState<(typeof INDUSTRY_FILTERS)[number]>("Todos");
  const [sortId, setSortId] = useState<(typeof SORTS)[number]["id"]>("recent");
  const [query, setQuery] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const filteredItems = useMemo(() => {
    const base = SHOWCASE_ITEMS.filter((item) => {
      if (onlyFeatured && !item.featured) return false;
      if (mediaFilter !== "Todos" && item.media !== mediaFilter) return false;
      if (industryFilter !== "Todos" && item.industry !== industryFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });

    return base.sort((a, b) => {
      if (sortId === "popular") return b.saves - a.saves;
      if (sortId === "liked") return b.likes - a.likes;
      return b.updatedAt - a.updatedAt;
    });
  }, [mediaFilter, industryFilter, onlyFeatured, query, sortId]);

  const featuredItem = useMemo(
    () => filteredItems.find((item) => item.featured) ?? filteredItems[0] ?? null,
    [filteredItems],
  );

  const activeSelection = useMemo(() => {
    if (!filteredItems.length) return null;
    const match = filteredItems.find((item) => item.id === selectedId);
    return match ?? filteredItems[0];
  }, [filteredItems, selectedId]);

  useEffect(() => {
    setCopyStatus("idle");
  }, [activeSelection?.id]);

  const handleCopyTags = async () => {
    if (!activeSelection) return;
    try {
      await navigator.clipboard.writeText(activeSelection.tags.join(", "));
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1200);
    } catch {
      setCopyStatus("idle");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-6 pb-24 pt-24 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/30 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.16),transparent_58%),radial-gradient(circle_at_30%_75%,rgba(168,85,247,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Showcase Merse</p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Galeria curada de outputs Merse
            </span>
          </h1>
          <p className="max-w-3xl text-sm text-white/70">
            Explore por midia, segmento e clima criativo. Cada case traz um recorte real do visual
            Merse aplicado em campanhas, e-commerce e produtos digitais.
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/70">
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              {filteredItems.length} resultados
            </span>
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              {SHOWCASE_ITEMS.length} cases no total
            </span>
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              atualizado semanalmente
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="relative overflow-hidden rounded-3xl border border-purple-300/20 bg-black/50 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:120px_120px] opacity-20" />
              {featuredItem && (
                <div className={`absolute inset-0 bg-gradient-to-br ${featuredItem.accent} opacity-80`} />
              )}
            </div>
            {featuredItem ? (
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-white/70">
                    Destaque da semana
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-white/60">
                    {featuredItem.media} • {featuredItem.format}
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-white">{featuredItem.title}</h2>
                  <p className="text-sm text-white/75">{featuredItem.desc}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {featuredItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 uppercase tracking-[0.32em]">
                    {featuredItem.industry}
                  </span>
                  <div className="flex items-center gap-4 uppercase tracking-[0.3em] text-[10px] text-white/60">
                    <span>{featuredItem.likes} curtidas</span>
                    <span>{featuredItem.saves} salvos</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(featuredItem.id)}
                  className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-purple-300/40 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(168,85,247,0.35)] transition hover:brightness-[1.08]"
                >
                  Abrir detalhe
                </button>
              </div>
            ) : (
              <div className="relative text-sm text-white/60">
                Nenhum case encontrado. Ajuste os filtros para ver resultados.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-purple-300/20 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="space-y-6">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Buscar por nome ou tag
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                  placeholder="Ex.: neon, 3d, fintech..."
                />
              </label>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Midia</p>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMediaFilter(item)}
                      className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                        mediaFilter === item
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Segmento</p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setIndustryFilter(item)}
                      className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                        industryFilter === item
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/70">
                  <input
                    type="checkbox"
                    checked={onlyFeatured}
                    onChange={(event) => setOnlyFeatured(event.target.checked)}
                    className="h-4 w-4 rounded border border-white/30 bg-black/40"
                  />
                  So destaque
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Ordenar
                  <select
                    value={sortId}
                    onChange={(event) => setSortId(event.target.value as typeof sortId)}
                    className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                  >
                    {SORTS.map((sort) => (
                      <option key={sort.id} value={sort.id}>
                        {sort.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMediaFilter("Todos");
                  setIndustryFilter("Todos");
                  setSortId("recent");
                  setQuery("");
                  setOnlyFeatured(false);
                }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Selecao curada</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-white/60">
              mostrando {filteredItems.length} case(s)
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.length === 0 && (
              <div className="rounded-3xl border border-purple-300/20 bg-black/40 p-6 text-sm text-white/60">
                Nenhum case encontrado. Ajuste os filtros ou limpe a busca.
              </div>
            )}
            {filteredItems.map((item) => {
              const isActive = activeSelection?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`group relative w-full overflow-hidden rounded-2xl border bg-black/40 p-5 text-left shadow-[0_14px_48px_rgba(0,0,0,0.5)] transition ${
                    isActive
                      ? "border-purple-300/60"
                      : "border-purple-300/20 hover:-translate-y-1 hover:border-purple-200/40"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-70`} />
                  <div className="relative space-y-3">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.32em] text-white/60">
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1">
                        {item.media}
                      </span>
                      <span>{item.format}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-white/70">{item.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/15 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-[0.28em] text-white/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/50">
                      <span>{item.industry}</span>
                      <span>{item.saves} saves</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {activeSelection && (
          <section className="relative overflow-hidden rounded-3xl border border-purple-300/20 bg-black/50 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${activeSelection.accent} opacity-50`} />
            <div className="relative grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/60">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                    {activeSelection.media}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                    {activeSelection.industry}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                    {activeSelection.format}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-white">{activeSelection.title}</h3>
                <p className="text-sm text-white/70">{activeSelection.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {activeSelection.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/60">
                  <span>{activeSelection.likes} curtidas</span>
                  <span>{activeSelection.saves} salvos</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopyTags}
                    className="rounded-full border border-purple-300/40 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-purple-200/60"
                  >
                    {copyStatus === "copied" ? "Tags copiadas" : "Copiar tags"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
                  >
                    Salvar no board
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-purple-300/20 bg-black/40 p-4 text-sm text-white/70">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Highlights</p>
                  <ul className="mt-3 space-y-2">
                    {activeSelection.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-purple-300/20 bg-black/40 p-4 text-sm text-white/70">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Sugestao</p>
                  <p className="mt-2">
                    Use este case como base e troque apenas a paleta e o CTA para manter consistencia
                    em campanhas futuras.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
