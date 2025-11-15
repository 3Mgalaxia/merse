import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  firebaseAuth,
  firebaseFirestore,
  googleProvider,
  appleProvider,
  firebaseEnabled,
} from "@/lib/firebase";
import { ensureUserCreditProfile } from "@/lib/credits";

type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapFirebaseUser(firebaseUser: User): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    isAnonymous: firebaseUser.isAnonymous,
    emailVerified: firebaseUser.emailVerified,
  };
}

async function ensureUserDocument(user: User, extra?: { displayName?: string }) {
  if (!firebaseFirestore) return;
  const userRef = doc(firebaseFirestore, "users", user.uid);
  await setDoc(
    userRef,
    {
      email: user.email ?? null,
      displayName: extra?.displayName ?? user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
  await ensureUserCreditProfile(user.uid);
}

const disableFirebaseAuth =
  process.env.NEXT_PUBLIC_DISABLE_FIREBASE_AUTH === "true" ||
  process.env.NEXT_PUBLIC_DISABLE_FIREBASE_AUTH === "1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseActive =
    !disableFirebaseAuth && firebaseEnabled && Boolean(firebaseAuth) && Boolean(firebaseFirestore);

  if (!firebaseActive) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("merse.auth.local");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as AuthUser;
          setUser(parsed);
        } catch (error) {
          console.warn("Falha ao carregar usuário local:", error);
        }
      }
      setLoading(false);
    }, []);

    const persist = (next: AuthUser | null) => {
      if (typeof window === "undefined") return;
      if (next) {
        window.localStorage.setItem("merse.auth.local", JSON.stringify(next));
      } else {
        window.localStorage.removeItem("merse.auth.local");
      }
    };

    const createLocalUser = (email: string, displayName?: string): AuthUser => ({
      uid: `local-${email}`,
      email,
      displayName: displayName ?? email.split("@")[0] ?? null,
      photoURL: null,
      isAnonymous: false,
      emailVerified: true,
    });

    const login = async (email: string, _password: string) => {
      const next = createLocalUser(email);
      setUser(next);
      persist(next);
    };

    const signup = async (email: string, _password: string, name?: string) => {
      const next = createLocalUser(email, name);
      setUser(next);
      persist(next);
    };

    const logout = async () => {
      setUser(null);
      persist(null);
    };

    const resetPassword = async (_email: string) => Promise.resolve();

    const socialLogin = async (providerName: string) => {
      const next = createLocalUser(`${providerName.toLowerCase()}@merse.local`, providerName);
      setUser(next);
      persist(next);
    };

    const value = useMemo<AuthContextValue>(
      () => ({
        user,
        loading,
        login,
        signup,
        logout,
        resetPassword,
        signInWithGoogle: () => socialLogin("Google"),
        signInWithApple: () => socialLogin("Apple"),
      }),
      [user, loading],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth!, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
        await ensureUserDocument(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth!, email, password);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const credentials = await createUserWithEmailAndPassword(firebaseAuth!, email, password);
    if (name) {
      await updateProfile(credentials.user, { displayName: name });
    }
    await ensureUserDocument(credentials.user, { displayName: name });
  };

  const logout = async () => {
    await signOut(firebaseAuth!);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(firebaseAuth!, email);
  };

  const signInWithGoogle = async () => {
    const credentials = await signInWithPopup(firebaseAuth!, googleProvider);
    await ensureUserDocument(credentials.user);
  };

  const signInWithApple = async () => {
    const credentials = await signInWithPopup(firebaseAuth!, appleProvider);
    await ensureUserDocument(credentials.user);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      resetPassword,
      signInWithGoogle,
      signInWithApple,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de AuthProvider");
  }
  return context;
}
