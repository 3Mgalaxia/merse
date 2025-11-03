import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import AlienMenu from "@/components/AlienMenu";
import GalacticHud from "@/components/GalacticHud";
import { EnergyProvider } from "@/contexts/EnergyContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showHud = router.pathname !== "/" && router.pathname !== "/login";

  const [showGalaxyTransition, setShowGalaxyTransition] = useState(false);
  const shouldAnimateRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleStart = (url: string) => {
      const currentPath = router.pathname;
      const targetPath = url.split("?")[0];
      const isIndexToLogin = currentPath === "/" && targetPath === "/login";
      const isLoginToIndex = currentPath === "/login" && targetPath === "/";
      const shouldAnimate = isIndexToLogin || isLoginToIndex;

      shouldAnimateRef.current = shouldAnimate;

      if (shouldAnimate) {
        const delay = targetPath === "/login" ? 1000 : 2000;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setShowGalaxyTransition(true);
        timeoutRef.current = setTimeout(() => {
          setShowGalaxyTransition(false);
          shouldAnimateRef.current = false;
          timeoutRef.current = null;
        }, delay);
      }
    };

    const handleStop = () => {
      if (!shouldAnimateRef.current) return;
      if (!timeoutRef.current) {
        const delay = router.pathname === "/login" ? 1000 : 2000;
        timeoutRef.current = setTimeout(() => {
          setShowGalaxyTransition(false);
          shouldAnimateRef.current = false;
          timeoutRef.current = null;
        }, delay);
      }
    };

    const handleError = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      shouldAnimateRef.current = false;
      setShowGalaxyTransition(false);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleStop);
    router.events.on("routeChangeError", handleError);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleStop);
      router.events.off("routeChangeError", handleError);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return (
    <AuthProvider>
      <EnergyProvider>
        {showHud && <GalacticHud />}
        {showHud && <AlienMenu />}

        <AnimatePresence mode="wait">
          <motion.div
            key={router.asPath}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {showGalaxyTransition && (
            <motion.div
              key="galaxy-transition"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="pointer-events-none fixed inset-0 z-[999] overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
                animate={{ scale: 1.8, opacity: 0.85, rotate: 6 }}
                exit={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute left-1/2 top-1/2 h-[120vh] w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-[120px] bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.55),_rgba(79,70,229,0.45),_rgba(14,116,144,0.25),_transparent_70%)] blur-[80px]"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.6, opacity: 0.6 }}
                exit={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(236,72,153,0.3),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.25),transparent_60%)]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.4, scale: 1.25 }}
                exit={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.25),_transparent_55%)] blur-3xl"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </EnergyProvider>
    </AuthProvider>
  );
}
