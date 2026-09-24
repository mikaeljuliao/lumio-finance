/**
 * user.js — Gerenciamento de identidade de usuários do WhatsApp e migração.
 */
const prisma = require('./database');

function normalizeWhatsAppId(jidOrPhone) {
  if (!jidOrPhone) return null;
  const str = String(jidOrPhone).trim();

  // Ignorar mensagens de grupo (@g.us)
  if (str.includes('@g.us')) {
    return null;
  }

  // Extrair apenas dígitos do JID ou string
  let digits = str.split('@')[0].replace(/\D/g, '');
  if (!digits || digits.length < 8) {
    return null;
  }

  // Se for informado sem o DDI 55 (10 ou 11 dígitos), adiciona 55 no início
  if (digits.length === 10 || digits.length === 11) {
    if (!digits.startsWith('55')) {
      digits = '55' + digits;
    }
  }

  // Tratar JID legado do WhatsApp sem o 9º dígito (ex: 55 + DDD 85 + 8 dígitos = 12 dígitos)
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    // WhatsApp cellphones start with 6, 7, 8, 9.
    // Injeta o 9 apenas se parecer com um número de celular
    if (num[0] >= '6' && num[0] <= '9') {
      digits = `55${ddd}9${num}`;
    }
  }

  return digits;
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
  return await prisma.user.findUnique({
    where: { id },
  });
}

async function migrateExistingDataToDefaultUser() {
  try {
    const unassignedGastos = await prisma.gasto.count({ where: { userId: null } });
    const unassignedLimites = await prisma.limite.count({ where: { userId: null } });

    if (unassignedGastos > 0 || unassignedLimites > 0) {
      console.log(`[MIGRAÇÃO] Encontrados ${unassignedGastos} gastos e ${unassignedLimites} limites sem usuário.`);

      // Criar ou localizar usuário legado padrão para os dados existentes
      let defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: { whatsappId: '5511999999999' },
        });
      }

      if (unassignedGastos > 0) {
        await prisma.gasto.updateMany({
          where: { userId: null },
          data: { userId: defaultUser.id },
        });
      }

      if (unassignedLimites > 0) {
        await prisma.limite.updateMany({
          where: { userId: null },
          data: { userId: defaultUser.id },
        });
      }

      console.log(`[MIGRAÇÃO] ✅ Registros legados migrados com sucesso para o usuário ID: ${defaultUser.id}`);
    }
  } catch (err) {
    console.error('[ERRO MIGRAÇÃO] Falha ao migrar dados existentes:', err);
  }
}

module.exports = {
  normalizeWhatsAppId,
  findOrCreateUserByWhatsAppId,
  findUserById,
  migrateExistingDataToDefaultUser,
};
