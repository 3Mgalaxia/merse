import { useEffect } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";

export default function AuthVSCode() {
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        void router.push("/login?redirect=/auth/vscode");
        return;
      }

      // gerar token firebase JWT
      const token = await user.getIdToken();

      // montar URL para o VS Code capturar
      const redirectUrl = `vscode://merse.codex/auth?token=${token}`;

      // abrir deep link
      window.location.href = redirectUrl;
    });

    return () => unsub();
  }, [router]);

  return <div style={{ padding: 40 }}>Conectando ao Merse-Codex...</div>;
}
