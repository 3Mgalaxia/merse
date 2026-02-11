"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { EnergyProvider } from "@/contexts/EnergyContext";
import { LocaleProvider } from "@/contexts/LocaleContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LocaleProvider>
        <EnergyProvider>{children}</EnergyProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
