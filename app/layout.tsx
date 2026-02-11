import "../styles/globals.css";
import AppProviders from "./providers";

export const metadata = {
  title: "Merse",
  description: "Merse Builder · Codex Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#010109] text-white">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
