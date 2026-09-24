const crypto = require('crypto');
const prisma = require('../config/prisma');
const { findOrCreateUserByWhatsAppId, normalizeWhatsAppId } = require('./user.service');

async function loginWithPhone(phoneInput) {
  const whatsappId = normalizeWhatsAppId(phoneInput);
  if (!whatsappId) {
    throw new Error('Invalid WhatsApp number. Please provide a valid number with country and area code.');
  }

  const user = await findOrCreateUserByWhatsAppId(whatsappId);
  if (!user) {
    throw new Error('Failed to register user.');
  }

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

async function getSessionUser(token) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiraEm < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return session.user;
}

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
