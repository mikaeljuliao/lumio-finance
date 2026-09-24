const { normalizeWhatsAppId, resolveUserFromWhatsAppMessage } = require('../services/user.service');
const { extractExpense, detectIntent, transcribeAudio } = require('../services/ai.service');
const { createExpense } = require('../services/expense.service');
const { checkLimits, findAllLimits, formatLimits, setLimit } = require('../services/limit.service');
const { getSocketIo } = require('../socket');

// Rastrear IDs de mensagens enviadas pelo Lumio (evita loop/reprocessamento)
const sentMessageIds = new Set();

async function processMessage(msg, remoteJid, whatsappId, sock) {
  const user = await resolveUserFromWhatsAppMessage(remoteJid, msg.key.remoteJidAlt);
  if (!user) {
    console.warn(`[WHATSAPP] User not found for remoteJid: ${remoteJid} (remoteJidAlt: ${msg.key.remoteJidAlt || 'N/A'}). Ignoring.`);
    return;
  }

  const getMessageContent = (m) => {
    if (m.viewOnceMessageV2?.message) return getMessageContent(m.viewOnceMessageV2.message);
    if (m.viewOnceMessage?.message) return getMessageContent(m.viewOnceMessage.message);
    if (m.ephemeralMessage?.message) return getMessageContent(m.ephemeralMessage.message);
    return m;
  };

  const content = getMessageContent(msg.message);
  const isAudio = !!content.audioMessage;
  const messageText = (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    ''
  ).trim();

  // Ignore bot replies
  if (
    messageText.includes('✅ *Registrado:*') ||
    messageText.includes('✅ *Limite') ||
    messageText.includes('🚨') ||
    messageText.includes('🚩') ||
    messageText.includes('📋 *Seus limites') ||
    messageText.includes('🤖 *Como me usar') ||
    messageText.includes('⚠️ *Atenção:')
  ) {
    return;
  }

  console.log(`[WHATSAPP] Message from User ID ${user.id} (${whatsappId}): "${messageText || '[Audio]'}"`);

  let finalIntentText = messageText;

  if (isAudio) {
    console.log('[AUDIO] Downloading and transcribing...');
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const buffer = await downloadMediaMessage(msg, 'buffer', {});
    const transcribedText = await transcribeAudio(buffer, content.audioMessage.mimetype);
    if (transcribedText) {
      finalIntentText = transcribedText;
    } else {
      return;
    }
  }

  if (finalIntentText) {
    if (finalIntentText.startsWith('/ajuda')) {
      const helpText =
        `🤖 *Como me usar:*\n\n` +
        `1️⃣ *Registrar Gasto:* Basta falar natural, ex: "gastei 50 no bar" ou "paguei 100 de luz".\n\n` +
        `2️⃣ *Definir Limites:* Fale "meu limite de mercado é 1000" ou "limite geral 2000".\n\n` +
        `3️⃣ *Consultar:* Fale "quais meus limites?" ou "quanto já gastei?".\n\n` +
        `📊 *Categorias:* alimentação, transporte, saúde, mercado, moradia, educação, assinaturas, lazer, compras, presentes, outros.`;
      await sendWhatsAppMessage(sock, remoteJid, { text: helpText }, { quoted: msg });
      return;
    }

    console.log(`🔍 Analyzing intent with AI: "${finalIntentText}"`);
    const { intencao, valor, categoria } = await detectIntent(finalIntentText);

    if (intencao === 'DEFINIR_LIMITE' && valor) {
      const catNorm = (categoria || '').toLowerCase().trim();
      const catFinal = (!catNorm || catNorm === 'outros' || catNorm === 'geral')
        ? (finalIntentText.toLowerCase().includes('outros') ? 'outros' : 'geral')
        : catNorm;

      await setLimit(user.id, catFinal, valor);

      const msgConfirm = catFinal === 'geral'
        ? `✅ *Limite Geral Definido!*\n💰 Valor: *R$ ${Number(valor).toFixed(2)}* por mês.`
        : `✅ *Limite por Categoria Definido!*\n📁 Categoria: *${catFinal}*\n💰 Valor: *R$ ${Number(valor).toFixed(2)}* por mês.`;

      await sendWhatsAppMessage(sock, remoteJid, { text: msgConfirm }, { quoted: msg });
    } else if (intencao === 'VER_LIMITES') {
      const limits = await findAllLimits(user.id);
      await sendWhatsAppMessage(sock, remoteJid, { text: `📋 *Seus limites mensais:*\n\n${formatLimits(limits)}` }, { quoted: msg });
    } else if (intencao === 'REGISTRAR_GASTO') {
      console.log(`[AI] Extracting expense from: "${finalIntentText}"`);
      const expenseData = await extractExpense(finalIntentText);
      await handleExpenseRegistration(user.id, expenseData, remoteJid, msg, sock);
    }
  }
}

async function handleExpenseRegistration(userId, expenseData, remoteJid, msg, sock) {
  if (expenseData && expenseData.valor) {
    console.log(`[EXPENSE] Registering expense for User ID ${userId}:`, expenseData);
    let savedExpense = null;
    try {
      savedExpense = await createExpense(userId, expenseData);
      console.log(`[EXPENSE] ✅ Saved to PostgreSQL! ID: ${savedExpense.id}`);
    } catch (e) {
      console.error('[ERROR] Failed to save expense:', e);
    }

    const payload = {
      id: savedExpense ? savedExpense.id : Date.now(),
      valor: Number(expenseData.valor),
      categoria: expenseData.categoria,
      descricao: expenseData.descricao,
      data: savedExpense?.data ? savedExpense.data.toISOString().split('T')[0] : (expenseData.data || new Date().toISOString().split('T')[0]),
      created_at: savedExpense?.criadoEm ? savedExpense.criadoEm.toISOString() : new Date().toISOString(),
    };

    const io = getSocketIo();
    if (io && userId) {
      console.log(`[SOCKET] 🚀 Broadcasting novo_gasto to room user:${userId}`);
      io.to(`user:${userId}`).emit('novo_gasto', payload);
    }

    if (sock) {
      console.log(`[WHATSAPP] Sending confirmation reply to (${remoteJid})...`);
      await sendWhatsAppMessage(
        sock,
        remoteJid,
        {
          text: `✅ *Registrado:* R$ ${Number(expenseData.valor).toFixed(2)}\n📝 ${
            expenseData.descricao || 'Sem descrição'
          }\n📁 Categoria: *${expenseData.categoria}*`,
        },
        { quoted: msg }
      );
      await verifyAndNotifyLimits(userId, expenseData.valor, expenseData.categoria, remoteJid, sock);
    }
  } else {
    console.warn('[EXPENSE] Invalid expense data or missing value:', expenseData);
  }
}

async function verifyAndNotifyLimits(userId, expenseAmount, expenseCategory, remoteJid, sock) {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    console.log(`[LIMITS] Checking limits for user ${userId} on "${expenseCategory}" (R$ ${expenseAmount})...`);
    const alerts = await checkLimits(userId, expenseAmount, expenseCategory, month, year);
    for (const alert of alerts) {
      if (sock) {
        console.log(`[LIMITS] Sending alert: ${alert}`);
        await sendWhatsAppMessage(sock, remoteJid, { text: alert });
      }
    }
  } catch (err) {
    console.error('[ERROR] Failed to verify limits:', err.message);
  }
}

async function sendWhatsAppMessage(sock, jid, content, options = {}) {
  if (!sock) return null;
  try {
    const sentMsg = await sock.sendMessage(jid, content, options);
    if (sentMsg?.key?.id) {
      sentMessageIds.add(sentMsg.key.id);
      setTimeout(() => {
        sentMessageIds.delete(sentMsg.key.id);
      }, 5 * 60 * 1000);
    }
    return sentMsg;
  } catch (err) {
    console.error('[WHATSAPP] Failed to send message:', err);
    throw err;
  }
}

module.exports = {
  processMessage,
  sentMessageIds,
};
