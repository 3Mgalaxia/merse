import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type SettingOption = {
  value: string;
  label: string;
  description?: string;
};

type SettingDefinition = {
  id: string;
  title: string;
  helper: string;
  options: SettingOption[];
};

const SETTINGS: SettingDefinition[] = [
  {
    id: "visibility",
    title: "Visibilidade das criações",
    helper: "Decida quem pode visualizar suas artes, objetos e prompts gerados na Merse.",
    options: [
      { value: "private", label: "Privado", description: "Somente você acessa o conteúdo." },
      {
        value: "team",
        label: "Compartilhado com equipe",
        description: "Squads autorizadas podem colaborar em tempo real.",
      },
      {
        value: "public",
        label: "Público na galeria Merse",
        description: "Permite destaque na galeria e participar do ranking.",
      },
    ],
  },
  {
    id: "retention",
    title: "Retenção de dados",
    helper: "Quanto tempo guardamos seus assets e logs de geração.",
    options: [
      { value: "30", label: "30 dias (recomendado)" },
      { value: "90", label: "90 dias" },
      { value: "unlimited", label: "Indeterminado", description: "Requer consentimento extra." },
    ],
  },
  {
    id: "training",
    title: "Consentimento para treinamento",
    helper: "Controle o uso das suas criações em melhorias dos modelos Merse.",
    options: [
      { value: "allow-anonymous", label: "Permitir uso anônimo" },
      { value: "per-project", label: "Requerer opt-in por projeto" },
      { value: "never", label: "Nunca compartilhar" },
    ],
  },
];

const OPTIONAL_FLAGS = [
  {
    id: "security-alerts",
    label: "Receber alertas de segurança por e-mail",
    description: "Envia avisos imediatos se houver login ou atividade suspeita.",
  },
  {
    id: "monthly-digest",
    label: "Receber resumo mensal de atividade",
    description: "Um e-mail com insights sobre uso de energia cósmica e projetos executados.",
  },
  {
    id: "third-party",
    label: "Permitir integrações externas aprovadas",
    description: "Autoriza conectores Merse a sincronizar dados com ferramentas de terceiros.",
  },
];

type PreferenceState = Record<string, string>;
type OptionalState = Record<string, boolean>;

const STORAGE_PREFIX = "merse.privacy.";

export default function Privacidade() {
  const { user } = useAuth();
  const userId = useMemo(() => {
    if (user?.email) return user.email.toLowerCase();
    if (user?.uid) return user.uid;
    return "local-user";
  }, [user]);
  const storageKey = `${STORAGE_PREFIX}${userId}`;

  const [preferences, setPreferences] = useState<PreferenceState>({});
  const [optionalFlags, setOptionalFlags] = useState<OptionalState>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          preferences?: PreferenceState;
          optionalFlags?: OptionalState;
        };
        setPreferences(parsed.preferences ?? {});
        setOptionalFlags(parsed.optionalFlags ?? {});
        return;
      }
    } catch {
      // ignore parse errors, fallback to defaults
    }

    const defaults = SETTINGS.reduce<PreferenceState>((acc, setting) => {
      acc[setting.id] = setting.options[0]?.value ?? "";
      return acc;
    }, {});
    setPreferences(defaults);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ preferences, optionalFlags }),
    );
  }, [preferences, optionalFlags, storageKey]);

  const handleSelect = (settingId: string, value: string) => {
    setPreferences((prev) => ({
      ...prev,
      [settingId]: value,
    }));
  };

  const toggleOptional = (flagId: string) => {
    setOptionalFlags((prev) => ({
      ...prev,
      [flagId]: !prev[flagId],
    }));
  };

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("Solicitação de anonimização - Merse");
    const body = encodeURIComponent(
      `Olá, equipe Merse.\n\nGostaria de solicitar a anonimização/remoção dos meus dados associados a ${user?.email ?? "meu perfil"}.\nPor favor, retornem com as próximas etapas.\n\nObrigado.`,
    );
    return `mailto:privacy@merse.gg?subject=${subject}&body=${body}`;
  }, [user?.email]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/70 to-black" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-purple-200/80">Privacidade</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Personalize sua bolha espacial
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Ajuste como suas criações são compartilhadas, quanto tempo ficam armazenadas e quais
              comunicações deseja receber. As escolhas abaixo ficam salvas apenas para a sua conta.
            </p>
          </div>
          <Link
            href="/gerar"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40 hover:bg-white/20"
          >
            Voltar
          </Link>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/10 p-6 text-sm text-white/80 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Conta ativa</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
            <span className="rounded-full border border-purple-300/30 bg-purple-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-purple-100">
              {user?.email ? "Gmail identificado" : "Usuário local"}
            </span>
            <span className="font-semibold text-white">
              {user?.email ?? "Sem e-mail cadastrado"}
            </span>
            {user?.email && (
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                UID: {user?.uid ?? "não informado"}
              </span>
            )}
          </div>
        </section>

        <section className="space-y-6">
          {SETTINGS.map((setting) => {
            const selectedValue = preferences[setting.id] ?? setting.options[0]?.value ?? "";
            return (
              <div
                key={setting.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 backdrop-blur"
              >
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                    {setting.title}
                  </h2>
                  <p className="text-xs text-white/60">{setting.helper}</p>
                </div>
                <ul className="mt-4 space-y-2">
                  {setting.options.map((option) => {
                    const isActive = selectedValue === option.value;
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          onClick={() => handleSelect(setting.id, option.value)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            isActive
                              ? "border-purple-300/60 bg-purple-500/15 text-white shadow-[0_0_18px_rgba(168,85,247,0.3)]"
                              : "border-white/15 bg-black/30 text-white/75 hover:border-purple-200/40 hover:bg-black/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-white">{option.label}</span>
                            <span
                              className={`text-xs uppercase tracking-[0.25em] ${
                                isActive ? "text-purple-200" : "text-white/40"
                              }`}
                            >
                              {isActive ? "Selecionado" : "Selecionar"}
                            </span>
                          </div>
                          {option.description && (
                            <p className="mt-2 text-xs text-white/60">{option.description}</p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
            Preferências opcionais
          </h2>
          <p className="mt-2 text-xs text-white/60">
            Personalize comunicações e integrações adicionais. Todos os itens são opcionais e podem ser
            alterados a qualquer momento.
          </p>
          <div className="mt-4 space-y-3">
            {OPTIONAL_FLAGS.map((flag) => {
              const checked = Boolean(optionalFlags[flag.id]);
              return (
                <label
                  key={flag.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${
                    checked
                      ? "border-purple-300/60 bg-purple-500/15"
                      : "border-white/15 bg-black/30 hover:border-purple-200/40 hover:bg-black/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOptional(flag.id)}
                    className="mt-1 h-5 w-5 rounded border border-white/30 bg-black/50 accent-purple-400"
                  />
                  <span>
                    <span className="text-sm font-medium text-white">{flag.label}</span>
                    <p className="mt-1 text-xs text-white/60">{flag.description}</p>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
            Solicitar anonimização
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Quer remover ou anonimizar todos os dados associados à sua conta? Envie o pedido e um
            Merse Ranger entrará em contato para confirmar sua identidade e concluir o processo.
          </p>
          <a
            href={mailtoHref}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-purple-300/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20"
          >
            Iniciar solicitação
          </a>
        </section>
      </main>
    </div>
  );
}
