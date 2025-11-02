import Link from "next/link";

export default function Galeria() {
  // Placeholder de itens da galeria
  const itens = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    nome: `Criação ${i + 1}`,
    tipo: "Imagem/Video/3D",
  }));

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-start text-white relative p-6 space-y-6">
      {/* Botão sair */}
      <Link
        href="/gerar"
        className="absolute top-6 left-6 rounded-lg border border-white/20 bg-white/10 px-4 py-2 transition hover:bg-white/20"
      >
        ✖ Sair
      </Link>

      <h1 className="text-2xl font-bold mb-4 text-center">Galeria 🏛️</h1>

      {/* Container principal liquid glass */}
      <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 shadow-lg w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {itens.map((item) => (
          <div
            key={item.id}
            className="backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          >
            {/* Placeholder do item */}
            <div className="w-full h-40 bg-white/5 rounded-md flex items-center justify-center text-gray-400 mb-2">
              {item.tipo}
            </div>
            <p className="font-semibold text-center">{item.nome}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
