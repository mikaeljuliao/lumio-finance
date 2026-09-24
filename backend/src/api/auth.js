const express = require('express');
const { loginWithPhone, invalidateSession } = require('../services/auth.service');
const { requireAuth, parseCookies } = require('./middlewares');

const router = express.Router();

router.post('/login-start', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório' }); // Keep UI error message in Portuguese
    }
    const result = await loginWithPhone(phone);

    const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.secure;
    const sameSite = isHttps ? 'None' : 'Lax';
    const securePart = isHttps ? '; Secure' : '';

    res.setHeader(
      'Set-Cookie',
      `lumio_session=${result.sessionToken}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${
        30 * 24 * 60 * 60
      }${securePart}`
    );

    res.json({
      success: true,
      user: result.user,
      token: result.sessionToken,
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      whatsappId: req.user.whatsappId,
      criadoEm: req.user.criadoEm,
    },
  });
});

router.post('/logout', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.lumio_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      await invalidateSession(token);
    }
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = isProduction ? 'None' : 'Lax';
    const securePart = isProduction ? '; Secure' : '';
    res.setHeader('Set-Cookie', `lumio_session=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${securePart}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao realizar logout' });
  }
});

module.exports = router;
