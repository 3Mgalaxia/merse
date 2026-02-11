/** @type {import('next').NextConfig} */
const vercelFlag = (process.env.VERCEL || "").toLowerCase();
const isVercel =
  vercelFlag === "1" ||
  vercelFlag === "true" ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.VERCEL_URL) ||
  Boolean(process.env.NOW_REGION);
const distDir = isVercel ? ".next" : process.env.MERSE_DIST_DIR?.trim() || ".next";

const nextConfig = {
  reactStrictMode: true,
  distDir,
};

export default nextConfig;
