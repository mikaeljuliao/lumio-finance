const { getSessionUser } = require('../services/auth.service');

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

async function requireAuth(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || cookies.lumio_session;

    if (!token) {
      return res.status(401).json({ error: 'Unauthenticated. Please log in.' });
    }

    const user = await getSessionUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE] Failed to validate session:', err.message);
    res.status(401).json({ error: 'Authentication failed.' });
  }
}

module.exports = {
  parseCookies,
  requireAuth,
};
