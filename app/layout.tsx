import "../styles/globals.css";

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
      <body className="bg-[#010109] text-white">{children}</body>
    </html>
  );
}
