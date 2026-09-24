const prisma = require('../config/prisma');

function normalizeWhatsAppId(jidOrPhone) {
  if (!jidOrPhone) return null;
  const str = String(jidOrPhone).trim();

  if (str.includes('@g.us')) {
    return null;
  }

  let digits = str.split('@')[0].replace(/\D/g, '');
  if (!digits || digits.length < 8) {
    return null;
  }

  if (digits.length === 10 || digits.length === 11) {
    if (!digits.startsWith('55')) {
      digits = '55' + digits;
    }
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    const areaCode = digits.slice(2, 4);
    const num = digits.slice(4);
    if (num[0] >= '6' && num[0] <= '9') {
      digits = `55${areaCode}9${num}`;
    }
  }

  return digits;
}

function isLidJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@lid');
}

function extractLidNumber(lidJid) {
  if (!lidJid) return null;
  return String(lidJid).split('@')[0].replace(/\D/g, '') || null;
}

async function findOrCreateUserByPN(pn, lid) {
  let user = await prisma.user.upsert({
    where: { whatsappId: pn },
    create: { whatsappId: pn, ...(lid ? { whatsappLid: lid } : {}) },
    update: {},
  });

  if (lid && !user.whatsappLid) {
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { whatsappLid: lid },
      });
      console.log(`[USER] Linked LID ${lid} to User ${user.id} (PN: ${pn})`);
    } catch (e) {
      console.warn(`[USER] LID ${lid} already belongs to another User. Not linked.`);
    }
  }

  return user;
}

async function resolveUserFromWhatsAppMessage(remoteJid, remoteJidAlt) {
  if (remoteJidAlt) {
    const pn = normalizeWhatsAppId(remoteJidAlt);
    if (pn) {
      const lid = isLidJid(remoteJid) ? extractLidNumber(remoteJid) : null;
      return await findOrCreateUserByPN(pn, lid);
    }
  }

  if (!isLidJid(remoteJid)) {
    const pn = normalizeWhatsAppId(remoteJid);
    if (pn) {
      return await findOrCreateUserByPN(pn, null);
    }
    return null;
  }

  const lid = extractLidNumber(remoteJid);
  if (!lid) return null;

  const user = await prisma.user.findUnique({ where: { whatsappLid: lid } });
  if (user) {
    return user;
  }

  console.warn(`[USER] Unknown LID (${lid}) without PN. User not created.`);
  return null;
}

async function findOrCreateUserByWhatsAppId(rawId) {
  const whatsappId = normalizeWhatsAppId(rawId);
  if (!whatsappId) return null;

  return await prisma.user.upsert({
    where: { whatsappId },
    create: { whatsappId },
    update: {},
  });
}

async function findUserById(id) {
  if (!id) return null;
  return await prisma.user.findUnique({ where: { id } });
}

module.exports = {
  normalizeWhatsAppId,
  isLidJid,
  extractLidNumber,
  resolveUserFromWhatsAppMessage,
  findOrCreateUserByWhatsAppId,
  findUserById,
};
