import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Endpoint = {
  id: string;
  name: string;
  path: string;
  category: "Imagem" | "Video" | "3D" | "Site" | "Identidade";
  desc: string;
  tags: string[];
  fields: Array<{ name: string; desc: string }>;
  payload: {
    json: string;
    js: string;
  };
  responseHint: string;
  accent: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    id: "generate-image",
    name: "Imagem",
    path: "/api/generate-image",
    category: "Imagem",
    desc: "Gere renders cinematograficos com OpenAI/Replicate. Aceita aspect ratio e imagem de referencia.",
    tags: ["POST", "JSON", "Renders"],
    fields: [
      { name: "prompt", desc: "descricao da cena" },
      { name: "provider", desc: "openai | flux | merse | runway-gen4" },
      { name: "count", desc: "quantidade de imagens" },
      { name: "aspectRatio", desc: "16:9, 3:2, 1:1..." },
    ],
    payload: {
      json: `{
  "prompt": "heroina cyberpunk em neon",
  "provider": "openai",
  "count": 1,
  "aspectRatio": "16:9"
}`,
      js: `{
  prompt: "heroina cyberpunk em neon",
  provider: "openai",
  count: 1,
  aspectRatio: "16:9",
}`,
    },
    responseHint: "Retorna { images: string[], provider, usage }",
    accent: "from-purple-500/40 via-fuchsia-500/20 to-transparent",
  },
  {
    id: "generate-video",
    name: "Video",
    path: "/api/generate-video",
    category: "Video",
    desc: "Gere videos curtos com Veo/Sora/Merse. Controle duracao e aspecto.",
    tags: ["POST", "JSON", "Video"],
    fields: [
      { name: "prompt", desc: "descricao da sequencia" },
      { name: "provider", desc: "veo | sora | merse | wan | kling" },
      { name: "duration", desc: "4 a 20 segundos" },
      { name: "aspectRatio", desc: "16:9 ou 9:16" },
    ],
    payload: {
      json: `{
  "prompt": "teaser futurista com luz volumetrica",
  "provider": "veo",
  "duration": 6,
  "aspectRatio": "16:9"
}`,
      js: `{
  prompt: "teaser futurista com luz volumetrica",
  provider: "veo",
  duration: 6,
  aspectRatio: "16:9",
}`,
    },
    responseHint: "Retorna { videos: string[], covers?: string[], duration }",
    accent: "from-cyan-500/40 via-blue-500/20 to-transparent",
  },
  {
    id: "generate-object",
    name: "Objetos 3D",
    path: "/api/generate-object",
    category: "3D",
    desc: "Renderize objetos com material e iluminacao Merse.",
    tags: ["POST", "JSON", "3D"],
    fields: [
      { name: "prompt", desc: "descricao do produto" },
      { name: "material", desc: "metallic | matte | holographic | organic" },
      { name: "lighting", desc: "studio | galaxy | cyberpunk | daylight" },
      { name: "detail", desc: "nivel 0-100" },
    ],
    payload: {
      json: `{
  "prompt": "speaker futurista com grade hexagonal",
  "material": "metallic",
  "lighting": "studio",
  "detail": 70
}`,
      js: `{
  prompt: "speaker futurista com grade hexagonal",
  material: "metallic",
  lighting: "studio",
  detail: 70,
}`,
    },
    responseHint: "Retorna { renders: string[], format?, angle? }",
    accent: "from-emerald-500/35 via-teal-500/20 to-transparent",
  },
  {
    id: "generate-site",
    name: "Site IA",
    path: "/api/generate-site",
    category: "Site",
    desc: "HTML Merse-ready para landings e seções futuristas via modelo da Replicate.",
    tags: ["POST", "JSON", "HTML"],
    fields: [
      { name: "prompt", desc: "descricao do site" },
      { name: "industry", desc: "opcional, ajuda a guiar o layout" },
    ],
    payload: {
      json: `{
  "prompt": "landing fintech neon com CTA para app",
  "industry": "fintech"
}`,
      js: `{
  prompt: "landing fintech neon com CTA para app",
  industry: "fintech",
}`,
    },
    responseHint: "Retorna { html, sections?, assets? }",
    accent: "from-indigo-500/40 via-sky-500/20 to-transparent",
  },
  {
    id: "gender-swap",
    name: "Troca de Genero",
    path: "/api/gender-swap",
    category: "Identidade",
    desc: "Swap de genero preservando rosto e iluminacao. Envie a foto em base64.",
    tags: ["POST", "JSON", "Face"],
    fields: [
      { name: "image", desc: "base64 da foto" },
      { name: "targetGender", desc: "feminino | masculino" },
    ],
    payload: {
      json: `{
  "image": "data:image/png;base64,<base64-da-foto>",
  "targetGender": "feminino"
}`,
      js: `{
  image: "data:image/png;base64,<base64-da-foto>",
  targetGender: "feminino",
}`,
    },
    responseHint: "Retorna { imageUrl, provider }",
    accent: "from-rose-500/40 via-pink-500/20 to-transparent",
  },
];

const BASE_URLS = [
  { id: "local", label: "Local", value: "http://localhost:3000" },
  { id: "prod", label: "Producao", value: "https://seu-dominio.com" },
] as const;

const LANGUAGES = [
  { id: "curl", label: "cURL" },
  { id: "js", label: "JS" },
  { id: "ts", label: "TS" },
] as const;

const CATEGORY_FILTERS = ["Todos", "Imagem", "Video", "3D", "Site", "Identidade"] as const;

export default function DevHub() {
  const [baseId, setBaseId] = useState<(typeof BASE_URLS)[number]["id"]>("local");
  const [languageId, setLanguageId] = useState<(typeof LANGUAGES)[number]["id"]>("curl");
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>("Todos");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(ENDPOINTS[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl = useMemo(
    () => BASE_URLS.find((item) => item.id === baseId)?.value ?? BASE_URLS[0].value,
    [baseId],
  );

  const filtered = useMemo(() => {
    return ENDPOINTS.filter((item) => {
      if (category !== "Todos" && item.category !== category) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        item.path.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  const activeEndpoint = useMemo(() => {
    const match = filtered.find((item) => item.id === selectedId);
    return match ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  useEffect(() => {
    if (activeEndpoint) {
      setSelectedId(activeEndpoint.id);
    }
  }, [activeEndpoint]);

  const buildSample = (endpoint: Endpoint) => {
    if (languageId === "curl") {
      return `curl -X POST ${baseUrl}${endpoint.path} \\\n  -H "Content-Type: application/json" \\\n  -d '${endpoint.payload.json}'`;
    }
    const payload = endpoint.payload.js;
    const body = `const payload = ${payload}\n\nconst response = await fetch("${baseUrl}${endpoint.path}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(payload),\n});\n\nconst data = await response.json();\nconsole.log(data);`;
    if (languageId === "ts") {
      return `type Response = unknown;\n\n${body.replace(
        "const data = await response.json();",
        "const data = (await response.json()) as Response;",
      )}`;
    }
    return body;
  };

  const handleCopy = async () => {
    if (!activeEndpoint) return;
    try {
      await navigator.clipboard.writeText(buildSample(activeEndpoint));
      setCopiedKey(`${activeEndpoint.id}-${languageId}`);
      window.setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      setCopiedKey(null);
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">Dev Hub</p>
              <h1 className="text-3xl font-semibold md:text-4xl">
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                  APIs Merse com exemplos rapidos
                </span>
              </h1>
            </div>
            <Link
              href="/status"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/20"
            >
              Ver status
            </Link>
          </div>
          <p className="max-w-3xl text-sm text-white/70">
            Escolha ambiente, linguagem e copie o sample. Tudo pronto para testar em minutos.
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/70">
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              {ENDPOINTS.length} endpoints
            </span>
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              base {baseUrl}
            </span>
            <span className="rounded-full border border-purple-300/20 bg-white/10 px-4 py-1">
              sem SDK, so fetch
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-purple-300/20 bg-black/45 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="space-y-6">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Buscar endpoint
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-purple-300/20 bg-black/40 px-4 py-3 text-sm text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                  placeholder="Ex.: imagem, 3d, site..."
                />
              </label>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Ambiente</p>
                <div className="flex flex-wrap gap-2">
                  {BASE_URLS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBaseId(item.id)}
                      className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                        baseId === item.id
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Linguagem</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLanguageId(item.id)}
                      className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                        languageId === item.id
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                        category === item
                          ? "border-purple-300/60 bg-purple-500/15 text-white"
                          : "border-purple-300/20 bg-white/5 text-white/60 hover:border-purple-200/40 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategory("Todos");
                  setQuery("");
                  setLanguageId("curl");
                  setBaseId("local");
                }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Reset rapido
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-purple-300/20 bg-black/50 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            {activeEndpoint ? (
              <>
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${activeEndpoint.accent} opacity-70`} />
                <div className="relative space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-white/70">
                      {activeEndpoint.category}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-white/60">
                      {activeEndpoint.path}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{activeEndpoint.name}</h2>
                    <p className="text-sm text-white/70">{activeEndpoint.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/60">
                    {activeEndpoint.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/15 bg-black/40 px-3 py-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-purple-300/20 bg-black/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                      <span>Sample ({languageId})</span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="rounded-full border border-purple-300/40 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-purple-200/60"
                      >
                        {copiedKey === `${activeEndpoint.id}-${languageId}` ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <pre className="mt-3 overflow-auto rounded-xl border border-purple-300/20 bg-black/60 p-3 text-xs text-white/80">
                      {buildSample(activeEndpoint)}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-purple-300/20 bg-black/40 p-4 text-sm text-white/70">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Campos base</p>
                    <ul className="mt-3 space-y-2">
                      {activeEndpoint.fields.map((field) => (
                        <li key={field.name} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                          <span>
                            <span className="font-semibold text-white">{field.name}</span> — {field.desc}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                    {activeEndpoint.responseHint}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-white/60">
                Nenhum endpoint encontrado. Ajuste os filtros.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Endpoints ativos</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-white/60">
              {filtered.length} resultado(s)
            </span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((endpoint) => (
              <button
                key={endpoint.id}
                type="button"
                onClick={() => setSelectedId(endpoint.id)}
                className={`group relative w-full overflow-hidden rounded-2xl border bg-black/40 p-5 text-left shadow-[0_14px_48px_rgba(0,0,0,0.5)] transition ${
                  selectedId === endpoint.id
                    ? "border-purple-300/60"
                    : "border-purple-300/20 hover:-translate-y-1 hover:border-purple-200/40"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${endpoint.accent} opacity-70`} />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.32em] text-white/60">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1">
                      {endpoint.category}
                    </span>
                    <span>{endpoint.path}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{endpoint.name}</h3>
                  <p className="text-sm text-white/70">{endpoint.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {endpoint.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/15 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-[0.28em] text-white/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
