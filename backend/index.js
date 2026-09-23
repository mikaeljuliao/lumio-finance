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
const { salvarGasto, buscarTodosGastos } = require('./gastos');
const {
  definirLimite,
  removerLimite,
  buscarTodosLimites,
  verificarLimites,
  formatarLimites,
} = require('./limites');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
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

// ─── REST API (PostgreSQL / Prisma) ──────────────────────────────────────────

app.get('/api/gastos', async (req, res) => {
  try {
    const me = req.query.mes ? parseInt(req.query.mes) : null;
    const ano = req.query.ano ? parseInt(req.query.ano) : null;
    let gastos;
    if (me && ano) {
      const { buscarGastosDoMes } = require('./gastos');
      gastos = await buscarGastosDoMes(me, ano);
    } else {
      gastos = await buscarTodosGastos();
    }
    res.json(gastos);
  } catch (err) {
    console.error('[API] Erro ao buscar gastos:', err);
    res.status(500).json({ error: 'Erro ao buscar gastos' });
  }
});

app.get('/api/limites', async (req, res) => {
  try {
    const limites = await buscarTodosLimites();
    res.json(limites);
  } catch (err) {
    console.error('[API] Erro ao buscar limites:', err);
    res.status(500).json({ error: 'Erro ao buscar limites' });
  }
});

app.post('/api/limites', async (req, res) => {
  try {
    const { categoria, valor } = req.body;
    const limite = await definirLimite(categoria, valor);
    res.json(limite);
  } catch (err) {
    console.error('[API] Erro ao definir limite:', err);
    res.status(500).json({ error: 'Erro ao definir limite' });
  }
});

app.delete('/api/limites/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    await removerLimite(categoria);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Erro ao remover limite:', err);
    res.status(500).json({ error: 'Erro ao remover limite' });
  }
});

// ─── Verificação de Limites e Notificação ─────────────────────────────────────

async function verificarENotificarLimites(valorGasto, categoriaGasto, remoteJid) {
  try {
    const agora = new Date();
    const mes = agora.getMonth() + 1;
    const ano = agora.getFullYear();
    console.log(`[LIMITES] Verificando limites para categoria "${categoriaGasto}" e valor R$ ${valorGasto}...`);
    const alertas = await verificarLimites(valorGasto, categoriaGasto, mes, ano);
    for (const alerta of alertas) {
      if (sock) {
        console.log(`[LIMITES] Enviando alerta ao usuário no WhatsApp: ${alerta}`);
        await sock.sendMessage(remoteJid, { text: alerta });
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
        console.log('[WHATSAPP] STATUS: connecting — QR possivelmente escaneado, aguardando autenticação...');
      }

      if (qr) {
        try {
          console.log('[WHATSAPP] Novo QR Code gerado com sucesso!');
          currentQR = await QRCode.toDataURL(qr);
          isConnected = false;
          isConnecting = false;
          io.emit('qr', currentQR);
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
        console.log(`[WHATSAPP] Conexão encerrada. Código: ${statusCode}`, {
          errorMessage: lastDisconnect?.error?.message,
          errorPayload: lastDisconnect?.error?.output?.payload,
          errorDetails: lastDisconnect?.error,
        });

        currentQR = null;
        isConnected = false;
        io.emit('disconnected');

        const isLoggedOut =
          statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isRestartRequired =
          statusCode === DisconnectReason.restartRequired || statusCode === 515;
        const isConnectionClosed =
          statusCode === 428 || statusCode === DisconnectReason.connectionClosed;

        if (isLoggedOut) {
          console.log(
            '[WHATSAPP] Sessão encerrada (logged out). Limpando credenciais...'
          );
          reconnectAttempts = 0;
          consecutive428Count = 0;
          try {
            if (fs.existsSync(AUTH_FOLDER)) {
              fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            }
          } catch (e) {
            console.error('[WHATSAPP] Erro ao limpar credenciais:', e);
          }
        } else if (isRestartRequired) {
          console.log(
            '[WHATSAPP] Reinicialização solicitada pelo WhatsApp. Reutilizando sessão...'
          );
          consecutive428Count = 0;
          scheduleReconnect(1000);
        } else if (isConnectionClosed) {
          consecutive428Count++;
          console.log(
            `[WHATSAPP] Conexão fechada pelo servidor WhatsApp (428). Tentativa ${consecutive428Count}...`
          );

          if (consecutive428Count >= 3 && !isConnected) {
            console.log(
              '[WHATSAPP] Sessão armazenada foi invalidada pelo servidor (428 repetido). Resetando sessão para novo QR Code...'
            );
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
          console.log(
            `[WHATSAPP] Desconexão temporária (código ${statusCode}). Tentando reconectar...`
          );
          scheduleReconnect(3000);
        }
      } else if (connection === 'open') {
        isConnecting = false;
        reconnectAttempts = 0;
        consecutive428Count = 0;
        currentQR = null;
        isConnected = true;
        console.log('[WHATSAPP] Conectado!');
        io.emit('connected');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

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
          const textoMensagem =
            content.conversation ||
            content.extendedTextMessage?.text ||
            content.imageMessage?.caption ||
            content.videoMessage?.caption ||
            '';
          const remoteJid = msg.key.remoteJid;
          const isFromMe = msg.key.fromMe;

          // Ignorar mensagens de sistema enviadas pelo próprio bot
          if (
            textoMensagem.includes('✅ *Registrado:*') ||
            textoMensagem.includes('🚨') ||
            textoMensagem.includes('🚩') ||
            textoMensagem.includes('📋 *Seus limites') ||
            textoMensagem.includes('🤖 *Como me usar') ||
            textoMensagem.includes('✅ Limite de')
          ) {
            continue;
          }

          console.log(`[WHATSAPP] Mensagem recebida de ${remoteJid}: "${textoMensagem || '[Áudio]'}"`);

          if (isAudio && isFromMe) {
            console.log('[AUDIO] Processando mensagem de áudio...');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const textoTranscrito = await transcreverAudio(
              buffer,
              content.audioMessage.mimetype
            );
            if (textoTranscrito) {
              console.log(`[AUDIO] Transcrição: "${textoTranscrito}"`);
              const dadosGasto = await extrairGastos(textoTranscrito);
              await registrarGasto(dadosGasto, remoteJid, msg);
            }
          } else if (
            textoMensagem &&
            (isFromMe ||
              textoMensagem.toLowerCase().includes('gastei') ||
              textoMensagem.toLowerCase().includes('paguei') ||
              textoMensagem.toLowerCase().includes('limite'))
          ) {
            console.log(`🔍 Analisando intenção com Gemini: "${textoMensagem}"`);
            const { intencao, valor, categoria } = await detectarIntencao(
              textoMensagem
            );
            console.log(`🔍 Intenção detectada: ${intencao} | Valor: ${valor} | Categoria: ${categoria}`);

            if (intencao === 'DEFINIR_LIMITE' && valor && categoria) {
              await definirLimite(categoria, valor);
              await sock.sendMessage(
                remoteJid,
                {
                  text: `✅ *Limite Definido!*\n📁 Categoria: *${categoria}*\n💰 Valor: *R$ ${Number(
                    valor
                  ).toFixed(2)}* por mês.`,
                },
                { quoted: msg }
              );
            } else if (intencao === 'VER_LIMITES') {
              const limites = await buscarTodosLimites();
              await sock.sendMessage(
                remoteJid,
                { text: `📋 *Seus limites mensais:*\n\n${formatarLimites(limites)}` },
                { quoted: msg }
              );
            } else if (intencao === 'REGISTRAR_GASTO') {
              console.log(`[IA] Extraindo gasto da mensagem: "${textoMensagem}"`);
              const dadosGasto = await extrairGastos(textoMensagem);
              console.log(`[IA] Gasto extraído:`, dadosGasto);
              await registrarGasto(dadosGasto, remoteJid, msg);
            } else if (textoMensagem.startsWith('/ajuda')) {
              const ajuda =
                `🤖 *Como me usar:*\n\n` +
                `1️⃣ *Registrar Gasto:* Basta falar natural, ex: "gastei 50 no bar" ou "paguei 100 de luz".\n\n` +
                `2️⃣ *Definir Limites:* Fale "meu limite de mercado é 1000" ou "quero gastar no máximo 500 em lazer".\n\n` +
                `3️⃣ *Consultar:* Fale "quais meus limites?" ou "quanto já gastei?".\n\n` +
                `📊 *Categorias:* alimentação, transporte, saúde, mercado, moradia, educação, assinaturas, lazer, compras, presentes, outros.`;
              await sock.sendMessage(remoteJid, { text: ajuda }, { quoted: msg });
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
    console.log(
      '[WHATSAPP] Número máximo de tentativas de reconexão atingido.'
    );
    return;
  }
  reconnectAttempts++;
  console.log(`[WHATSAPP] Agendando reconexão (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) em ${delayMs}ms...`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToWhatsApp();
  }, delayMs);
}

async function registrarGasto(dadosGasto, remoteJid, msg) {
  if (dadosGasto && dadosGasto.valor) {
    console.log('[GASTO] Registrando gasto no PostgreSQL (Prisma):', dadosGasto);
    let gastoSalvo = null;
    try {
      gastoSalvo = await salvarGasto(dadosGasto);
      console.log(`[GASTO] ✅ Salvo com sucesso no PostgreSQL! ID: ${gastoSalvo.id}`);
    } catch (e) {
      console.error('[ERRO] Falha ao salvar gasto no banco de dados:', e);
    }

    const payloadGasto = {
      id: gastoSalvo ? gastoSalvo.id : Date.now(),
      valor: Number(dadosGasto.valor),
      categoria: dadosGasto.categoria,
      descricao: dadosGasto.descricao,
      data: dadosGasto.data || new Date().toISOString().split('T')[0],
      created_at: gastoSalvo?.criadoEm ? gastoSalvo.criadoEm.toISOString() : new Date().toISOString(),
    };

    if (sock) {
      console.log(`[WHATSAPP] Enviando resposta de confirmação ao WhatsApp (${remoteJid})...`);
      await sock.sendMessage(
        remoteJid,
        {
          text: `✅ *Registrado:* R$ ${Number(dadosGasto.valor).toFixed(2)}\n📝 ${
            dadosGasto.descricao || 'Sem descrição'
          }\n📁 Categoria: *${dadosGasto.categoria}*`,
        },
        { quoted: msg }
      );
      await verificarENotificarLimites(
        dadosGasto.valor,
        dadosGasto.categoria,
        remoteJid
      );
    }

    console.log('[SOCKET] Emitindo evento "novo_gasto" para atualizar o dashboard frontend...');
    io.emit('novo_gasto', payloadGasto);
  } else {
    console.warn('[GASTO] Dados de gasto inválidos ou sem valor:', dadosGasto);
  }
}

io.on('connection', (socket) => {
  console.log('[SOCKET] Cliente conectado ao Socket.IO');
  if (isConnected) {
    socket.emit('connected');
  } else if (currentQR) {
    socket.emit('qr', currentQR);
  } else {
    socket.emit('disconnected');
  }

  socket.on('connect_whatsapp', () => {
    console.log('[WHATSAPP] Solicitada conexão via frontend');
    if (!isConnected && !isConnecting) {
      connectToWhatsApp();
    }
  });

  socket.on('disconnect_whatsapp', async () => {
    console.log('[WHATSAPP] Solicitada desconexão via frontend');
    try {
      if (sock) {
        sock.ev.removeAllListeners();
        await sock.logout();
      }
    } catch (err) {
      console.error('[WHATSAPP] Erro ao desconectar:', err);
    }
    sock = null;
    isConnected = false;
    isConnecting = false;
    currentQR = null;
    try {
      if (fs.existsSync(AUTH_FOLDER)) {
        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
      }
    } catch (e) {}
    io.emit('disconnected');
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT} no host 0.0.0.0`);
  connectToWhatsApp();
});
