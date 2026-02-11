"use client";

import type { CodexMode, CodexProviderHint } from "./api";

type CodexSidebarProps = {
  comando: string;
  setComando: (value: string) => void;
  provider: CodexProviderHint;
  setProvider: (value: CodexProviderHint) => void;
  mode: CodexMode;
  setMode: (value: CodexMode) => void;
  onExecute: () => void;
  loading: boolean;
  status: { message: string; tone: "info" | "success" | "error" } | null;
  history: string[];
  presets: string[];
};

export default function CodexSidebar({
  comando,
  setComando,
  provider,
  setProvider,
  mode,
  setMode,
  onExecute,
  loading,
  status,
  history,
  presets,
}: CodexSidebarProps) {
  return (
    <aside className="codex-card codex-sidebar">
      <div className="codex-sidebar__header">
        <p className="badge">Codex</p>
        <h2>
          Merse <span>Codex Studio</span>
        </h2>
        <p>
          Descreva o ajuste e o motor aplica diretamente no HTML. Use os atalhos para acelerar.
        </p>
      </div>

      <div className="codex-sidebar__section">
        <label htmlFor="codex-comando">Comando</label>
        <textarea
          id="codex-comando"
          className="codex-input"
          placeholder="Ex.: Aumentar contraste do hero e adicionar CTA secundário em outline"
          value={comando}
          onChange={(event) => setComando(event.target.value)}
        />
      </div>

      <div className="codex-sidebar__section">
        <label htmlFor="codex-provider">Motor IA</label>
        <select
          id="codex-provider"
          className="codex-select"
          value={provider}
          onChange={(event) => setProvider(event.target.value as CodexProviderHint)}
          disabled={loading}
        >
          <option value="auto">Auto (Merse + OpenAI fallback)</option>
          <option value="merse">Merse Codex backend</option>
          <option value="openai">OpenAI direto</option>
        </select>
      </div>

      <div className="codex-sidebar__section">
        <label htmlFor="codex-mode">Modo</label>
        <select
          id="codex-mode"
          className="codex-select"
          value={mode}
          onChange={(event) => setMode(event.target.value as CodexMode)}
          disabled={loading}
        >
          <option value="edit">Editar com comando</option>
          <option value="refactor">Refatorar estrutura</option>
          <option value="beautify">Apenas beautify/formatar</option>
        </select>
      </div>

      <div className="codex-sidebar__section">
        <p>Presets rápidos</p>
        <div className="codex-chip-row">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="codex-chip"
              onClick={() => setComando(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <button
        className="codex-button"
        onClick={onExecute}
        disabled={loading}
      >
        {loading ? "Processando..." : "Executar comando"}
      </button>

      {status && (
        <p className={`codex-sidebar__status codex-sidebar__status--${status.tone}`}>
          {status.message}
        </p>
      )}

      {history.length > 0 && (
        <div className="codex-sidebar__section">
          <p>Últimos comandos</p>
          <ul className="codex-history">
            {history.map((item, index) => (
              <li key={`${item}-${index}`}>
                <button type="button" onClick={() => setComando(item)}>
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
