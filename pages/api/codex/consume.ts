import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebaseAdmin";

type SuccessResponse = {
  success: true;
  remainingCredits: number;
  deducted: number;
};

type ErrorReason =
  | "METHOD_NOT_ALLOWED"
  | "NO_TOKEN"
  | "INVALID_CODE"
  | "USER_NOT_FOUND"
  | "NO_PLAN"
  | "NO_CREDITS"
  | "UNAUTHORIZED"
  | "SERVER_ERROR";

type ErrorResponse = {
  success: false;
  reason: ErrorReason;
  message?: string;
  remainingCredits?: number;
};

const ALLOWED_PLANS = new Set(["pulse", "pulse starter", "nebula", "nebula studio", "supernova"]);

const MIN_HTML_LENGTH = 200;
const CREDIT_STEP = 450;

function resolvePlan(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized;
}

function hasAllowedPlan(plan: string | null): boolean {
  if (!plan) return false;
  const slug = plan.trim().toLowerCase();
  return ALLOWED_PLANS.has(slug);
}

function calculateCreditCost(rawLength: number): number {
  if (!Number.isFinite(rawLength) || rawLength <= 0) {
    return 1;
  }
  const normalized = Math.max(rawLength, MIN_HTML_LENGTH);
  return Math.max(1, Math.ceil(normalized / CREDIT_STEP));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, reason: "METHOD_NOT_ALLOWED" });
  }

  try {
    const token = typeof req.body?.token === "string" ? req.body.token : null;
    const html = typeof req.body?.html === "string" ? req.body.html : undefined;
    const code = typeof req.body?.code === "string" ? req.body.code : undefined;
    const providedLength = Number.isFinite(req.body?.length)
      ? Number(req.body.length)
      : undefined;

    if (!token) {
      return res.status(400).json({ success: false, reason: "NO_TOKEN" });
    }

    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded?.uid) {
      return res.status(401).json({ success: false, reason: "UNAUTHORIZED" });
    }

    const uid = decoded.uid;
    const sample = typeof providedLength === "number" ? "" : html ?? code ?? "";
    const length = providedLength ?? sample.length;

    if (!Number.isFinite(length) || length < 0) {
      return res.status(400).json({ success: false, reason: "INVALID_CODE" });
    }

    const deducted = calculateCreditCost(length);

    const result = await adminDb.runTransaction(async (transaction) => {
      const userRef = adminDb.collection("users").doc(uid);
      const snapshot = await transaction.get(userRef);

      if (!snapshot.exists) {
        throw new CodexConsumeError(404, "USER_NOT_FOUND");
      }

      const data = snapshot.data() ?? {};
      const plan = resolvePlan(data.plan);

      if (!hasAllowedPlan(plan)) {
        throw new CodexConsumeError(403, "NO_PLAN");
      }

      const credits = typeof data.credits === "number" ? data.credits : 0;

      if (credits < deducted) {
        throw new CodexConsumeError(402, "NO_CREDITS", credits);
      }

      const remainingCredits = credits - deducted;

      transaction.set(
        userRef,
        {
          credits: remainingCredits,
          updatedAt: FieldValue.serverTimestamp(),
          lastCodexConsume: {
            deducted,
            htmlLength: length,
            at: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );

      return remainingCredits;
    });

    return res.status(200).json({ success: true, remainingCredits: result, deducted });
  } catch (error) {
    if (error instanceof CodexConsumeError) {
      const status = error.statusCode ?? 400;
      return res.status(status).json({
        success: false,
        reason: error.reason,
        remainingCredits: error.remainingCredits,
      });
    }

    console.error("[codex/consume] erro:", error);
    return res.status(500).json({ success: false, reason: "SERVER_ERROR" });
  }
}

class CodexConsumeError extends Error {
  statusCode: number;
  reason: ErrorReason;
  remainingCredits?: number;

  constructor(statusCode: number, reason: ErrorReason, remainingCredits?: number) {
    super(reason);
    this.statusCode = statusCode;
    this.reason = reason;
    this.remainingCredits = remainingCredits;
  }
}
