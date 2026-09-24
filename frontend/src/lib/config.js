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
let memoryToken = null;

/**
 * Salva o token de sessão na memória, localStorage e cookies.
 */
export function saveSessionToken(token) {
  if (!token) return;
  memoryToken = token;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SESSION_KEY, token);
    } catch (e) {
      console.warn("Could not save token to localStorage:", e);
    }
    try {
      document.cookie = `${SESSION_KEY}=${encodeURIComponent(token)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    } catch (e) {}
  }
}

/**
 * Recupera o token de sessão de memory, localStorage ou cookies.
 */
export function getSessionToken() {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;

  try {
    const fromStorage = localStorage.getItem(SESSION_KEY);
    if (fromStorage && fromStorage !== "null" && fromStorage !== "undefined") {
      memoryToken = fromStorage;
      return fromStorage;
    }
  } catch (e) {}

  try {
    const cookies = document.cookie.split(";");
    for (let c of cookies) {
      const [k, v] = c.trim().split("=");
      if (k === SESSION_KEY && v && v !== "null" && v !== "undefined") {
        const decoded = decodeURIComponent(v);
        memoryToken = decoded;
        return decoded;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Remove o token de sessão da memória, localStorage e cookies.
 */
export function clearSessionToken() {
  memoryToken = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    try {
      document.cookie = `${SESSION_KEY}=; path=/; max-age=0; SameSite=Lax`;
    } catch (e) {}
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
  const baseHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers || {}),
    },
  });
}
