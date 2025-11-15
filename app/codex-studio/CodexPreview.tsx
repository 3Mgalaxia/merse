"use client";

type CodexPreviewProps = {
  html: string;
  viewMode: "desktop" | "mobile";
  setViewMode: (mode: "desktop" | "mobile") => void;
};

export default function CodexPreview({ html, viewMode, setViewMode }: CodexPreviewProps) {
  return (
    <section className="codex-card codex-preview-card">
      <header className="codex-card__header codex-card__header--preview">
        <div>
          <p className="badge">Preview</p>
          <h3>Como ficou o layout</h3>
        </div>
        <div className="codex-view-toggle">
          <button
            type="button"
            className={viewMode === "desktop" ? "is-active" : ""}
            onClick={() => setViewMode("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={viewMode === "mobile" ? "is-active" : ""}
            onClick={() => setViewMode("mobile")}
          >
            Mobile
          </button>
        </div>
      </header>

      <div className={`codex-preview-frame codex-preview-frame--${viewMode}`}>
        <iframe title="Codex preview" srcDoc={html} />
      </div>
    </section>
  );
}
