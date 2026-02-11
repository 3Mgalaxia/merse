import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import RootShell from "./_components/root-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3Mpods | Pods premium e experiências exclusivas",
  description:
    "Explore os melhores pods com curadoria 3Mpods, ofertas exclusivas e experiências premium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <RootShell>{children}</RootShell>
              <script src="/__merse_runtime_bridge.js" defer></script>
      </body>
    </html>
  );
}
