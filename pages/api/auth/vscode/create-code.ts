import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

type CreateCodeResponse =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; error: string };

const COLLECTION = "vscode_auth_codes";
const CODE_TTL_SECONDS = 10 * 60;

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateCode() {
  const bytes = crypto.randomBytes(10);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  // 10 chars -> format MERSE-XXXXX-XXXXX
  return `MERSE-${out.slice(0, 5)}-${out.slice(5, 10)}`;
}

function extractBearer(req: NextApiRequest) {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization || "";
  if (typeof authHeader !== "string") return "";
  return authHeader.replace(/Bearer\s+/i, "").trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateCodeResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const token =
      extractBearer(req) ||
      (typeof (req.body as any)?.token === "string" ? (req.body as any).token.trim() : "");

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing Firebase token" });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const code = generateCode();
    const codeHash = sha256(code);
    const expiresAt = Timestamp.fromMillis(Date.now() + CODE_TTL_SECONDS * 1000);

    await adminDb.collection(COLLECTION).doc(codeHash).set({
      uid,
      codeHash,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      usedAt: null,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
    });

    return res.status(200).json({ ok: true, code, expiresAt: expiresAt.toDate().toISOString() });
  } catch (error) {
    console.error("Erro em /api/auth/vscode/create-code:", error);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
