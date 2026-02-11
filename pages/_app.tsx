import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AlienMenu from "@/components/AlienMenu";
import GalacticHud from "@/components/GalacticHud";
import { EnergyProvider } from "@/contexts/EnergyContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { translate, type Locale } from "@/lib/i18n";

const TRANSLATION_SKIP_TAGS = new Set([
  "A",
  "BUTTON",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "INPUT",
  "LABEL",
  "NAV",
  "OPTION",
  "SELECT",
  "TEXTAREA",
]);

const shouldSkipTranslation = (element: Element | null): boolean => {
  if (!element) return true;
  if (TRANSLATION_SKIP_TAGS.has(element.tagName)) return true;
  if (element.closest("[data-no-translate]")) return true;
  return false;
};

const applyTranslations = (locale: Locale) => {
  if (typeof document === "undefined") return;
  if (locale === "pt-BR") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const raw = node.nodeValue ?? "";
      const trimmed = raw.trim();
      if (!trimmed) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (shouldSkipTranslation(parent)) return NodeFilter.FILTER_REJECT;
      const translated = translate(locale, trimmed);
      if (translated === trimmed) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  nodes.forEach((node) => {
    const raw = node.nodeValue ?? "";
    const trimmed = raw.trim();
    const translated = translate(locale, trimmed);
    if (translated !== trimmed) {
      node.nodeValue = raw.replace(trimmed, translated);
    }
  });
};

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const showHud =
    router.pathname !== "/" && router.pathname !== "/login" && router.pathname !== "/explorar";
  const disableIndexLoginTransition =
    router.pathname === "/" || router.pathname === "/login";

  const [accountSearch, setAccountSearch] = useState("");
  const [showPortalsCard, setShowPortalsCard] = useState(false);
  const showAccountSearch = router.pathname === "/conta";

  useEffect(() => {
    const handlePortals = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      setShowPortalsCard(Boolean(custom.detail));
    };
    if (typeof window !== "undefined") {
      window.addEventListener("mersePortalsCard", handlePortals as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("mersePortalsCard", handlePortals as EventListener);
      }
    };
  }, []);

  useEffect(() => {
    applyTranslations(locale);
  }, [locale, router.asPath]);

  return (
    <>
      {showHud && <GalacticHud />}
      {showHud && <AlienMenu />}
      {showHud && showAccountSearch && (
        <div className="fixed right-24 top-6 z-40 hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <input
            type="text"
            value={accountSearch}
            onChange={(event) => {
              const next = event.target.value;
              setAccountSearch(next);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("merseAccountSearch", { detail: next }));
              }
            }}
            placeholder="Buscar criações, @ ou tags"
            className="w-64 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
          />
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/50">Conta</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={router.asPath}
          initial={disableIndexLoginTransition ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={disableIndexLoginTransition ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
          transition={disableIndexLoginTransition ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
        >
          <Component {...pageProps} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showPortalsCard && (
          <motion.div
            key="portals-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-auto fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
          >
            <div className="max-w-4xl flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/60">Outros Portais Merse</p>
                    <h3 className="text-xl font-semibold">Romexx e Shopverse também são da nossa constelação</h3>
                    <p className="text-sm text-white/70">
                      A Merse expande sua estética para e-commerce e varejo tech. Conheça nossas outras naves e veja
                      como elas entregam experiências imersivas com o mesmo padrão de design futurista.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPortalsCard(false)}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/30 hover:bg-white/20"
                  >
                    Fechar
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <a
                    href="https://romexx.com.br"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left shadow-[0_16px_60px_rgba(0,0,0,0.4)] transition hover:-translate-y-[2px] hover:border-purple-200/30"
                  >
                    <div className="mt-[2px] h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500/60 via-indigo-500/60 to-blue-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Romexx</p>
                      <p className="text-xs text-white/70">E-commerce com estética Merse aplicada a varejo tech.</p>
                    </div>
                    <span className="text-[12px] text-white/60 transition group-hover:text-white">↗</span>
                  </a>
                  <a
                    href="https://shopverse.com.br"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left shadow-[0_16px_60px_rgba(0,0,0,0.4)] transition hover:-translate-y-[2px] hover:border-purple-200/30"
                  >
                    <div className="mt-[2px] h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500/60 via-cyan-500/60 to-blue-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.35)]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Shopverse</p>
                      <p className="text-xs text-white/70">Marketplace futurista com curadoria visual Merse.</p>
                    </div>
                    <span className="text-[12px] text-white/60 transition group-hover:text-white">↗</span>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App(props: AppProps) {
  return (
    <AuthProvider>
      <LocaleProvider>
        <EnergyProvider>
          <AppContent {...props} />
        </EnergyProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
