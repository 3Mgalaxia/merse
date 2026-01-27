import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import {
  PiBookmarkSimpleFill,
  PiHeartFill,
  PiSparkleFill,
  PiUsersThreeFill,
} from "react-icons/pi";
import { useEnergy } from "@/contexts/EnergyContext";

const ACCOUNT_STORAGE_KEY = "merse.account.profile";
const CURRENT_USER_ID = "demo-user";
const NAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const HANDLE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const directorySeed = [
  { name: "Ana Photon", handle: "@ana.photon", followers: 4820, following: 312, likes: 12840, avatar: "/banners/GERAR-FOTO/GERAR-FOTO1.png" },
  { name: "Diego Merse", handle: "@merse.diego", followers: 3920, following: 285, likes: 9821, avatar: "/banners/GERAR-OBJETO/GERAR-OBJETO2.png" },
  { name: "Camila Nebula", handle: "@cami.nebula", followers: 5260, following: 340, likes: 14210, avatar: "/banners/GERAR-ROUPA/GERAR-ROUPA123.png" },
  { name: "Léo Void", handle: "@leo.void", followers: 2310, following: 198, likes: 6112, avatar: "/banners/GERAR-OBJETO/GERAR-OBJETO2.png" },
  { name: "Marina Flux", handle: "@marinaflux", followers: 3104, following: 244, likes: 8740, avatar: "/banners/GERAR-FOTO/GERAR-FOTO1.png" },
  { name: "Rafa Galáxia", handle: "@rafa.galaxia", followers: 4188, following: 260, likes: 10990, avatar: "/banners/GERAR-ROUPA/GERAR-ROUPA123.png" },
];

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
  bio?: string;
  avatarUrl?: string;
  lastNameChangeAt?: number;
  lastUsernameChangeAt?: number;
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
  const [bioInput, setBioInput] = useState("");
  const [avatarInput, setAvatarInput] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(directorySeed);
  const [selectedProfile, setSelectedProfile] = useState<(typeof directorySeed)[number] | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [publicationStates, setPublicationStates] = useState<Record<string, PublicationState>>({});

  useEffect(() => {
    setReady(true);
    const stored = loadAccount();
    if (stored) {
      setAccount(stored);
      setNameInput(stored.name);
      setUsernameInput(stored.username);
      setBioInput(stored.bio ?? "");
      setAvatarInput(stored.avatarUrl ?? "");
    }
  }, []);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      const custom = event as CustomEvent<string>;
      setSearchTerm((custom.detail ?? "").toString());
    };
    window.addEventListener("merseAccountSearch", handleSearch as EventListener);
    return () => {
      window.removeEventListener("merseAccountSearch", handleSearch as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (energy.plan !== "nebula") {
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

  useEffect(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      setSearchResults(directorySeed.slice(0, 6));
      return;
    }
    const filtered = directorySeed.filter((entry) => entry.name.toLowerCase().includes(query));
    setSearchResults(filtered);
    setSelectedProfile(null);
  }, [searchTerm]);

  const handleSaveProfile = () => {
    if (energy.plan !== "nebula") return;
    if (!nameInput.trim() || !usernameInput.trim()) {
      setProfileMessage("Preencha nome e usuário para salvar.");
      return;
    }

    const now = Date.now();
    const nextUsernameAllowed = (account?.lastUsernameChangeAt ?? 0) + HANDLE_COOLDOWN_MS;
    const nextNameAllowed = (account?.lastNameChangeAt ?? 0) + NAME_COOLDOWN_MS;
    const wantsNameChange = account ? account.name !== nameInput.trim() : true;
    const wantsUsernameChange = account ? account.username !== usernameInput.trim() : true;

    if (wantsUsernameChange && now < nextUsernameAllowed) {
      const diffDays = Math.ceil((nextUsernameAllowed - now) / (1000 * 60 * 60 * 24));
      setProfileMessage(`Você poderá mudar o @ em ${diffDays} dia(s).`);
      return;
    }

    if (wantsNameChange && now < nextNameAllowed) {
      const diffDays = Math.ceil((nextNameAllowed - now) / (1000 * 60 * 60 * 24));
      setProfileMessage(`Você poderá mudar o nome em ${diffDays} dia(s).`);
      return;
    }

    const profile: AccountProfile = {
      id: CURRENT_USER_ID,
      name: nameInput.trim(),
      username: usernameInput.trim().startsWith("@")
        ? usernameInput.trim()
        : `@${usernameInput.trim()}`,
      followers: account?.followers ?? 1284,
      following: account?.following ?? 312,
      bio: bioInput.trim(),
      avatarUrl: avatarInput.trim() || account?.avatarUrl,
      lastNameChangeAt: wantsNameChange ? now : account?.lastNameChangeAt ?? now,
      lastUsernameChangeAt: wantsUsernameChange ? now : account?.lastUsernameChangeAt ?? now,
    };

    setAccount(profile);
    persistAccount(profile);
    setProfileMessage("Perfil atualizado.");
  };

  const toggleReaction = (id: string, type: "liked" | "saved") => {
    if (energy.plan !== "nebula") return;
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

  const totalLikes = useMemo(
    () =>
      publicationsSeed.reduce((sum, pub) => {
        const state = publicationStates[pub.id];
        const likes = state?.likes ?? pub.likes;
        return sum + likes;
      }, 0),
    [publicationStates],
  );

  const totalSaves = useMemo(
    () =>
      publicationsSeed.reduce((sum, pub) => {
        const state = publicationStates[pub.id];
        const saves = state?.saves ?? pub.saves;
        return sum + saves;
      }, 0),
    [publicationStates],
  );

  const profileName = account?.name || "Piloto Nebula";
  const profileHandle = account?.username || "@nebula.studio";
  const profileAvatarLetter = (profileName.charAt(0) || "N").toUpperCase();
  const profileAvatarUrl = account?.avatarUrl || avatarInput || "";
  const profileBio =
    account?.bio && account.bio.length > 0
      ? account.bio
      : "Criador Nebula Studio. Publicando looks, sites e renders que orbitam o estilo Merse.";

  const totalPosts = publicationsSeed.length;
  const totalFollowers = account?.followers ?? 1284;
  const totalFollowing = account?.following ?? 312;
  const nextNameChangeDate =
    account?.lastNameChangeAt != null
      ? new Date(account.lastNameChangeAt + NAME_COOLDOWN_MS).toLocaleDateString("pt-BR")
      : "liberado";
  const nextHandleChangeDate =
    account?.lastUsernameChangeAt != null
      ? new Date(account.lastUsernameChangeAt + HANDLE_COOLDOWN_MS).toLocaleDateString("pt-BR")
      : "liberado";

  if (!ready) {
    return null;
  }

  const isNebulaPlan = energy.plan === "nebula";

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
        {searchTerm && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 shadow-[0_16px_50px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between text-white/80">
              <span className="text-xs uppercase tracking-[0.35em] text-white/60">
                Resultados para “{searchTerm}”
              </span>
              <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                Busca por nome (privacidade)
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {searchResults.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white/70">
                  Nenhum perfil encontrado. Tente outro nome.
                </div>
              ) : (
                  searchResults.map((entry) => (
                    <div
                      key={entry.handle}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedProfile(entry)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setSelectedProfile(entry);
                        }
                      }}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:-translate-y-[1px] hover:border-purple-200/30"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        <img src={entry.avatar} alt={entry.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{entry.name}</p>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{entry.handle}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[3px]">
                            {entry.followers} seguidores
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[3px]">
                            {entry.likes} curtidas
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[3px]">
                            {entry.following} seguindo
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        {selectedProfile && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex flex-col gap-3 text-white">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img src={selectedProfile.avatar} alt={selectedProfile.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">{selectedProfile.name}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">{selectedProfile.handle}</p>
                </div>
              </div>
              <p className="text-sm text-white/70">
                {selectedProfile.handle === profileHandle
                  ? profileBio
                  : "Criador Merse. Perfil público com foco em criações visuais e prompts compartilhados."}
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {selectedProfile.followers} seguidores
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {selectedProfile.likes} curtidas
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {selectedProfile.following} seguindo
                </span>
              </div>
              <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Prompts publicados</p>
                {selectedProfile.handle === profileHandle ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {publicationsSeed.map((pub) => (
                      <div
                        key={pub.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-white/50">{pub.title}</p>
                        <p className="mt-1 text-white/80">{pub.prompt}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/60">
                    Este perfil ainda não tem prompts públicos nesta visualização.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_90px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-purple-500/60 via-indigo-500/60 to-blue-500/50 shadow-[0_18px_60px_rgba(0,0,0,0.4)]">
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt="Avatar do perfil"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white">
                  {profileAvatarLetter}
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-white/10 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                Nebula
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-white lg:text-4xl">{profileName}</h1>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                  {profileHandle}
                </span>
                <span className="rounded-full border border-purple-300/30 bg-purple-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white">
                  Nebula Studio
                </span>
              </div>
              <p className="max-w-3xl text-sm text-white/70">{profileBio}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Publicações</p>
                  <p className="text-xl font-semibold text-white">{totalPosts}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Seguidores</p>
                  <p className="text-xl font-semibold text-white">{totalFollowers}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Seguindo</p>
                  <p className="text-xl font-semibold text-white">{totalFollowing}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Curtidas</p>
                  <p className="text-xl font-semibold text-white">{totalLikes}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-white/60">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Perfil social Merse
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {totalSaves} salvamentos
                </span>
              </div>
            </div>
          </div>
        </header>

        {isNebulaPlan && showEditPanel && (
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-2xl shadow-[0_34px_100px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] opacity-90" />
            <button
              type="button"
              onClick={() => setShowEditPanel(false)}
              className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-lg transition hover:border-white/40 hover:bg-white/20"
            >
              Fechar
            </button>
            <div className="relative space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">Editar perfil Merse</h2>
                <p className="text-sm text-white/70">
                  Nome, @ (1x/30 dias), bio e avatar. Se trocar hoje, o prazo reinicia a partir de agora.
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
              <div className="grid gap-4 md:grid-cols-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  Próxima troca de nome: <span className="text-white/70">{nextNameChangeDate}</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  Próxima troca de @: <span className="text-white/70">{nextHandleChangeDate}</span>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Biografia
                  <textarea
                    value={bioInput}
                    onChange={(event) => setBioInput(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    placeholder="Fale sobre você e o que cria na Merse."
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Foto de perfil (URL)
                  <input
                    type="url"
                    value={avatarInput}
                    onChange={(event) => setAvatarInput(event.target.value)}
                    placeholder="https://..."
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  <span className="mt-2 block text-[11px] text-white/50">
                    Use uma imagem quadrada. Alterar a foto não tem limite de tempo.
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="group flex items-center justify-center gap-3 rounded-2xl border border-purple-400/60 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_20px_60px_rgba(168,85,247,0.35)] transition hover:brightness-[1.05]"
              >
                <PiSparkleFill className="text-lg" />
                Salvar perfil
              </button>
              {profileMessage && (
                <p className="text-sm font-semibold text-white/80">{profileMessage}</p>
              )}
            </div>
          </section>
        )}

        {isNebulaPlan && !showEditPanel && (
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Editor oculto</p>
              <p className="text-white/80">Reabra para ajustar nome, @, bio ou avatar.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowEditPanel(true)}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/40 hover:bg-white/20"
            >
              Reabrir editor
            </button>
          </div>
        )}

        {account && isNebulaPlan && (
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
                Apenas membros Nebula Studio podem seguir, curtir e salvar publicações. Mantenha o plano ativo para liberar interação completa e ter prioridade no ranking estelar.
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
              <h2 className="text-2xl font-semibold">Ative o plano Nebula Studio</h2>
              <p className="mt-3 text-sm text-white/70">
                Estamos te levando para o Nebula Studio (R$35) para liberar o perfil social, seguidores e interações.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
