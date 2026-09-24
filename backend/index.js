console.log(">>> Iniciando processo do backend do Lumio...");
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const { extrairGastos, detectarIntencao } = require('./gemini');
const { transcreverAudio } = require('./transcrever');
const {
  salvarGasto,
  buscarTodosGastos,
  buscarGastosDoMes,
  atualizarGasto,
  deletarGasto,
  limparGastosDoMes,
} = require('./gastos');
const {
  definirLimite,
  removerLimite,
  buscarTodosLimites,
  verificarLimites,
  formatarLimites,
} = require('./limites');
const {
  normalizeWhatsAppId,
  resolveUserFromWhatsAppMessage,
  findOrCreateUserByWhatsAppId,
  migrateExistingDataToDefaultUser,
} = require('./user');
const {
  loginWithPhone,
  getSessionUser,
  invalidateSession,
} = require('./auth');
const { parseCookies, requireAuth } = require('./authMiddleware');

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://powerful-essence-production-0894.up.railway.app',
  // Frontend em producao (configurar FRONTEND_URL no Railway se necessario)
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite sem origin (curl, mobile, server-to-server) e origens permitidas
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Origem bloqueada: ${origin}`);
        callback(null, true); // permissivo por ora — restrinja em producao quando houver dominio fixo
      }
    },
    credentials: true,
  })
);

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

let sock = null;
let currentQR = null;
let isConnected = false;
let isConnecting = false;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let consecutive428Count = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const AUTH_FOLDER = path.join(__dirname, 'auth_info_baileys');

// Set em escopo de módulo para rastrear IDs de mensagens enviadas pelo Lumio (evita loop/reprocessamento)
const sentMessageIds = new Set();

async function sendWhatsAppMessage(jid, content, options = {}) {
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
    console.error('[WHATSAPP] Erro ao enviar mensagem:', err);
    throw err;
  }
}

// ─── AUTH REST API ─────────────────────────────────────────────────────────────

app.post('/api/auth/login-start', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório' });
    }
    const result = await loginWithPhone(phone);

    // Tentar setar cookie (funciona quando frontend e backend estão no mesmo domínio)
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.secure;
    const sameSite = isHttps ? 'None' : 'Lax';
    const securePart = isHttps ? '; Secure' : '';

    res.setHeader(
      'Set-Cookie',
      `lumio_session=${result.sessionToken}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${
        30 * 24 * 60 * 60
      }${securePart}`
    );

    // Também retornar o token no body para ambientes onde cookies cross-origin são bloqueados
    res.json({
      success: true,
      user: result.user,
      token: result.sessionToken,
    });
  } catch (err) {
    console.error('[AUTH] Erro ao realizar login:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      whatsappId: req.user.whatsappId,
      criadoEm: req.user.criadoEm,
    },
  });
});

app.post('/api/auth/logout', async (req, res) => {
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

// ─── FINANCIAL REST API (ISOLADA POR USER_ID) ──────────────────────────────

app.get('/api/gastos', requireAuth, async (req, res) => {
  try {
    const me = req.query.mes ? parseInt(req.query.mes) : null;
    const ano = req.query.ano ? parseInt(req.query.ano) : null;
    let gastos;
    if (me && ano) {
      gastos = await buscarGastosDoMes(req.userId, me, ano);
    } else {
      gastos = await buscarTodosGastos(req.userId);
    }
    res.json(gastos);
  } catch (err) {
    console.error('[API] Erro ao buscar gastos:', err);
    res.status(500).json({ error: 'Erro ao buscar gastos' });
  }
});

app.post('/api/gastos', requireAuth, async (req, res) => {
  try {
    const { valor, categoria, descricao, data } = req.body;
    if (!valor) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }
    const gasto = await salvarGasto(req.userId, { valor, categoria, descricao, data });

    const payloadGasto = {
      id: gasto.id,
      valor: Number(gasto.valor),
      categoria: gasto.categoria,
      descricao: gasto.descricao,
      data: gasto.data ? String(gasto.data).split('T')[0] : new Date().toISOString().split('T')[0],
      created_at: gasto.criadoEm.toISOString(),
    };

    io.to(`user:${req.userId}`).emit('novo_gasto', payloadGasto);
    res.json(payloadGasto);
  } catch (err) {
    console.error('[API] Erro ao criar gasto:', err);
    res.status(500).json({ error: 'Erro ao criar gasto' });
  }
});

app.put('/api/gastos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { valor, categoria, descricao, data } = req.body;
    await atualizarGasto(req.userId, id, { valor, categoria, descricao, data });
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Erro ao atualizar gasto:', err);
    res.status(500).json({ error: 'Erro ao atualizar gasto' });
  }
});

app.delete('/api/gastos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await deletarGasto(req.userId, id);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Erro ao deletar gasto:', err);
    res.status(500).json({ error: 'Erro ao deletar gasto' });
  }
});

app.delete('/api/gastos', requireAuth, async (req, res) => {
  try {
    const me = req.query.mes ? parseInt(req.query.mes) : null;
    const ano = req.query.ano ? parseInt(req.query.ano) : null;
    if (me && ano) {
      await limparGastosDoMes(req.userId, me, ano);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Erro ao limpar gastos:', err);
    res.status(500).json({ error: 'Erro ao limpar gastos' });
  }
});

app.get('/api/limites', requireAuth, async (req, res) => {
  try {
    const limites = await buscarTodosLimites(req.userId);
    res.json(limites);
  } catch (err) {
    console.error('[API] Erro ao buscar limites:', err);
    res.status(500).json({ error: 'Erro ao buscar limites' });
  }
});

app.post('/api/limites', requireAuth, async (req, res) => {
  try {
    const { categoria, valor } = req.body;
    const limite = await definirLimite(req.userId, categoria, valor);
    res.json(limite);
  } catch (err) {
    console.error('[API] Erro ao definir limite:', err);
    res.status(500).json({ error: 'Erro ao definir limite' });
  }
});

app.delete('/api/limites/:categoria', requireAuth, async (req, res) => {
  try {
    const { categoria } = req.params;
    await removerLimite(req.userId, categoria);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Erro ao remover limite:', err);
    res.status(500).json({ error: 'Erro ao remover limite' });
  }
});

// ─── Verificação de Limites e Notificação ─────────────────────────────────────

async function verificarENotificarLimites(userId, valorGasto, categoriaGasto, remoteJid) {
  try {
    const agora = new Date();
    const mes = agora.getMonth() + 1;
    const ano = agora.getFullYear();
    console.log(`[LIMITES] Verificando limites do usuário ${userId} para "${categoriaGasto}" (R$ ${valorGasto})...`);
    const alertas = await verificarLimites(userId, valorGasto, categoriaGasto, mes, ano);
    for (const alerta of alertas) {
      if (sock) {
        console.log(`[LIMITES] Enviando alerta ao WhatsApp: ${alerta}`);
        await sendWhatsAppMessage(remoteJid, { text: alerta });
      }
    }
  } catch (err) {
    console.error('[ERRO] Falha ao verificar limites:', err.message);
  }
}

// ─── WhatsApp / Baileys ───────────────────────────────────────────────────────

async function connectToWhatsApp() {
  if (isConnecting) {
    console.log('[WHATSAPP] Conexão já em andamento, ignorando chamada duplicada.');
    return;
  }
  isConnecting = true;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();
    console.log('[WHATSAPP] Versão Baileys obtida:', version);
    const logger = pino({ level: 'error' });

    if (sock) {
      try {
        sock.ev.removeAllListeners();
        if (sock.ws) {
          sock.ws.close();
        }
        sock.end(undefined);
      } catch (e) {}
      sock = null;
    }

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === 'connecting') {
        console.log('[WHATSAPP] STATUS: connecting — Conectando ao WhatsApp do Lumio...');
      }

      if (qr) {
        try {
          console.log('[WHATSAPP] QR Code gerado para o número do Lumio!');
          currentQR = await QRCode.toDataURL(qr);
          isConnected = false;
          isConnecting = false;
        } catch (err) {
          console.error('[WHATSAPP] Erro ao gerar imagem QR:', err);
        }
      }

      if (connection === 'close') {
        isConnecting = false;
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.statusCode ||
          0;
        console.log(`[WHATSAPP] Conexão encerrada. Código: ${statusCode}`);

        currentQR = null;
        isConnected = false;

        const isLoggedOut =
          statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isRestartRequired =
          statusCode === DisconnectReason.restartRequired || statusCode === 515;
        const isConnectionClosed =
          statusCode === 428 || statusCode === DisconnectReason.connectionClosed;

        if (isLoggedOut) {
          console.log('[WHATSAPP] Sessão encerrada (logged out). Limpando credenciais...');
          reconnectAttempts = 0;
          consecutive428Count = 0;
          try {
            if (fs.existsSync(AUTH_FOLDER)) {
              fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            }
          } catch (e) {}
        } else if (isRestartRequired) {
          scheduleReconnect(1000);
        } else if (isConnectionClosed) {
          consecutive428Count++;
          if (consecutive428Count >= 3 && !isConnected) {
            consecutive428Count = 0;
            reconnectAttempts = 0;
            try {
              if (fs.existsSync(AUTH_FOLDER)) {
                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
              }
            } catch (e) {}
            scheduleReconnect(1000);
          } else {
            scheduleReconnect(3000);
          }
        } else {
          scheduleReconnect(3000);
        }
      } else if (connection === 'open') {
        isConnecting = false;
        reconnectAttempts = 0;
        consecutive428Count = 0;
        currentQR = null;
        isConnected = true;
        console.log('[WHATSAPP] ✅ WhatsApp central do Lumio Conectado com sucesso!');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

          // Ignora mensagens enviadas pelo próprio Lumio
          if (msg.key.id && sentMessageIds.has(msg.key.id)) {
            sentMessageIds.delete(msg.key.id);
            console.log(`[WHATSAPP] Ignorando mensagem do bot (ID: ${msg.key.id})`);
            continue;
          }

          const remoteJid = msg.key.remoteJid;
          const whatsappId = normalizeWhatsAppId(remoteJid);

          // Ignorar mensagens de grupo (@g.us) ou sem ID válido
          if (!whatsappId) {
            continue;
          }

          // O Lumio atua como um bot receptivo. Ignora QUALQUER mensagem que o próprio celular enviar.
          if (msg.key.fromMe) {
            continue;
          }

          // Identificar o Usuário no Banco de Dados pelo remoteJid (suporte a LID e PN)
          // msg.key.remoteJidAlt contém o PN real quando a mensagem chegou como @lid
          const user = await resolveUserFromWhatsAppMessage(remoteJid, msg.key.remoteJidAlt);
          if (!user) {
            console.warn(`[WHATSAPP] Usuário não identificado para remoteJid: ${remoteJid} (remoteJidAlt: ${msg.key.remoteJidAlt || 'N/A'}). Ignorando mensagem.`);
            continue;
          }

          const getMessageContent = (m) => {
            if (m.viewOnceMessageV2?.message)
              return getMessageContent(m.viewOnceMessageV2.message);
            if (m.viewOnceMessage?.message)
              return getMessageContent(m.viewOnceMessage.message);
            if (m.ephemeralMessage?.message)
              return getMessageContent(m.ephemeralMessage.message);
            return m;
          };

          const content = getMessageContent(msg.message);
          const isAudio = !!content.audioMessage;
          const textoMensagem = (
            content.conversation ||
            content.extendedTextMessage?.text ||
            content.imageMessage?.caption ||
            content.videoMessage?.caption ||
            ''
          ).trim();

          // Ignorar mensagens de resposta do próprio bot (filtro adicional)
          if (
            textoMensagem.includes('✅ *Registrado:*') ||
            textoMensagem.includes('✅ *Limite') ||
            textoMensagem.includes('🚨') ||
            textoMensagem.includes('🚩') ||
            textoMensagem.includes('📋 *Seus limites') ||
            textoMensagem.includes('🤖 *Como me usar') ||
            textoMensagem.includes('⚠️ *Atenção:')
          ) {
            continue;
          }

          console.log(`[WHATSAPP] Mensagem do User ID ${user.id} (${whatsappId}): "${textoMensagem || '[Áudio]'}"`);

          if (isAudio) {
            console.log('[AUDIO] Transcrevendo áudio...');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const textoTranscrito = await transcreverAudio(
              buffer,
              content.audioMessage.mimetype
            );
            if (textoTranscrito) {
              console.log(`[AUDIO] Transcrição: "${textoTranscrito}"`);
              const dadosGasto = await extrairGastos(textoTranscrito);
              await registrarGasto(user.id, dadosGasto, remoteJid, msg);
            }
          } else if (textoMensagem) {
            if (textoMensagem.startsWith('/ajuda')) {
              const ajuda =
                `🤖 *Como me usar:*\n\n` +
                `1️⃣ *Registrar Gasto:* Basta falar natural, ex: "gastei 50 no bar" ou "paguei 100 de luz".\n\n` +
                `2️⃣ *Definir Limites:* Fale "meu limite de mercado é 1000" ou "limite geral 2000".\n\n` +
                `3️⃣ *Consultar:* Fale "quais meus limites?" ou "quanto já gastei?".\n\n` +
                `📊 *Categorias:* alimentação, transporte, saúde, mercado, moradia, educação, assinaturas, lazer, compras, presentes, outros.`;
              await sendWhatsAppMessage(remoteJid, { text: ajuda }, { quoted: msg });
              continue;
            }

            console.log(`🔍 Analisando intenção com Gemini: "${textoMensagem}"`);
            const { intencao, valor, categoria } = await detectarIntencao(textoMensagem);

            if (intencao === 'DEFINIR_LIMITE' && valor) {
              const catNorm = (categoria || '').toLowerCase().trim();
              const catFinal = (!catNorm || catNorm === 'outros' || catNorm === 'geral')
                ? (textoMensagem.toLowerCase().includes('outros') ? 'outros' : 'geral')
                : catNorm;

              await definirLimite(user.id, catFinal, valor);

              const msgConfirmacao = catFinal === 'geral'
                ? `✅ *Limite Geral Definido!*\n💰 Valor: *R$ ${Number(valor).toFixed(2)}* por mês.`
                : `✅ *Limite por Categoria Definido!*\n📁 Categoria: *${catFinal}*\n💰 Valor: *R$ ${Number(valor).toFixed(2)}* por mês.`;

              await sendWhatsAppMessage(
                remoteJid,
                { text: msgConfirmacao },
                { quoted: msg }
              );
            } else if (intencao === 'VER_LIMITES') {
              const limites = await buscarTodosLimites(user.id);
              await sendWhatsAppMessage(
                remoteJid,
                { text: `📋 *Seus limites mensais:*\n\n${formatarLimites(limites)}` },
                { quoted: msg }
              );
            } else if (intencao === 'REGISTRAR_GASTO') {
              console.log(`[IA] Extraindo gasto da mensagem: "${textoMensagem}"`);
              const dadosGasto = await extrairGastos(textoMensagem);
              await registrarGasto(user.id, dadosGasto, remoteJid, msg);
            }
          }
        } catch (err) {
          console.error('[ERRO] Falha no processamento de mensagens:', err);
        }
      }
    });
  } catch (err) {
    isConnecting = false;
    console.error('[WHATSAPP] Erro ao conectar ao WhatsApp:', err);
  }
}

function scheduleReconnect(delayMs = 1000) {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return;
  }
  reconnectAttempts++;
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToWhatsApp();
  }, delayMs);
}

async function registrarGasto(userId, dadosGasto, remoteJid, msg) {
  if (dadosGasto && dadosGasto.valor) {
    console.log(`[GASTO] Registrando gasto no PostgreSQL para User ID ${userId}:`, dadosGasto);
    let gastoSalvo = null;
    try {
      gastoSalvo = await salvarGasto(userId, dadosGasto);
      console.log(`[GASTO] ✅ Salvo com sucesso no PostgreSQL! ID: ${gastoSalvo.id}`);
    } catch (e) {
      console.error('[ERRO] Falha ao salvar gasto no banco de dados:', e);
    }

    const payloadGasto = {
      id: gastoSalvo ? gastoSalvo.id : Date.now(),
      valor: Number(dadosGasto.valor),
      categoria: dadosGasto.categoria,
      descricao: dadosGasto.descricao,
      data: gastoSalvo?.data ? gastoSalvo.data.toISOString().split('T')[0] : (dadosGasto.data || new Date().toISOString().split('T')[0]),
      created_at: gastoSalvo?.criadoEm ? gastoSalvo.criadoEm.toISOString() : new Date().toISOString(),
    };

    // Emitir atualização em tempo real para a Dashboard via Socket.IO
    if (io && userId) {
      console.log(`[SOCKET] 🚀 Transmitindo novo_gasto para a sala user:${userId}`);
      io.to(`user:${userId}`).emit('novo_gasto', payloadGasto);
    }

    if (sock) {
      console.log(`[WHATSAPP] Enviando resposta de confirmação ao WhatsApp (${remoteJid})...`);
      await sendWhatsAppMessage(
        remoteJid,
        {
          text: `✅ *Registrado:* R$ ${Number(dadosGasto.valor).toFixed(2)}\n📝 ${
            dadosGasto.descricao || 'Sem descrição'
          }\n📁 Categoria: *${dadosGasto.categoria}*`,
        },
        { quoted: msg }
      );
      await verificarENotificarLimites(
        userId,
        dadosGasto.valor,
        dadosGasto.categoria,
        remoteJid
      );
    }
  } else {
    console.warn('[GASTO] Dados de gasto inválidos ou sem valor:', dadosGasto);
  }
}

// ─── SOCKET.IO ISOLAMENTO DE SALAS POR USER ───────────────────────────────

io.on('connection', async (socket) => {
  console.log('[SOCKET] Cliente conectou ao Socket.IO');

  let token = socket.handshake.auth?.token;
  if (!token && socket.handshake.headers.cookie) {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    token = cookies.lumio_session;
  }

  const user = await getSessionUser(token);
  if (user) {
    socket.userId = user.id;
    socket.join(`user:${user.id}`);
    console.log(`[SOCKET] ✅ Cliente autenticado e ingressado na sala user:${user.id}`);
    socket.emit('connected', { userId: user.id, whatsappId: user.whatsappId });
  } else {
    socket.emit('unauthenticated');
  }

  socket.on('disconnect', () => {
    console.log('[SOCKET] Cliente desconectado');
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor rodando na porta ${PORT} no host 0.0.0.0`);
  await migrateExistingDataToDefaultUser();
  connectToWhatsApp();
});
