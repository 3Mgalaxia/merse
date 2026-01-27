"use client";

type CodexEditorProps = {
  html: string;
  setHtml: (value: string) => void;
  loading: boolean;
  onPreview: () => void;
  isPreviewDirty: boolean;
  onClear: () => void;
};

export default function CodexEditor({
  html,
  setHtml,
  loading,
  onPreview,
  isPreviewDirty,
  onClear,
}: CodexEditorProps) {
  const lineCount = html.split("\n").length;
  const charCount = html.length;
  const isEmpty = html.trim().length === 0;

  return (
    <section className="codex-card codex-editor-card">
      <header className="codex-card__header">
        <div>
          <p className="badge">HTML</p>
          <h3>Editor intergaláctico</h3>
        </div>
        <div className="codex-metrics codex-metrics--with-button">
          <div className="codex-metrics__stats">
            <span>{lineCount} linhas</span>
            <span>{charCount} caracteres</span>
          </div>
          <button
            type="button"
            onClick={onPreview}
            disabled={loading || !isPreviewDirty}
            className="codex-preview-button"
          >
            Atualizar preview
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={loading || isEmpty}
            className="codex-clear-button"
          >
            Limpar editor
          </button>
        </div>
      </header>

      <textarea
        id="codex-editor"
        className="codex-editor"
        value={html}
        onChange={(event) => setHtml(event.target.value)}
        spellCheck={false}
      />

      {loading && <p className="codex-loading">Processando instruções...</p>}
    </section>
  );
}
