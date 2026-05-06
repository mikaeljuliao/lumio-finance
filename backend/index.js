require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { extrairGastos } = require('./gemini');
const { transcreverAudio } = require('./transcrever');
const supabase = require('./supabase');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

let sock = null;
let currentQR = null;
let isConnected = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // Ainda imprime no terminal por precaução
        logger: pino({ level: 'info' }),
        browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Novo QR Code gerado. Enviando para o Frontend...');
            try {
                // Converte o texto do QR para uma imagem Data URL (Base64) legível no frontend
                currentQR = await QRCode.toDataURL(qr);
                isConnected = false;
                io.emit('qr', currentQR);
            } catch (err) {
                console.error('Erro ao gerar imagem QR', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. Reconectando:', shouldReconnect);
            currentQR = null;
            isConnected = false;
            io.emit('disconnected');

            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                // Logout, apaga as credenciais para gerar um novo QR
                const fs = require('fs');
                if (fs.existsSync('./auth_info_baileys')) {
                    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                }
                connectToWhatsApp();
            }
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

                // Função auxiliar para extrair o conteúdo real da mensagem (desembrulhando se necessário)
                const getMessageContent = (m) => {
                    if (m.viewOnceMessageV2?.message) return getMessageContent(m.viewOnceMessageV2.message);
                    if (m.viewOnceMessage?.message) return getMessageContent(m.viewOnceMessage.message);
                    if (m.ephemeralMessage?.message) return getMessageContent(m.ephemeralMessage.message);
                    return m;
                };

                const content = getMessageContent(msg.message);
                const isAudio = !!content.audioMessage;
                const isImage = !!content.imageMessage;
                
                let dadosGasto = null;

                // Extrair texto de várias fontes possíveis
                const textoMensagem = 
                    content.conversation || 
                    content.extendedTextMessage?.text || 
                    content.imageMessage?.caption ||
                    content.videoMessage?.caption ||
                    "";

                // Identificadores
                const remoteJid = msg.key.remoteJid;
                const isFromMe = msg.key.fromMe;
                
                console.log(`\n--- NOVA MENSAGEM ---`);
                console.log(`De: ${remoteJid} | Tipo: ${isAudio ? '🎙️ ÁUDIO' : isImage ? '🖼️ IMAGEM' : '📝 TEXTO'}`);
                console.log(`Texto: "${textoMensagem}" | isFromMe: ${isFromMe}`);

                // EVITAR LOOP INFINITO: Ignorar se for a mensagem de confirmação que o próprio bot acabou de enviar
                if (textoMensagem.includes('✅') || textoMensagem.includes('Registrado:')) {
                    console.log('--- Ignorando mensagem de confirmação do bot ---');
                    continue;
                }

                // Processar apenas mensagens suas (para si mesmo ou que contenham 'gastei')
                if (isAudio && isFromMe) {
                    console.log('🎙️ Áudio detectado! Iniciando fluxo Groq + Gemini...');
                    try {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {});
                        const mimetype = content.audioMessage.mimetype;
                        
                        // 1. Transcrever com Groq (Whisper)
                        const textoTranscrito = await transcreverAudio(buffer, mimetype);
                        
                        if (textoTranscrito) {
                            console.log('🚀 Enviando texto transcrito para o Gemini...');
                            // 2. Extrair dados com Gemini
                            dadosGasto = await extrairGastos(textoTranscrito);
                        }
                    } catch (err) {
                        console.error('❌ Falha no fluxo de áudio:', err.message);
                    }
                } else if (textoMensagem) {
                    const containsKeyword = textoMensagem.toLowerCase().includes('gastei');
                    if (isFromMe || containsKeyword) {
                        console.log('🚀 Processando texto...');
                        dadosGasto = await extrairGastos(textoMensagem);
                    }
                }

                if (dadosGasto && dadosGasto.valor) {
                    console.log('✅ SUCESSO:', dadosGasto);
                    
                    // Responder no WhatsApp
                    await sock.sendMessage(remoteJid, { text: `✅ Registrado: R$ ${dadosGasto.valor} (${dadosGasto.descricao})` }, { quoted: msg });

                    // Emitir para o frontend
                    io.emit('novo_gasto', {
                        id: Math.random().toString(36).substr(2, 9),
                        valor: Number(dadosGasto.valor),
                        categoria: dadosGasto.categoria,
                        descricao: dadosGasto.descricao,
                        data: dadosGasto.data || new Date().toISOString().split('T')[0],
                        created_at: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error('Erro no loop de mensagens:', err);
            }
        }
    });
}

// Quando um cliente do frontend se conecta
io.on('connection', (socket) => {
    console.log('🖥️ Frontend conectado ao Socket.io!');
    // Envia o estado atual
    if (isConnected) {
        socket.emit('connected');
    } else if (currentQR) {
        socket.emit('qr', currentQR);
    }
});

// Inicia o WhatsApp e o Servidor Express/Socket
connectToWhatsApp();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
