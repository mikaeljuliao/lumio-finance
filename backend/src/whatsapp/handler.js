const { resolveUserFromWhatsAppMessage } = require('../services/user.service');
const { extractExpense, detectIntent, transcribeAudio, parseExpenseFollowUp, normalizeCategoryChoice, CATEGORY_OPTIONS } = require('../services/ai.service');
const { createExpense } = require('../services/expense.service');
const { checkLimits, findAllLimits, formatLimits, setLimit } = require('../services/limit.service');
const { getSocketIo } = require('../socket');

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const sentMessageIds = new Set();
const pendingExpenseByUser = new Map();
const pendingIntentSelectionByUser = new Map();

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
    text.includes('🤖 *Como posso ajudar?') ||
    text.includes('⚠️ *Atenção:')
  );
}

function getHelpReply() {
  return (
    `🤖 *Como posso ajudar?*\n\n` +
    `• Registrar gasto: "gastei R$ 35 no almoço"\n` +
    `• Definir limite: "limite de R$ 300 em lazer"\n` +
    `• Consultar limites: "quais são meus limites?"\n\n` +
    `Você também pode mandar um áudio. O que gostaria de fazer?`
  );
}

function getPendingExpensePrompt() {
  return 'Tudo bem. Qual foi o valor e quando foi? Exemplo: "R$ 80, 05/10" ou "R$ 80, hoje".';
}

function getMissingDatePrompt() {
  return 'Tudo bem. Quando foi esse gasto? Exemplo: "hoje" ou "05/10".';
}

function getCategorySelectionPrompt() {
  return 'Não tenho certeza da categoria. Escolha uma opção:\n' + CATEGORY_OPTIONS.map((category, index) => `${index + 1}. ${category}`).join('\n');
}

function getConfirmationPrompt(expense) {
  const value = Number(expense.valor || 0).toFixed(2);
  const category = expense.categoria || 'outros';
  const date = expense.data || new Date().toISOString().split('T')[0];
  return `Entendi: gasto de *R$ ${value}* em *${category}* na data *${date}*. Confirmar? Responda *sim* ou *não*.`;
}

function getMultiIntentPrompt(actions) {
  const labels = actions.map(action => action === 'REGISTRAR_GASTO' ? 'gasto' : 'limites');
  return `Você mencionou mais de uma ação: ${labels.join(' e ')}. Responda *gasto* para registrar o gasto ou *limites* para consultar seus limites.`;
}

function normalizeIntentChoice(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return null;
  if (/^(gasto|despesa|registrar|registrar gasto|registrar despesa)$/i.test(normalized)) return 'REGISTRAR_GASTO';
  if (/^(limite|limites|consultar|consultar limites|ver limites|ver)$/i.test(normalized)) return 'VER_LIMITES';
  return null;
}

function isConfirmationPositive(text) {
  const normalized = String(text || '').toLowerCase().trim();
  return /^(sim|confirmo|ok|certo|salvar|yes|aceito|continue)$/i.test(normalized);
}

function isConfirmationNegative(text) {
  const normalized = String(text || '').toLowerCase().trim();
  return /^(nao|não|cancelar|corrigir|editar|não salvar|no)$/i.test(normalized);
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
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      const transcribed = await transcribeAudio(buffer, content.audioMessage.mimetype);
      if (!transcribed) {
        await sendMessage(sock, remoteJid, {
          text: 'Não consegui entender esse áudio. Pode enviar outro ou escrever a mensagem?'
        }, { quoted: msg });
        return;
      }
      textToProcess = String(transcribed).trim();
    } catch (error) {
      console.error('[WHATSAPP] Audio processing error:', error.message);
      await sendMessage(sock, remoteJid, {
        text: 'Tive um problema para ouvir esse áudio. Tente novamente ou envie sua mensagem por texto.'
      }, { quoted: msg });
      return;
    }
  }

  if (!textToProcess) {
    const reply = isAudio
      ? 'Não consegui entender esse áudio. Pode enviar outro ou escrever a mensagem?'
      : 'Por enquanto consigo entender mensagens de texto e áudio. Conte um gasto ou peça ajuda para começar.';
    await sendMessage(sock, remoteJid, { text: reply }, { quoted: msg });
    return;
  }

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

  const pendingIntentSelection = pendingIntentSelectionByUser.get(user.id);
  if (pendingIntentSelection) {
    const selectedAction = normalizeIntentChoice(textToProcess);
    if (!selectedAction) {
      await sendMessage(sock, remoteJid, { text: getMultiIntentPrompt(pendingIntentSelection.actions) }, { quoted: msg });
      return;
    }

    pendingIntentSelectionByUser.delete(user.id);

    if (selectedAction === 'REGISTRAR_GASTO') {
      const expenseData = await extractExpense(pendingIntentSelection.originalText || textToProcess);
      if (!Number.isFinite(Number(expenseData?.valor)) || Number(expenseData.valor) <= 0) {
        pendingExpenseByUser.set(user.id, { categoria: expenseData?.categoria || 'outros', descricao: expenseData?.descricao || 'Gasto registrado', sourceText: pendingIntentSelection.originalText || textToProcess, stage: 'collect_data' });
        await sendMessage(sock, remoteJid, { text: getPendingExpensePrompt() }, { quoted: msg });
        return;
      }
      await saveAndBroadcastExpense(user.id, expenseData, remoteJid, msg, sock);
      return;
    }

    const limits = await findAllLimits(user.id);
    await sendMessage(sock, remoteJid, { text: `📋 *Seus limites mensais:*\n\n${formatLimits(limits)}` }, { quoted: msg });
    return;
  }

  const pendingExpense = pendingExpenseByUser.get(user.id);
  if (pendingExpense) {
    if (pendingExpense.stage === 'choose_category') {
      const resolvedCategory = normalizeCategoryChoice(textToProcess);
      if (resolvedCategory === 'outros' && !CATEGORY_OPTIONS.some(category => textToProcess.toLowerCase().includes(category.toLowerCase()))) {
        await sendMessage(sock, remoteJid, { text: getCategorySelectionPrompt() }, { quoted: msg });
        return;
      }

      pendingExpense.categoria = resolvedCategory;
      pendingExpense.stage = 'confirm_save';
      await sendMessage(sock, remoteJid, { text: getConfirmationPrompt(pendingExpense) }, { quoted: msg });
      return;
    }

    if (pendingExpense.stage === 'confirm_save') {
      if (isConfirmationPositive(textToProcess)) {
        pendingExpenseByUser.delete(user.id);
        await saveAndBroadcastExpense(user.id, pendingExpense, remoteJid, msg, sock);
        return;
      }

      if (isConfirmationNegative(textToProcess)) {
        pendingExpenseByUser.delete(user.id);
        await sendMessage(sock, remoteJid, { text: 'Tudo bem. Podemos tentar de novo.' }, { quoted: msg });
        return;
      }

      await sendMessage(sock, remoteJid, { text: getConfirmationPrompt(pendingExpense) }, { quoted: msg });
      return;
    }

    const followUpValue = parseExpenseFollowUp(textToProcess);
    const explicitDate = /((\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?|hoje|amanh|hje|tomorrow)/i.test(textToProcess);

    if (!followUpValue && !explicitDate) {
      pendingExpenseByUser.set(user.id, {
        ...pendingExpense,
        stage: 'collect_data',
      });
      await sendMessage(sock, remoteJid, { text: getMissingDatePrompt() }, { quoted: msg });
      return;
    }

    const resolvedCategory = normalizeCategoryChoice(`${pendingExpense.descricao || ''} ${textToProcess}`);
    const finalExpense = {
      valor: followUpValue?.valor ?? pendingExpense.valor ?? 0,
      categoria: resolvedCategory === 'outros' ? (pendingExpense.categoria || 'outros') : resolvedCategory,
      descricao: pendingExpense.descricao || 'Gasto registrado',
      data: followUpValue?.data ?? new Date().toISOString().split('T')[0],
      stage: 'confirm_save',
    };

    if (!pendingExpense.categoria || pendingExpense.categoria === 'outros' || resolvedCategory === 'outros') {
      pendingExpenseByUser.set(user.id, {
        ...finalExpense,
        stage: 'choose_category',
      });
      await sendMessage(sock, remoteJid, { text: getCategorySelectionPrompt() }, { quoted: msg });
      return;
    }

    pendingExpenseByUser.set(user.id, {
      ...finalExpense,
      stage: 'confirm_save',
    });
    await sendMessage(sock, remoteJid, { text: getConfirmationPrompt(finalExpense) }, { quoted: msg });
    return;
  }

  const { intencao, valor, categoria, actions } = await detectIntent(textToProcess);

  if (intencao === 'MULTIPLE_ACTIONS') {
    const actionList = Array.isArray(actions) && actions.length ? actions : ['REGISTRAR_GASTO', 'VER_LIMITES'];
    pendingIntentSelectionByUser.set(user.id, {
      actions: actionList,
      originalText: textToProcess,
    });
    await sendMessage(sock, remoteJid, { text: getMultiIntentPrompt(actionList) }, { quoted: msg });
    return;
  }

  if (intencao === 'DEFINIR_LIMITE') {
    if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) {
      await sendMessage(sock, remoteJid, {
        text: 'Qual valor você quer definir para esse limite? Exemplo: "limite de R$ 300 em lazer".'
      }, { quoted: msg });
      return;
    }

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
    if (!Number.isFinite(Number(expenseData?.valor)) || Number(expenseData.valor) <= 0) {
      const category = expenseData?.categoria || 'outros';
      const description = (expenseData?.descricao || textToProcess.replace(/gastei|paguei|comprei/gi, '').trim()) || 'Gasto';
      pendingExpenseByUser.set(user.id, { categoria: category, descricao: description, sourceText: textToProcess, stage: 'collect_data' });
      await sendMessage(sock, remoteJid, {
        text: getPendingExpensePrompt(),
      }, { quoted: msg });
      return;
    }

    const hasExplicitDate = /(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|hoje|amanh|hje|tomorrow)/i.test(textToProcess);
    if (!hasExplicitDate) {
      pendingExpenseByUser.set(user.id, {
        categoria: expenseData.categoria || 'outros',
        descricao: expenseData.descricao || 'Gasto registrado',
        valor: Number(expenseData.valor),
        sourceText: textToProcess,
        stage: 'collect_data',
      });
      await sendMessage(sock, remoteJid, {
        text: getMissingDatePrompt(),
      }, { quoted: msg });
      return;
    }

    if ((expenseData.categoria || 'outros') === 'outros') {
      pendingExpenseByUser.set(user.id, {
        categoria: 'outros',
        descricao: expenseData.descricao || 'Gasto registrado',
        valor: Number(expenseData.valor),
        data: expenseData.data || new Date().toISOString().split('T')[0],
        sourceText: textToProcess,
        stage: 'choose_category',
      });
      await sendMessage(sock, remoteJid, { text: getCategorySelectionPrompt() }, { quoted: msg });
      return;
    }

    pendingExpenseByUser.set(user.id, {
      categoria: expenseData.categoria,
      descricao: expenseData.descricao || 'Gasto registrado',
      valor: Number(expenseData.valor),
      data: expenseData.data || new Date().toISOString().split('T')[0],
      sourceText: textToProcess,
      stage: 'confirm_save',
    });
    await sendMessage(sock, remoteJid, { text: getConfirmationPrompt({ valor: expenseData.valor, categoria: expenseData.categoria, data: expenseData.data || new Date().toISOString().split('T')[0] }) }, { quoted: msg });
    return;
  } else {
    await sendMessage(sock, remoteJid, { text: getHelpReply() }, { quoted: msg });
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
