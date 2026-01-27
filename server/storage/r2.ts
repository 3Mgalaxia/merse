import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

let cachedClient: S3Client | null = null;

function getEnv() {
  const accessKeyId = process.env.R2_ACCESS_KEY;
  const secretAccessKey = process.env.R2_SECRET_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  return { accessKeyId, secretAccessKey, endpoint, bucket, publicBaseUrl };
}

export function isR2Enabled() {
  const { accessKeyId, secretAccessKey, endpoint, bucket } = getEnv();
  return Boolean(accessKeyId && secretAccessKey && endpoint && bucket);
}

function ensureClient(): S3Client | null {
  if (cachedClient) return cachedClient;

  const { accessKeyId, secretAccessKey, endpoint } = getEnv();
  if (!accessKeyId || !secretAccessKey || !endpoint) return null;

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedClient;
}

function publicUrlForKey(key: string) {
  const { bucket, publicBaseUrl, endpoint } = getEnv();
  if (!bucket) return null;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
  }
  if (endpoint) {
    const cleanEndpoint = endpoint.replace(/\/+$/, "");
    return `${cleanEndpoint}/${bucket}/${key.replace(/^\/+/, "")}`;
  }
  return null;
}

export async function uploadBufferToR2(params: {
  buffer: Buffer;
  contentType?: string;
  key?: string;
}): Promise<string | null> {
  const client = ensureClient();
  const { bucket } = getEnv();
  if (!client || !bucket) return null;

  const key = params.key ?? `generated/${randomUUID()}.png`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType ?? "application/octet-stream",
      ACL: "public-read",
    }),
  );

  return publicUrlForKey(key);
}
