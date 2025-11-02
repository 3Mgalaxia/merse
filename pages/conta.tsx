import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import {
  PiBookmarkSimpleFill,
  PiHeartFill,
  PiSparkleFill,
  PiUsersFill,
  PiUsersThreeFill,
} from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";

const ACCOUNT_STORAGE_KEY = "merse.account.profile";
const CURRENT_USER_ID = "demo-user";

const publicationsSeed = [
  {
    id: "pub-01",
    image: "/banners/GERAR-FOTO/GERAR-FOTO1.png",
    title: "Portrait Photon",
    prompt:
      "Retrato hiper-realista de piloto Merse com capacete holográfico, partículas orbitando em luz violeta.",
    likes: 4200,
    saves: 1280,
  },
  {
    id: "pub-02",
    image: "/banners/GERAR-OBJETO/GERAR-OBJETO2.png",
    title: "Speaker Nebula",
    prompt: "Render 3D de speaker translúcido com núcleo pulsante e reflexos neon, plataforma flutuante.",
    likes: 3660,
    saves: 1042,
  },
  {
    id: "pub-03",
    image: "/banners/GERAR-ROUPA/GERAR-ROUPA123.png",
    title: "Runway Flux",
    prompt: "Vídeo de passarela com vestido líquido cintilante, passarela holográfica e background glow.",
    likes: 2980,
    saves: 890,
  },
];

type AccountProfile = {
  id: string;
  name: string;
  username: string;
  followers: number;
  following: number;
};

type PublicationState = {
  liked: boolean;
  saved: boolean;
  likes: number;
  saves: number;
};

function loadAccount(): AccountProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AccountProfile;
  } catch {
    return null;
  }
}

function persistAccount(profile: AccountProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(profile));
}

export default function Conta() {
  const energy = useEnergy();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [publicationStates, setPublicationStates] = useState<Record<string, PublicationState>>({});

  useEffect(() => {
    setReady(true);
    const stored = loadAccount();
    if (stored) {
      setAccount(stored);
      setNameInput(stored.name);
      setUsernameInput(stored.username);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (energy.plan === "free") {
      setShowUpgrade(true);
      const timeout = window.setTimeout(() => {
        router.push("/planos");
      }, 900);
      return () => window.clearTimeout(timeout);
    }
    setShowUpgrade(false);
  }, [energy.plan, ready, router]);

  useEffect(() => {
    const initialState: Record<string, PublicationState> = {};
    publicationsSeed.forEach((pub) => {
      initialState[pub.id] = {
        liked: false,
        saved: false,
        likes: pub.likes,
        saves: pub.saves,
      };
    });
    setPublicationStates(initialState);
  }, []);

  const handleCreateAccount = () => {
    if (energy.plan === "free") return;
    if (!nameInput.trim() || !usernameInput.trim()) return;
    const profile: AccountProfile = {
      id: CURRENT_USER_ID,
      name: nameInput.trim(),
      username: usernameInput.trim().startsWith("@")
        ? usernameInput.trim()
        : `@${usernameInput.trim()}`,
      followers: 1284,
      following: 312,
    };
    setAccount(profile);
    persistAccount(profile);
  };

  const toggleReaction = (id: string, type: "liked" | "saved") => {
    if (energy.plan === "free") return;
    setPublicationStates((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const next: PublicationState = { ...current };
      if (type === "liked") {
        next.liked = !next.liked;
        next.likes += next.liked ? 1 : -1;
      } else {
        next.saved = !next.saved;
        next.saves += next.saved ? 1 : -1;
      }
      return { ...prev, [id]: next };
    });
  };

  if (!ready) {
    return null;
  }

  const isFree = energy.plan === "free";

  return (
    <div className="relative min-h-screen bg-black px-6 pb-24 pt-32 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[480px] bg-[radial-gradient(circle_at_60%_25%,rgba(236,72,153,0.32),transparent_60%),radial-gradient(circle_at_25%_30%,rgba(59,130,246,0.28),transparent_65%)] blur-3xl opacity-80" />

      <Link
        href="/gerar"
        className="absolute left-6 top-28 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/50 hover:bg-white/20 hover:text-white"
      >
        VOLTAR
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-purple-200/80">Merse Account</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              Seu universo particular na Merse
            </h1>
            <p className="max-w-2xl text-sm text-white/70">
              Acompanhe seguidores, publique suas criações favoritas e compartilhe pacotes de prompts
              exclusivos com a comunidade.
            </p>
          </div>
          {account && (
            <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/70">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl text-white/70">
                <PiUsersFill />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Seguidores</p>
                <p className="text-lg font-semibold text-white">{account.followers}</p>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Seguindo {account.following}</p>
              </div>
            </div>
          )}
        </header>

        {!account && !isFree ? (
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_100px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] opacity-90" />
            <div className="relative space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">Configurar conta Merse</h2>
                <p className="text-sm text-white/70">
                  Escolha como quer ser identificado na comunidade. Esse perfil será exibido nas suas publicações e pacotes de prompt.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Nome
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Usuário
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    placeholder="@seuusuario"
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleCreateAccount}
                className="group flex items-center justify-center gap-3 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(168,85,247,0.35)] transition hover:brightness-[1.05]"
              >
                <PiSparkleFill className="text-lg" />
                Criar conta
              </button>
            </div>
          </section>
        ) : null}

        {account && !isFree && (
          <section className="grid gap-6 md:grid-cols-3">
            {publicationsSeed.map((pub) => {
              const state = publicationStates[pub.id];
              return (
                <article
                  key={pub.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1 hover:border-purple-300/40"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_60%)] opacity-70 transition duration-300 group-hover:opacity-95" />
                  <div className="relative flex flex-col gap-4 text-sm text-white/75">
                    <div className="flex items-center gap-3">
                      <img
                        src={pub.image}
                        alt={pub.title}
                        className="h-32 w-full rounded-2xl object-cover opacity-95 transition duration-700 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">{pub.title}</p>
                      <p className="mt-1 text-sm text-white/80">{pub.prompt}</p>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
                      <button
                        type="button"
                        onClick={() => toggleReaction(pub.id, "liked")}
                        className={`flex items-center gap-2 transition ${state?.liked ? "text-pink-300" : "hover:text-white"}`}
                      >
                        <PiHeartFill />
                        {state?.likes ?? pub.likes}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleReaction(pub.id, "saved")}
                        className={`flex items-center gap-2 transition ${state?.saved ? "text-purple-300" : "hover:text-white"}`}
                      >
                        <PiBookmarkSimpleFill />
                        {state?.saves ?? pub.saves}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_60%)] opacity-80" />
            <div className="relative space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Dicas de engajamento</p>
              <ul className="space-y-2">
                <li>• Publique variações dos pacotes comprados para inspirar sua rede.</li>
                <li>• Incentive seguidores a salvar prompts com CTAs nos cards.</li>
                <li>• Responda curtidas com mensagens personalizadas via Prompt Chat.</li>
              </ul>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_60%)] opacity-80" />
            <div className="relative space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Seguidores & planos</p>
              <p>
                Apenas membros com assinatura podem seguir, curtir e salvar publicações. Atualize seu plano para liberar interação completa e ter prioridade no ranking estelar.
              </p>
              <Link
                href="/planos"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-white transition hover:border-purple-300/40 hover:bg-purple-500/20 hover:text-white"
              >
                <PiUsersThreeFill />
                Ver planos
              </Link>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showUpgrade && (
          <motion.div
            key="upgrade-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-8 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            >
              <PiSparkleFill className="mx-auto mb-4 text-3xl text-purple-300" />
              <h2 className="text-2xl font-semibold">Ative um plano para liberar o hub social</h2>
              <p className="mt-3 text-sm text-white/70">
                Estamos te levando para os planos Merse para que você crie seu perfil, acompanhe seguidores e interaja com a comunidade.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
