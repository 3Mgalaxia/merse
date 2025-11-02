import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  PiArrowsClockwiseBold,
  PiDownloadSimpleFill,
  PiGenderFemaleFill,
  PiGenderMaleFill,
  PiLightningFill,
  PiSparkleFill,
  PiUploadSimpleFill,
  PiWavesFill,
} from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";
import MerseLoadingOverlay from "@/components/MerseLoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import {
  appendUserCreations,
  generateCreationId,
  getUserStorageKey,
} from "@/lib/creations";

type TargetGender = "masculino" | "feminino";

const DEFAULT_PROMPTS: Record<TargetGender, string> = {
  masculino: "Converter foto para versão masculina com traços naturais, iluminação suave, manter coloração de pele",
  feminino: "Converter foto para versão feminina com traços suaves, iluminação suave, manter coloração de pele",
};

type Transformation = {
  id: string;
  userId: string;
  original: string;
  targetGender: TargetGender;
  result: string;
  prompt: string;
  intensity: number;
  createdAt: string;
};

const DATA_SOURCE = "/gender-swap.json";
const CURRENT_USER_FALLBACK = "demo-user";
const COST_PER_TRANSFORM = 8;

export default function TrocarGeneros() {
  const energy = useEnergy();
  const { user } = useAuth();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [referencePayload, setReferencePayload] = useState<string | undefined>();
  const [targetGender, setTargetGender] = useState<TargetGender>("masculino");
  const [intensity, setIntensity] = useState<number>(65);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPTS.masculino);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Transformation[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const usageExceeds = useMemo(
    () => energy.usage + COST_PER_TRANSFORM > energy.limit,
    [energy.limit, energy.usage],
  );

  const userKey = useMemo(
    () => getUserStorageKey(user?.email ?? undefined, user?.uid ?? undefined),
    [user?.email, user?.uid],
  );

  const currentUserId = useMemo(
    () => user?.uid ?? CURRENT_USER_FALLBACK,
    [user?.uid],
  );

  useEffect(() => {
    fetch(DATA_SOURCE)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar histórico de transformações.");
        }
        const data = (await response.json()) as { transformations?: Transformation[] };
        setHistory(data.transformations?.filter((item) => item.userId === currentUserId) ?? []);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [currentUserId]);

  useEffect(() => {
    setPrompt((prev) => {
      const otherDefault =
        targetGender === "masculino" ? DEFAULT_PROMPTS.feminino : DEFAULT_PROMPTS.masculino;
      return prev === otherDefault || prev.trim().length === 0
        ? DEFAULT_PROMPTS[targetGender]
        : prev;
    });
  }, [targetGender]);

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedImage(result);
      setReferencePayload(result);
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setReferencePayload(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!referencePayload) {
      setError("Envie uma foto para realizar a transformação.");
      return;
    }
    if (usageExceeds) {
      setError("Energia insuficiente. Você já atingiu o limite do seu plano.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const response = await fetch("/api/gender-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetGender,
          intensity,
          prompt,
          image: referencePayload,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar a transformação.");
      }

      if (!data.imageUrl) {
        throw new Error("A resposta não trouxe a imagem transformada. Tente novamente.");
      }

      setResultImage(data.imageUrl);
      energy.registerUsage(COST_PER_TRANSFORM);

      await appendUserCreations(
        userKey,
        [
          {
            id: generateCreationId("image"),
            type: "image",
            prompt,
            createdAt: new Date().toISOString(),
            previewUrl: data.imageUrl,
            downloadUrl: data.imageUrl,
            meta: {
              genero: targetGender,
              intensidade: intensity,
            },
          },
        ],
        { userId: user?.uid },
      );

      const newEntry: Transformation = {
        id: `history-${Date.now()}`,
        userId: currentUserId,
        original: uploadedImage ?? referencePayload,
        targetGender,
        result: data.imageUrl,
        prompt,
        intensity,
        createdAt: new Date().toISOString(),
      };
      setHistory((prev) => [newEntry, ...prev]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Geração cancelada.");
      } else if ((err as Error)?.name === "AbortError") {
        setError("Geração cancelada.");
      } else {
        const message = err instanceof Error ? err.message : "Erro inesperado ao gerar a transformação.";
        setError(message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setError("Geração cancelada.");
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.2),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[480px] bg-[radial-gradient(circle_at_60%_30%,rgba(236,72,153,0.32),transparent_60%),radial-gradient(circle_at_25%_35%,rgba(14,165,233,0.28),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-pink-200/80">Merse Identity Lab</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              Troque gênero e estilo com um clique
            </h1>
            <p className="max-w-2xl text-sm text-white/70">
              Defina o gênero desejado, intensidade e referências. A Merse gera uma nova versão da sua foto com acabamento natural.
            </p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
            <PiWavesFill className="text-2xl text-pink-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Histórico registrado</p>
              <p>{history.length ? `${history.length} transformações salvas` : "Nenhuma transformação ainda"}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_100px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(236,72,153,0.26),transparent_55%)] opacity-90" />
            <div className="relative flex flex-col gap-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <PiUploadSimpleFill className="text-pink-300" />
                  Foto de referência
                </label>
                <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center text-sm text-white/60 transition hover:border-pink-300/40 hover:text-white">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                  {uploadedImage ? (
                    <div className="flex w-full flex-col items-center gap-3">
                      <img
                        src={uploadedImage}
                        alt="Foto selecionada"
                        className="h-48 w-full rounded-xl object-cover shadow-lg"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={clearUpload}
                          className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/60 transition hover:border-white/50 hover:text-white"
                          disabled={isLoading}
                        >
                          remover
                        </button>
                        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                          <PiUploadSimpleFill />
                          Atualizar
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <PiUploadSimpleFill className="text-xl text-pink-300" />
                      <p className="text-xs uppercase tracking-[0.3em]">Arraste ou selecione</p>
                      <p className="text-[11px] text-white/50">
                        Use close-up com boa iluminação para melhores resultados.
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-4">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <PiSparkleFill className="text-pink-300" />
                  Gênero desejado
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetGender("masculino")}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition ${
                      targetGender === "masculino"
                        ? "border-blue-400/60 bg-blue-500/10 text-white shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                        : "border-white/10 bg-black/30 text-white/65 hover:border-blue-400/40 hover:text-white"
                    }`}
                    disabled={isLoading}
                  >
                    <PiGenderMaleFill className="text-lg" />
                    <span className="text-xs uppercase tracking-[0.35em]">Masculino</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGender("feminino")}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition ${
                      targetGender === "feminino"
                        ? "border-pink-400/60 bg-pink-500/10 text-white shadow-[0_0_25px_rgba(236,72,153,0.35)]"
                        : "border-white/10 bg-black/30 text-white/65 hover:border-pink-400/40 hover:text-white"
                    }`}
                    disabled={isLoading}
                  >
                    <PiGenderFemaleFill className="text-lg" />
                    <span className="text-xs uppercase tracking-[0.35em]">Feminino</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  <PiLightningFill className="text-pink-300" />
                  Intensidade
                </span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-blue-500 via-pink-500 to-purple-500 accent-white"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
                  <span>Fiel ao original</span>
                  <span>Transformação completa</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Prompt avançado
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Descreva o estilo desejado, por exemplo: 'Gênero feminino com cabelo curto, maquiagem sutil, iluminação violeta'"
                    className="mt-2 min-h-[100px] w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                    disabled={isLoading}
                  />
                </label>
              </div>

              {error && (
                <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs uppercase tracking-[0.3em] text-white/60">
                <div className="flex items-center justify-between">
                  <span>
                    Uso atual: {energy.usage}/{energy.limit}
                  </span>
                  <span>Custo: {COST_PER_TRANSFORM} créditos</span>
                </div>
                {usageExceeds && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                    Você está no limite de energia. Veja {" "}
                    <Link
                      className="underline underline-offset-4 hover:text-white"
                      href="/planos"
                      aria-label="Ir para planos"
                    >
                      Planos Merse
                    </Link>
                    {" "}para liberar mais transformações.
                  </div>
                )}
              </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="group flex items-center justify-center gap-3 rounded-2xl border border-pink-400/60 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(236,72,153,0.35)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PiSparkleFill className={`text-xl transition ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Transformando..." : "Trocar gênero"}
            </button>
            {isLoading && (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Cancelar
              </button>
            )}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <header className="flex flex-col gap-2 text-white/70">
              <h2 className="text-2xl font-semibold text-white">Resultado</h2>
              <p className="text-sm">
                Visualize a nova versão e baixe para usar em suas campanhas, avatars ou referências.
              </p>
            </header>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/70 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
              <MerseLoadingOverlay
                active={isLoading}
                label="Recalculando identidade Merse..."
                sublabel="Ajustando traços e iluminação para entregar a nova versão."
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.18),transparent_60%)] opacity-80" />
              <div className="relative flex min-h-[320px] flex-col items-center justify-center gap-4">
                {resultImage ? (
                  <>
                    <img
                      src={resultImage}
                      alt="Resultado transformado"
                      className="h-80 w-full rounded-2xl object-cover opacity-95"
                    />
                    <a
                      href={resultImage}
                      download={`merse-gender-${Date.now()}.png`}
                      className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-white/50 hover:bg-white/20"
                    >
                      <PiDownloadSimpleFill />
                      download
                    </a>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <PiArrowsClockwiseBold className="text-3xl text-pink-300" />
                    <p>
                      Transforme sua foto selecionando o gênero e intensidade, depois clique em {" "}
                      <span className="uppercase tracking-[0.35em] text-white">Trocar gênero</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {history.slice(0, 4).map((entry) => (
                <article
                  key={entry.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 shadow-[0_22px_70px_rgba(0,0,0,0.4)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.12),transparent_60%)] opacity-70" />
                  <div className="relative flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/55">
                      <span>{entry.targetGender === "masculino" ? "Masculino" : "Feminino"}</span>
                      <span>{
                        new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        }).format(new Date(entry.createdAt))
                      }</span>
                    </div>
                    <div className="flex gap-3">
                      <img
                        src={entry.original}
                        alt="Original"
                        className="h-24 w-1/2 rounded-xl object-cover"
                      />
                      <img
                        src={entry.result}
                        alt="Resultado"
                        className="h-24 w-1/2 rounded-xl object-cover"
                      />
                    </div>
                    <p className="text-xs text-white/60">
                      <strong>Prompt:</strong> {entry.prompt}
                    </p>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                      Intensidade {entry.intensity}%
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
