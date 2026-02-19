import type { NextApiRequest, NextApiResponse } from "next";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago";

type PreferenceResponse = {
  initPoint: string;
};

type ErrorResponse = {
  error: string;
};

const planPrices: Record<string, number> = {
  free: 0,
  // Planos principais (cobrança em USD)
  pulse: 10,
  nebula: 24,
  supernova: 35,
  // Itens pontuais (mantidos em BRL)
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

  const { plan, title, customer, paymentMethod } = req.body as {
    plan?: string;
    title?: string;
    customer?: { email?: string; name?: string };
    paymentMethod?: "credit" | "debit";
  };

  if (!plan || !title) {
    return res
      .status(400)
      .json({ error: "Dados do plano insuficientes para criar a cobrança." });
  }

  const planPrice = planPrices[plan];
  if (typeof planPrice !== "number" || planPrice <= 0) {
    return res
      .status(400)
      .json({ error: "Plano informado não é elegível para pagamento online." });
  }

  let accessToken: string;
  try {
    accessToken = getMercadoPagoAccessToken();
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as credenciais do Mercado Pago.",
    });
  }

  try {
    const { MercadoPagoConfig, Preference } = await import("mercadopago");
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const paymentPreference =
      paymentMethod === "debit"
        ? {
            excluded_payment_types: [{ id: "credit_card" }, { id: "ticket" }],
            default_payment_type_id: "debit_card",
          }
        : {
            excluded_payment_types: [{ id: "ticket" }],
            default_payment_type_id: "credit_card",
          };

    const isCorePlan = plan === "pulse" || plan === "nebula" || plan === "supernova";
    const currency = isCorePlan ? "USD" : "BRL";

    const checkout = await preference.create({
      body: {
        items: [
          {
            id: plan,
            title,
            quantity: 1,
            unit_price: planPrice,
            currency_id: currency,
          },
        ],
        payer: {
          email: customer?.email ?? "contato@merse.gg",
          name: customer?.name ?? "Piloto Merse",
        },
        payment_methods: paymentPreference,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/energia-cosmica`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/planos`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/planos`,
        },
        auto_return: "approved",
        binary_mode: true,
        metadata: {
          plan,
          price: planPrice,
          env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "local",
          paymentMethod: paymentMethod ?? "credit",
        },
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
