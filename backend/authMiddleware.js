/**
 * authMiddleware.js — Middleware para verificação de sessão e parsing de cookies no Express.
 */
const { getSessionUser } = require('./auth');

/**
 * Função utilitária para extrair cookies da string Header Cookie.
 * @param {string} cookieHeader 
 * @returns {Record<string, string>}
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const key = parts.shift().trim();
      const value = decodeURIComponent(parts.join('=').trim());
      list[key] = value;
    }
  });

  return list;
}

/**
 * Middleware para proibir acesso não autenticado a rotas protegidas.
 */
async function requireAuth(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.lumio_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return res.status(401).json({ error: 'Não autenticado. Faça login para continuar.' });
    }

    const user = await getSessionUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE] Erro ao validar sessão:', err.message);
    res.status(401).json({ error: 'Falha na autenticação.' });
  }
}

module.exports = {
  parseCookies,
  requireAuth,
};
