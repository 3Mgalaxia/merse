import { randomUUID } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago";

type PixSuccessResponse = {
  qrCode: string;
  qrCodeBase64?: string;
  copyPasteCode?: string;
  ticketUrl?: string | null;
  expiresAt?: string | null;
};

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PixSuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não suportado." });
  }

  let token: string;
  try {
    token = getMercadoPagoAccessToken();
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Configure MERCADOPAGO_ACCESS_TOKEN no .env.local para usar Pix.",
    });
  }

  const { amount, description, customer } = req.body as {
    amount?: number;
    description?: string;
    customer?: { email?: string; name?: string };
  };

  if (typeof amount !== "number" || amount <= 0 || !description) {
    return res.status(400).json({ error: "Informe o valor e a descrição para gerar o Pix." });
  }

  try {
    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        payer: {
          email: customer?.email ?? "contato@merse.gg",
          first_name: customer?.name ?? "Cliente Merse",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : typeof data?.error === "string"
          ? data.error
          : typeof data?.error?.message === "string"
          ? data.error.message
          : "Mercado Pago não aceitou a criação do Pix.";
      throw new Error(message);
    }

    const transactionData = data?.point_of_interaction?.transaction_data;
    const qrCode = transactionData?.qr_code;

    if (!qrCode) {
      throw new Error("Mercado Pago não retornou o QR Code do Pix.");
    }

    return res.status(200).json({
      qrCode,
      qrCodeBase64: transactionData?.qr_code_base64,
      copyPasteCode: transactionData?.qr_code,
      ticketUrl:
        transactionData?.ticket_url ??
        data?.transaction_details?.external_resource_url ??
        null,
      expiresAt: data?.date_of_expiration ?? null,
    });
  } catch (error) {
    console.error("Erro ao gerar Pix:", error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Falha ao gerar QR Code Pix." });
  }
}
