import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

type ValidateResponse =
  | {
      allowed: true;
      uid: string;
      plan: string | null;
      credits: number;
    }
  | {
      allowed: false;
      reason: "METHOD_NOT_ALLOWED" | "NO_TOKEN" | "USER_NOT_FOUND" | "NO_PLAN" | "NO_CREDITS" | "SERVER_ERROR";
    };

const ALLOWED_PLANS = new Set(["Pulse Starter", "nebula"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidateResponse>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ allowed: false, reason: "METHOD_NOT_ALLOWED" });
  }

  try {
    const token = req.query.token?.toString().trim();

    if (!token) {
      return res.status(400).json({ allowed: false, reason: "NO_TOKEN" });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const userSnapshot = await adminDb.collection("users").doc(uid).get();

    if (!userSnapshot.exists) {
      return res.status(404).json({ allowed: false, reason: "USER_NOT_FOUND" });
    }

    const data = userSnapshot.data() ?? {};
    const plan = typeof data.plan === "string" ? data.plan : null;
    const credits = typeof data.credits === "number" ? data.credits : 0;

    if (!plan || !ALLOWED_PLANS.has(plan)) {
      return res.status(200).json({ allowed: false, reason: "NO_PLAN" });
    }

    if (credits <= 0) {
      return res.status(200).json({ allowed: false, reason: "NO_CREDITS" });
    }

    return res.status(200).json({
      allowed: true,
      uid,
      plan,
      credits,
    });
  } catch (error) {
    console.error("Erro em /api/auth/validate:", error);
    return res.status(500).json({ allowed: false, reason: "SERVER_ERROR" });
  }
}
