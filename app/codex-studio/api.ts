import { firebaseAuth } from "@/lib/firebase";

export type CodexProviderHint = "auto" | "merse" | "openai";
export type CodexMode = "edit" | "refactor" | "beautify";

type CodexPayload = {
  html: string;
  comando: string;
  provider?: CodexProviderHint;
  mode?: CodexMode;
};

export type CodexEditResponse = {
  htmlAtualizado?: string;
  html?: string;
  provider?: "merse-codex" | "openai";
  mode?: CodexMode;
  providersTried?: string[];
  fallbackUsed?: boolean;
  logs?: string;
};

type ConsumeResponse = {
  success: true;
  remainingCredits: number;
  deducted: number;
};

type ConsumeError = Error & { reason?: string };

export async function callCodexEdit({ html, comando, provider, mode }: CodexPayload) {
  const response = await fetch("/api/codex/edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html, comando, provider, mode }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "Não foi possível conversar com o Merse Codex agora.";
    throw new Error(message);
  }

  return data as CodexEditResponse;
}

export async function consumeCodexCredits({ html, length }: { html: string; length?: number }) {
  const token = await firebaseAuth?.currentUser?.getIdToken();
  if (!token) {
    const error = new Error("Faça login para usar o Merse Codex.") as ConsumeError;
    error.reason = "AUTH_REQUIRED";
    throw error;
  }

  const response = await fetch("/api/codex/consume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, html, length }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success !== true) {
    const reason: string = data?.reason ?? "SERVER_ERROR";
    const error = new Error(mapReasonToMessage(reason)) as ConsumeError;
    error.reason = reason;
    throw error;
  }

  return data as ConsumeResponse;
}

function mapReasonToMessage(reason: string) {
  switch (reason) {
    case "NO_PLAN":
      return "Contrate um plano Pulse Starter ou Nebula para liberar o Codex.";
    case "NO_CREDITS":
      return "Seus créditos acabaram. Visite a página de planos para recarregar.";
    case "NO_TOKEN":
    case "UNAUTHORIZED":
      return "Autenticação inválida. Entre novamente para continuar.";
    case "USER_NOT_FOUND":
      return "Usuário não encontrado. Verifique sua conta.";
    default:
      return "Não foi possível reservar energia cósmica agora.";
  }
}
