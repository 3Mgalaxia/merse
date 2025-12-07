export function getMercadoPagoAccessToken() {
  const token =
    process.env.MERCADOPAGO_ACCESS_TOKEN ??
    process.env.MP_ACCESS_TOKEN ??
    process.env.MP_TEST_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Credenciais do Mercado Pago não configuradas (MERCADOPAGO_ACCESS_TOKEN).");
  }

  return token;
}
