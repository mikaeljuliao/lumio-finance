const { resolveUserFromWhatsAppMessage } = require('../services/user.service');
const { extractExpense, detectIntent, transcribeAudio } = require('../services/ai.service');
const { createExpense } = require('../services/expense.service');
const { checkLimits, findAllLimits, formatLimits, setLimit } = require('../services/limit.service');
const { getSocketIo } = require('../socket');

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const sentMessageIds = new Set();

function unwrapMessageContent(m) {
  if (m.viewOnceMessageV2?.message) return unwrapMessageContent(m.viewOnceMessageV2.message);
  if (m.viewOnceMessage?.message) return unwrapMessageContent(m.viewOnceMessage.message);
  if (m.ephemeralMessage?.message) return unwrapMessageContent(m.ephemeralMessage.message);
  return m;
}

function isBotReply(text) {
  return (
    text.includes('✅ *Registrado:*') ||
    text.includes('✅ *Limite') ||
    text.includes('🚨') ||
    text.includes('🚩') ||
    text.includes('📋 *Seus limites') ||
    text.includes('🤖 *Como me usar') ||
    text.includes('⚠️ *Atenção:')
  );
}

async function processMessage(msg, remoteJid, sock) {
  const user = await resolveUserFromWhatsAppMessage(remoteJid, msg.key.remoteJidAlt);
  if (!user) {
    console.warn(`[WHATSAPP] User not found for ${remoteJid}. Ignored.`);
    return;
  }

  const content = unwrapMessageContent(msg.message);
  const isAudio = !!content.audioMessage;
  const messageText = (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    ''
  ).trim();

  if (messageText && isBotReply(messageText)) return;

  let textToProcess = messageText;

  if (isAudio) {
    const buffer = await downloadMediaMessage(msg, 'buffer', {});
    const transcribed = await transcribeAudio(buffer, content.audioMessage.mimetype);
    if (!transcribed) return;
    textToProcess = transcribed;
  }

  if (!textToProcess) return;

  if (textToProcess.startsWith('/ajuda')) {
    const helpText =
      `🤖 *Como me usar:*\n\n` +
      `1️⃣ *Registrar Gasto:* Basta falar natural, ex: "gastei 50 no bar" ou "paguei 100 de luz".\n\n` +
      `2️⃣ *Definir Limites:* Fale "meu limite de mercado é 1000" ou "limite geral 2000".\n\n` +
      `3️⃣ *Consultar:* Fale "quais meus limites?" ou "quanto já gastei?".\n\n` +
      `📊 *Categorias:* alimentação, transporte, saúde, mercado, moradia, educação, assinaturas, lazer, compras, presentes, outros.`;
    await sendMessage(sock, remoteJid, { text: helpText }, { quoted: msg });
    return;
  }

  const { intencao, valor, categoria } = await detectIntent(textToProcess);

  if (intencao === 'DEFINIR_LIMITE' && valor) {
    const catNorm = (categoria || '').toLowerCase().trim();
    const catFinal = (!catNorm || catNorm === 'outros' || catNorm === 'geral')
      ? (textToProcess.toLowerCase().includes('outros') ? 'outros' : 'geral')
      : catNorm;

    await setLimit(user.id, catFinal, valor);

    const confirmText = catFinal === 'geral'
      ? `✅ *Limite Geral Definido!*\n💰 Valor: *R$ ${Number(valor).toFixed(2)}* por mês.`
      : `✅ *Limite por Categoria Definido!*\n📁 Categoria: *${catFinal}*\n💰 Valor: *R$ ${Number(valor).toFixed(2)}* por mês.`;

    await sendMessage(sock, remoteJid, { text: confirmText }, { quoted: msg });
  } else if (intencao === 'VER_LIMITES') {
    const limits = await findAllLimits(user.id);
    await sendMessage(sock, remoteJid, { text: `📋 *Seus limites mensais:*\n\n${formatLimits(limits)}` }, { quoted: msg });
  } else if (intencao === 'REGISTRAR_GASTO') {
    const expenseData = await extractExpense(textToProcess);
    await saveAndBroadcastExpense(user.id, expenseData, remoteJid, msg, sock);
  }
}

async function saveAndBroadcastExpense(userId, expenseData, remoteJid, msg, sock) {
  if (!expenseData?.valor) return;

  let saved = null;
  try {
    saved = await createExpense(userId, expenseData);
  } catch (e) {
    console.error('[EXPENSE] Failed to save:', e);
  }

  const payload = {
    id: saved?.id ?? Date.now(),
    valor: Number(expenseData.valor),
    categoria: expenseData.categoria,
    descricao: expenseData.descricao,
    data: saved?.data ? saved.data.toISOString().split('T')[0] : (expenseData.data || new Date().toISOString().split('T')[0]),
    created_at: saved?.criadoEm ? saved.criadoEm.toISOString() : new Date().toISOString(),
  };

  const io = getSocketIo();
  if (io) {
    io.to(`user:${userId}`).emit('novo_gasto', payload);
  }

  if (sock) {
    await sendMessage(
      sock,
      remoteJid,
      { text: `✅ *Registrado:* R$ ${Number(expenseData.valor).toFixed(2)}\n📝 ${expenseData.descricao || 'Sem descrição'}\n📁 Categoria: *${expenseData.categoria}*` },
      { quoted: msg }
    );
    await notifyLimitAlerts(userId, expenseData.valor, expenseData.categoria, remoteJid, sock);
  }
}

async function notifyLimitAlerts(userId, amount, category, remoteJid, sock) {
  try {
    const now = new Date();
    const alerts = await checkLimits(userId, amount, category, now.getMonth() + 1, now.getFullYear());
    for (const alert of alerts) {
      await sendMessage(sock, remoteJid, { text: alert });
    }
  } catch (err) {
    console.error('[LIMITS] Failed to check limits:', err.message);
  }
}

async function sendMessage(sock, jid, content, options = {}) {
  if (!sock) return null;
  try {
    const sent = await sock.sendMessage(jid, content, options);
    if (sent?.key?.id) {
      sentMessageIds.add(sent.key.id);
      setTimeout(() => sentMessageIds.delete(sent.key.id), 5 * 60 * 1000);
    }
    return sent;
  } catch (err) {
    console.error('[WHATSAPP] Failed to send message:', err);
    throw err;
  }
}

module.exports = { processMessage, sentMessageIds };
