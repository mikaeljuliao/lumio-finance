require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { extrairGastos, detectarIntencao } = require('./gemini');
const { transcreverAudio } = require('./transcrever');
const { salvarGasto } = require('./gastos');
const { definirLimite, buscarTodosLimites, verificarLimites, formatarLimites } = require('./limites');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let sock = null;
let currentQR = null;
let isConnected = false;

// ─── Verificação e notificação de limites via WhatsApp ───────────────────────

async function notificarSeLimiteAtingido(valorGasto, categoriaGasto, remoteJid) {
  try {
    const agora = new Date();
    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();

    const alertas = await verificarLimites(valorGasto, categoriaGasto, mesAtual, anoAtual);
    for (const alerta of alertas) {
      await sock.sendMessage(remoteJid, { text: alerta });
    }
  } catch (err) {
    console.error('Erro ao verificar limites:', err);
  }
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop')
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        currentQR = await QRCode.toDataURL(qr);
        isConnected = false;
        io.emit('qr', currentQR);
      } catch (err) {
        console.error('Erro ao gerar imagem QR:', err);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      currentQR = null;
      isConnected = false;
      io.emit('disconnected');
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Conectado!');
      currentQR = null;
      isConnected = true;
      io.emit('connected');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

        const getMessageContent = (m) => {
          if (m.viewOnceMessageV2?.message) return getMessageContent(m.viewOnceMessageV2.message);
          if (m.viewOnceMessage?.message) return getMessageContent(m.viewOnceMessage.message);
          if (m.ephemeralMessage?.message) return getMessageContent(m.ephemeralMessage.message);
          return m;
        };

        const content = getMessageContent(msg.message);
        const isAudio = !!content.audioMessage;
        const textoMensagem = content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || '';
        const remoteJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;

        // Ignorar mensagens enviadas pelo próprio bot
        const ehMensagemDoBot = [
          '✅ *Registrado:*', '🚨', '🚩', '📋 *Seus limites', '🤖 *Comandos', '✅ Limite de'
        ].some(prefix => textoMensagem.includes(prefix));

        if (ehMensagemDoBot) continue;

        if (isAudio && isFromMe) {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          const textoTranscrito = await transcreverAudio(buffer, content.audioMessage.mimetype);
          if (textoTranscrito) {
            const dadosGasto = await extrairGastos(textoTranscrito);
            await registrarGasto(dadosGasto, remoteJid, msg);
          }
        } else if (textoMensagem && (isFromMe || textoMensagem.toLowerCase().includes('gastei') || textoMensagem.toLowerCase().includes('paguei') || textoMensagem.toLowerCase().includes('limite'))) {
          console.log(`🔍 Analisando intenção: "${textoMensagem}"`);
          const { intencao, valor, categoria } = await detectarIntencao(textoMensagem);

          if (intencao === 'DEFINIR_LIMITE' && valor && categoria) {
            await definirLimite(categoria, valor);
            await sock.sendMessage(remoteJid, {
              text: `✅ *Limite Definido!*\n📁 Categoria: *${categoria}*\n💰 Valor: *R$ ${Number(valor).toFixed(2)}* por mês.`
            }, { quoted: msg });
          } else if (intencao === 'VER_LIMITES') {
            const limites = await buscarTodosLimites();
            await sock.sendMessage(remoteJid, {
              text: `📋 *Seus limites mensais:*\n\n${formatarLimites(limites)}`
            }, { quoted: msg });
          } else if (intencao === 'REGISTRAR_GASTO') {
            const dadosGasto = await extrairGastos(textoMensagem);
            await registrarGasto(dadosGasto, remoteJid, msg);
          } else if (textoMensagem.startsWith('/ajuda')) {
            const ajuda =
              `🤖 *Como me usar:*\n\n` +
              `1️⃣ *Registrar Gasto:* Basta falar natural, ex: "gastei 50 no bar" ou "paguei 100 de luz".\n\n` +
              `2️⃣ *Definir Limites:* Fale "meu limite de mercado é 1000" ou "quero gastar no máximo 500 em lazer".\n\n` +
              `3️⃣ *Consultar:* Fale "quais meus limites?" ou "quanto já gastei?".\n\n` +
              `📊 *Categorias:* alimentação, transporte, saúde, mercado, moradia, educação, serviços, lazer, compras, presentes, outros.`;
            await sock.sendMessage(remoteJid, { text: ajuda }, { quoted: msg });
          }
        }
      } catch (err) {
        console.error('Erro ao processar mensagem:', err);
      }
    }
  });
}

async function registrarGasto(dadosGasto, remoteJid, msg) {
  if (!dadosGasto || !dadosGasto.valor) return;

  console.log('✅ Gasto extraído:', dadosGasto);
  const gastoSalvo = await salvarGasto(dadosGasto);

  await sock.sendMessage(remoteJid, {
    text: `✅ *Registrado:* R$ ${Number(dadosGasto.valor).toFixed(2)}\n📝 ${dadosGasto.descricao}\n📁 Categoria: *${dadosGasto.categoria}*`
  }, { quoted: msg });

  await notificarSeLimiteAtingido(dadosGasto.valor, dadosGasto.categoria, remoteJid);

  io.emit('novo_gasto', {
    id: gastoSalvo.id,
    valor: Number(gastoSalvo.valor),
    categoria: gastoSalvo.categoria,
    descricao: gastoSalvo.descricao,
    data: gastoSalvo.data,
    created_at: gastoSalvo.criadoEm ? gastoSalvo.criadoEm.toISOString() : new Date().toISOString()
  });
}

connectToWhatsApp();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
