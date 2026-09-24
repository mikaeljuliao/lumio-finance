/**
 * auth.js — Autenticação direta via número de WhatsApp e gerenciamento de sessões do Lumio.
 */
const crypto = require('crypto');
const prisma = require('./database');
const { normalizeWhatsAppId, findOrCreateUserByWhatsAppId } = require('./user');

/**
 * Autentica ou registra um usuário diretamente pelo seu número de WhatsApp.
 * Cria a sessão web e retorna o token de sessão e os dados do usuário.
 * @param {string} phoneInput 
 * @returns {Promise<{ sessionToken: string, user: object }>}
 */
async function loginWithPhone(phoneInput) {
  const whatsappId = normalizeWhatsAppId(phoneInput);
  if (!whatsappId) {
    throw new Error('Número de WhatsApp inválido. Informe um número com DDD.');
  }

  // Localizar ou criar usuário
  const user = await findOrCreateUserByWhatsAppId(whatsappId);
  if (!user) {
    throw new Error('Falha ao registrar usuário.');
  }

  // Gerar token de sessão (30 dias)
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      token: sessionToken,
      userId: user.id,
      expiraEm: sessionExpiresAt,
    },
  });

  return {
    sessionToken,
    user: {
      id: user.id,
      whatsappId: user.whatsappId,
      criadoEm: user.criadoEm,
    },
  };
}

/**
 * Recupera o usuário associado a um token de sessão válido.
 * @param {string} token 
 */
async function getSessionUser(token) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiraEm < new Date()) {
    // Sessão expirada
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return session.user;
}

/**
 * Invalida/destrói uma sessão.
 * @param {string} token 
 */
async function invalidateSession(token) {
  if (!token) return;
  await prisma.session.deleteMany({
    where: { token },
  }).catch(() => {});
}

module.exports = {
  loginWithPhone,
  getSessionUser,
  invalidateSession,
};
