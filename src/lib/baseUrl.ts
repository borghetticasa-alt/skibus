// src/lib/baseUrl.ts
export function getBaseUrl() {
  // Browser
  if (typeof window !== "undefined") return "";

  // Vercel (production/preview)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // Se lo imposti tu (consigliato)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl;

  // Local fallback
  return "http://localhost:3000";
}
