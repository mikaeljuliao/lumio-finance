/**
 * Configuração central de URLs de API do Frontend Lumio.
 */
export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:3001";
  }
  return "https://powerful-essence-production-0894.up.railway.app";
}
