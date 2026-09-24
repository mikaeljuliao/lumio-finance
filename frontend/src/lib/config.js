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

const SESSION_KEY = "lumio_session_token";

/**
 * Salva o token de sessão no localStorage.
 */
export function saveSessionToken(token) {
  if (typeof window !== "undefined" && token) {
    localStorage.setItem(SESSION_KEY, token);
  }
}

/**
 * Recupera o token de sessão do localStorage.
 */
export function getSessionToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY) || null;
}

/**
 * Remove o token de sessão do localStorage.
 */
export function clearSessionToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Retorna os headers padrão com Authorization: Bearer quando o token existir.
 */
export function getAuthHeaders(extra = {}) {
  const token = getSessionToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Wrapper de fetch que sempre envia credentials e Authorization header.
 */
export function authFetch(url, options = {}) {
  const token = getSessionToken();
  return fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
