/**
 * user.js — Gerenciamento de identidade de usuários do WhatsApp.
 *
 * Lógica de identificação:
 *   1. Se remoteJidAlt (PN) estiver disponível → usar como identificador principal
 *   2. Caso contrário, se remoteJid for @lid → tentar encontrar User pelo whatsappLid armazenado
 *   3. Não criar User novo a partir de LID desconhecido
 */
const prisma = require('./database');

/**
 * Normaliza um JID de WhatsApp ou número de telefone para o formato canônico.
 * Retorna apenas dígitos, sem @s.whatsapp.net ou @lid.
 * Retorna null para grupos (@g.us) ou entradas inválidas.
 */
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
    // Injeta o 9 apenas se parecer com um número de celular (começa com 6-9)
    if (num[0] >= '6' && num[0] <= '9') {
      digits = `55${ddd}9${num}`;
    }
  }

  return digits;
}

/**
 * Verifica se o JID fornecido é um LID (@lid).
 */
function isLidJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@lid');
}

/**
 * Extrai somente o identificador numérico do LID (sem "@lid").
 */
function extractLidNumber(lidJid) {
  if (!lidJid) return null;
  return String(lidJid).split('@')[0].replace(/\D/g, '') || null;
}

/**
 * Resolve o User a partir de uma mensagem do WhatsApp, lidando com LID/PN.
 *
 * Lógica:
 *   1. Se remoteJidAlt (PN) estiver disponível → usar como whatsappId principal
 *   2. Se remoteJid for PN normal → usar como whatsappId
 *   3. Se remoteJid for LID e não tiver remoteJidAlt → tentar encontrar User pelo whatsappLid
 *      - Se encontrar, atualizar o whatsappLid se ainda não estava registrado
 *      - Se não encontrar, NÃO criar User novo (retorna null)
 *
 * @param {string} remoteJid     - msg.key.remoteJid
 * @param {string} remoteJidAlt  - msg.key.remoteJidAlt (pode ser undefined)
 * @returns {Promise<User|null>}
 */
async function resolveUserFromWhatsAppMessage(remoteJid, remoteJidAlt) {
  // Caso 1: remoteJidAlt existe e representa um PN → usar como identificador principal
  if (remoteJidAlt) {
    const pn = normalizeWhatsAppId(remoteJidAlt);
    if (pn) {
      const lid = isLidJid(remoteJid) ? extractLidNumber(remoteJid) : null;
      console.log(`[USER] Identificando por PN (remoteJidAlt): ${pn}${lid ? ` | LID: ${lid}` : ''}`);
      return await findOrCreateUserByPN(pn, lid);
    }
  }

  // Caso 2: remoteJid é um PN normal (não LID)
  if (!isLidJid(remoteJid)) {
    const pn = normalizeWhatsAppId(remoteJid);
    if (pn) {
      console.log(`[USER] Identificando por PN (remoteJid): ${pn}`);
      return await findOrCreateUserByPN(pn, null);
    }
    return null;
  }

  // Caso 3: remoteJid é LID, sem remoteJidAlt → tentar pelo whatsappLid armazenado
  const lid = extractLidNumber(remoteJid);
  if (!lid) return null;

  console.log(`[USER] remoteJid é LID e remoteJidAlt não disponível. Buscando por whatsappLid: ${lid}`);
  const user = await prisma.user.findUnique({ where: { whatsappLid: lid } });
  if (user) {
    console.log(`[USER] ✅ User encontrado pelo whatsappLid: ${user.id}`);
    return user;
  }

  // LID desconhecido sem PN correspondente → não criar User automático
  console.warn(`[USER] ⚠️ LID desconhecido (${lid}) e sem PN. Não criando User automático.`);
  return null;
}

/**
 * Localiza ou cria um User pelo PN (whatsappId).
 * Se um LID for fornecido, armazena/atualiza o whatsappLid do User.
 */
async function findOrCreateUserByPN(pn, lid) {
  // Upsert pelo whatsappId (PN)
  let user = await prisma.user.upsert({
    where: { whatsappId: pn },
    create: { whatsappId: pn, ...(lid ? { whatsappLid: lid } : {}) },
    update: {},
  });

  // Se o LID chegou agora mas o User ainda não tinha whatsappLid registrado, atualizar
  if (lid && !user.whatsappLid) {
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { whatsappLid: lid },
      });
      console.log(`[USER] 🔗 LID ${lid} vinculado ao User ${user.id} (PN: ${pn})`);
    } catch (e) {
      // Conflito de unique (outro user já tem esse LID) → ignorar silenciosamente
      console.warn(`[USER] LID ${lid} já pertence a outro User. Não foi vinculado.`);
    }
  }

  return user;
}

/**
 * Localiza ou cria usuário pelo identificador bruto do WhatsApp (uso legado para auth).
 */
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

async function migrateExistingDataToDefaultUser() {
  try {
    const unassignedGastos = await prisma.gasto.count({ where: { userId: null } });
    const unassignedLimites = await prisma.limite.count({ where: { userId: null } });

    if (unassignedGastos > 0 || unassignedLimites > 0) {
      console.log(`[MIGRAÇÃO] Encontrados ${unassignedGastos} gastos e ${unassignedLimites} limites sem usuário.`);

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
  isLidJid,
  extractLidNumber,
  resolveUserFromWhatsAppMessage,
  findOrCreateUserByWhatsAppId,
  findUserById,
  migrateExistingDataToDefaultUser,
};
