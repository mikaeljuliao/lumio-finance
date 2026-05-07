require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { extrairGastos, detectarIntencao } = require('./gemini');
const { transcreverAudio } = require('./transcrever');
const supabase = require('./supabase');
const {
  definirLimite,
  removerLimite,
  listarLimites,
  verificarLimitesLocal,
  salvarGastoLocal,
  carregarGastosLocal,
  gastosDoMesAtual,
  formatarLimites,
} = require('./limites');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let sock = null;
let currentQR = null;
let isConnected = false;

// ─── Verificação e alerta de limites ────────────────────────────────────────

async function verificarENotificarLimites(valorGasto, categoriaGasto, remoteJid) {
  try {
    let gastosDoMes = [];
    try {
      const agora = new Date();
      const primeiroDiaMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`;
      const { data, error } = await supabase
        .from('gastos')
        .select('valor, categoria, data')
        .gte('data', primeiroDiaMes);
      if (!error && data) gastosDoMes = data;
      else throw new Error('Supabase error');
    } catch {
      const todos = carregarGastosLocal();
      gastosDoMes = gastosDoMesAtual(todos);
    }

    const alertas = verificarLimitesLocal(valorGasto, categoriaGasto, gastosDoMes);
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
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'info' }),
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
        console.error('Erro ao gerar imagem QR', err);
      }
    }
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
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

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
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

        // Ignorar mensagens de sistema
        if (textoMensagem.includes('✅ *Registrado:*') || textoMensagem.includes('🚨') || textoMensagem.includes('🚩') || textoMensagem.includes('📋 *Seus limites') || textoMensagem.includes('🤖 *Comandos') || textoMensagem.includes('✅ Limite de')) {
          continue;
        }

        if (isAudio && isFromMe) {
          // Processar áudio como gasto (fluxo padrão)
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          const textoTranscrito = await transcreverAudio(buffer, content.audioMessage.mimetype);
          if (textoTranscrito) {
            const dadosGasto = await extrairGastos(textoTranscrito);
            await registrarGasto(dadosGasto, remoteJid, msg);
          }
        } else if (textoMensagem && (isFromMe || textoMensagem.toLowerCase().includes('gastei') || textoMensagem.toLowerCase().includes('paguei') || textoMensagem.toLowerCase().includes('limite'))) {
          // Detectar intenção para mensagens de texto
          console.log(`🔍 Analisando intenção: "${textoMensagem}"`);
          const { intencao, valor, categoria } = await detectarIntencao(textoMensagem);

          if (intencao === 'DEFINIR_LIMITE' && valor && categoria) {
            definirLimite(categoria, valor);
            await sock.sendMessage(remoteJid, { text: `✅ *Limite Definido!*\n📁 Categoria: *${categoria}*\n💰 Valor: *R$ ${valor.toFixed(2)}* por mês.` }, { quoted: msg });
          } else if (intencao === 'VER_LIMITES') {
            const limites = listarLimites();
            await sock.sendMessage(remoteJid, { text: `📋 *Seus limites mensais:*\n\n${formatarLimites(limites)}` }, { quoted: msg });
          } else if (intencao === 'REGISTRAR_GASTO') {
            const dadosGasto = await extrairGastos(textoMensagem);
            await registrarGasto(dadosGasto, remoteJid, msg);
          } else if (textoMensagem.startsWith('/ajuda')) {
            const ajuda = `🤖 *Como me usar:*\n\n` +
              `1️⃣ *Registrar Gasto:* Basta falar natural, ex: "gastei 50 no bar" ou "paguei 100 de luz".\n\n` +
              `2️⃣ *Definir Limites:* Fale "meu limite de mercado é 1000" ou "quero gastar no máximo 500 em lazer".\n\n` +
              `3️⃣ *Consultar:* Fale "quais meus limites?" ou "quanto já gastei?".\n\n` +
              `📊 *Categorias:* alimentação, transporte, saúde, mercado, moradia, educação, assinaturas, lazer, compras, presentes, outros.`;
            await sock.sendMessage(remoteJid, { text: ajuda }, { quoted: msg });
          }
        }
      } catch (err) {
        console.error('Erro no loop:', err);
      }
    }
  });
}

async function registrarGasto(dadosGasto, remoteJid, msg) {
  if (dadosGasto && dadosGasto.valor) {
    console.log('✅ SUCESSO:', dadosGasto);
    let gastoId = Date.now().toString();
    try {
      const { data, error } = await supabase.from('gastos').insert([{ valor: dadosGasto.valor, categoria: dadosGasto.categoria, descricao: dadosGasto.descricao, data: dadosGasto.data }]).select();
      if (!error && data) gastoId = data[0].id;
    } catch (e) {
      salvarGastoLocal(dadosGasto);
    }

    await sock.sendMessage(remoteJid, { text: `✅ *Registrado:* R$ ${dadosGasto.valor}\n📝 ${dadosGasto.descricao}\n📁 Categoria: *${dadosGasto.categoria}*` }, { quoted: msg });
    await verificarENotificarLimites(dadosGasto.valor, dadosGasto.categoria, remoteJid);
    io.emit('novo_gasto', { id: gastoId, valor: Number(dadosGasto.valor), categoria: dadosGasto.categoria, descricao: dadosGasto.descricao, data: dadosGasto.data, created_at: new Date().toISOString() });
  }
}

connectToWhatsApp();
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
