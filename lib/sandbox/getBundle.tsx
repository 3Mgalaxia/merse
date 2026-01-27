import React from "react";
import { adminDb } from "@/lib/firebaseAdmin";

type BundleResult = {
  Main: React.ComponentType;
};

async function fetchCodeFromUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function getProjectBundle(projectId: string): Promise<BundleResult | null> {
  const snap = await adminDb.collection("site_projects").doc(projectId).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};

  // Prefer arquivos do bundle salvo no storage (R2)
  const assetsBuild = data.assets?.build ?? {};
  const pageEntry = assetsBuild["pages/app/page.tsx"];
  const layoutEntry = assetsBuild["pages/app/layout.tsx"];
  const heroEntry = assetsBuild["components/Hero.tsx"];
  const featuresEntry = assetsBuild["components/Features.tsx"];
  const contatoEntry = assetsBuild["components/Contato.tsx"];
  const cssEntry = assetsBuild["styles/global.css"];

  const [pageCode, layoutCode, heroCode, featuresCode, contatoCode, cssCode] = await Promise.all([
    fetchCodeFromUrl(pageEntry?.url),
    fetchCodeFromUrl(layoutEntry?.url),
    fetchCodeFromUrl(heroEntry?.url),
    fetchCodeFromUrl(featuresEntry?.url),
    fetchCodeFromUrl(contatoEntry?.url),
    fetchCodeFromUrl(cssEntry?.url),
  ]);

  const bundle = data.assets?.build?.bundle ?? data.buildBundle ?? "";

  const Main = () => (
    <div className="min-h-screen bg-[#03030b] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Preview sandbox Merse</p>
          <h1 className="text-2xl font-semibold text-white">Bundle gerado</h1>
          <p className="text-sm text-white/70">
            Este modo mantém o código dentro da Merse. Integração de execução dinâmica pode ser habilitada depois.
          </p>
        </div>
        {pageCode && (
          <pre className="max-h-[30vh] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
            {pageCode}
          </pre>
        )}
        {layoutCode && (
          <pre className="max-h-[20vh] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
            {layoutCode}
          </pre>
        )}
        {(heroCode || featuresCode || contatoCode) && (
          <div className="grid gap-3 md:grid-cols-2">
            {heroCode && (
              <pre className="max-h-[30vh] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
                {heroCode}
              </pre>
            )}
            {featuresCode && (
              <pre className="max-h-[30vh] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
                {featuresCode}
              </pre>
            )}
            {contatoCode && (
              <pre className="max-h-[30vh] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
                {contatoCode}
              </pre>
            )}
          </div>
        )}
        {cssCode && (
          <pre className="max-h-[20vh] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
            {cssCode}
          </pre>
        )}
        {!pageCode && !bundle && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-100">
            Nenhum bundle disponível ainda para este projeto.
          </div>
        )}
        {bundle && !pageCode && (
          <pre className="max-h-[60vh] overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
            {bundle.slice(0, 8000)}
          </pre>
        )}
      </div>
    </div>
  );

  return { Main };
}
