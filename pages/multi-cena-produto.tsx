import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiImageSquareFill, PiUploadSimpleFill } from "react-icons/pi";

const packs = [3, 6, 9];
const sceneStyles = [
  "estúdio premium com luz lateral",
  "ambiente urbano noturno",
  "setup minimalista com fundo infinito",
  "mesa editorial com textura sofisticada",
  "cenário futurista com hologramas",
  "plano detalhe macro com reflexo",
];

export default function MultiCenaProdutoPage() {
  const [brief, setBrief] = useState("Produto tecnológico em campanha premium para público jovem adulto.");
  const [packSize, setPackSize] = useState(6);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const scenes = useMemo(() => {
    return Array.from({ length: packSize }).map((_, index) => {
      return {
        id: `scene-${index}`,
        name: `Cena ${index + 1}`,
        style: sceneStyles[index % sceneStyles.length],
        prompt: `${brief} | variação ${index + 1} com foco em ${sceneStyles[index % sceneStyles.length]}.`,
      };
    });
  }, [brief, packSize]);

  function handleSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Multi-Cena Produto</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Novo fluxo para transformar um único produto em um pacote completo de cenas comerciais.
        </p>

        <section className="grid gap-5 rounded-3xl border border-white/10 bg-black/60 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-[0.3em] text-white/65">Brief criativo</label>
            <textarea
              rows={4}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              className="w-full resize-none rounded-2xl border border-white/20 bg-black/55 p-4 text-sm text-white outline-none"
            />

            <div className="flex flex-wrap gap-2">
              {packs.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPackSize(size)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.28em] transition ${
                    packSize === size
                      ? "border-emerald-300/45 bg-emerald-500/15 text-emerald-100"
                      : "border-white/20 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {size} cenas
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/75">
              <PiUploadSimpleFill />
              escolher arquivo
              <input type="file" accept="image/*" onChange={handleSelectFile} className="hidden" />
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/55 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-white/55">Imagem de referência</p>
              {previewUrl ? (
                <img src={previewUrl} alt="preview produto" className="mt-3 h-44 w-full rounded-xl object-cover" />
              ) : (
                <div className="mt-3 flex h-44 items-center justify-center rounded-xl border border-dashed border-white/20 text-sm text-white/45">
                  sem imagem selecionada
                </div>
              )}
              {selectedFileName && <p className="mt-3 text-sm text-white/70">{selectedFileName}</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {scenes.map((scene) => (
            <article
              key={scene.id}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{scene.name}</h3>
                <PiImageSquareFill className="text-emerald-200/80" />
              </div>
              <p className="mt-3 text-sm text-white/70">{scene.style}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/78">{scene.prompt}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
