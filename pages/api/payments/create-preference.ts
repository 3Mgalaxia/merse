import type { NextApiRequest, NextApiResponse } from "next";

type PreferenceResponse = {
  initPoint: string;
};

type ErrorResponse = {
  error: string;
};

const planPrices: Record<string, number> = {
  free: 0,
  pulse: 10,
  nebula: 35,
  supernova: 79,
  "leaderboard-image": 1,
  "leaderboard-object": 2,
  "leaderboard-video": 3,
  "prompt-ceu": 39,
  "prompt-cozinha": 42,
  "prompt-minimalista": 44,
  "prompt-natureza": 47,
  "prompt-praia": 49,
  "prompt-restaurante": 52,
  "prompt-rua": 55,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreferenceResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: "Credenciais do Mercado Pago não configuradas." });
  }

  const { plan, title, price, customer } = req.body as {
    plan?: string;
    title?: string;
    price?: number;
    customer?: { email?: string; name?: string };
  };

  if (!plan || !title || typeof price !== "number") {
    return res.status(400).json({ error: "Dados do plano insuficientes para criar a cobrança." });
  }

  if (!planPrices[plan]) {
    return res.status(400).json({ error: "Plano informado não é elegível para pagamento online." });
  }

  try {
    const { MercadoPagoConfig, Preference } = await import("mercadopago");
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const checkout = await preference.create({
      body: {
        items: [
          {
            title,
            quantity: 1,
            unit_price: price,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: customer?.email ?? "contato@merse.gg",
          name: customer?.name ?? "Piloto Merse",
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/energia-cosmica`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/planos`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/planos`,
        },
        auto_return: "approved",
      },
    });

    const initPoint =
      (checkout as unknown as { init_point?: string }).init_point ??
      (checkout as unknown as { sandbox_init_point?: string }).sandbox_init_point;

    if (!initPoint) {
      throw new Error("Mercado Pago não retornou o link de aprovação.");
    }

    return res.status(200).json({ initPoint });
  } catch (error) {
    console.error("Erro ao criar preferência do Mercado Pago:", error);
    return res
      .status(500)
      .json({ error: "Não foi possível iniciar o checkout no momento. Tente novamente." });
  }
}
