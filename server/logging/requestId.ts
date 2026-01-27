import { randomUUID } from "crypto";
import type { NextApiResponse } from "next";

export function assignRequestId(res: NextApiResponse) {
  const requestId = typeof randomUUID === "function" ? randomUUID() : `req_${Date.now()}`;
  res.setHeader("X-Request-Id", requestId);
  return requestId;
}
