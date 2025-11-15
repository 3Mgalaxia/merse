"use client";

type CodexEditorProps = {
  html: string;
  setHtml: (value: string) => void;
  loading: boolean;
};

export default function CodexEditor({ html, setHtml, loading }: CodexEditorProps) {
  const lineCount = html.split("\n").length;
  const charCount = html.length;

  return (
    <section className="codex-card codex-editor-card">
      <header className="codex-card__header">
        <div>
          <p className="badge">HTML</p>
          <h3>Editor intergaláctico</h3>
        </div>
        <div className="codex-metrics">
          <span>{lineCount} linhas</span>
          <span>{charCount} caracteres</span>
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
