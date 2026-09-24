const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { processMessage, sentMessageIds } = require('./handler');

const AUTH_FOLDER = path.join(__dirname, '..', '..', 'auth_info_baileys');

let sock = null;
let currentQR = null;
let isConnected = false;
let isConnecting = false;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let consecutive428Count = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

async function connectToWhatsApp() {
  if (isConnecting) {
    console.log('[WHATSAPP] Connection already in progress, ignoring duplicate call.');
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
    console.log('[WHATSAPP] Baileys version:', version);
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
        console.log('[WHATSAPP] STATUS: connecting — Connecting to Lumio WhatsApp...');
      }

      if (qr) {
        try {
          console.log('[WHATSAPP] QR Code generated!');
          currentQR = await QRCode.toDataURL(qr);
          isConnected = false;
          isConnecting = false;
        } catch (err) {
          console.error('[WHATSAPP] Error generating QR image:', err);
        }
      }

      if (connection === 'close') {
        isConnecting = false;
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.statusCode ||
          0;
        console.log(`[WHATSAPP] Connection closed. Code: ${statusCode}`);

        currentQR = null;
        isConnected = false;

        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;
        const isConnectionClosed = statusCode === 428 || statusCode === DisconnectReason.connectionClosed;

        if (isLoggedOut) {
          console.log('[WHATSAPP] Session logged out. Clearing credentials...');
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
        console.log('[WHATSAPP] ✅ WhatsApp Connected successfully!');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

          if (msg.key.id && sentMessageIds.has(msg.key.id)) {
            sentMessageIds.delete(msg.key.id);
            console.log(`[WHATSAPP] Ignoring bot message (ID: ${msg.key.id})`);
            continue;
          }

          const remoteJid = msg.key.remoteJid;

          if (msg.key.fromMe) {
            continue;
          }

          await processMessage(msg, remoteJid, msg.key.participant || remoteJid, sock);
        } catch (err) {
          console.error('[ERROR] Message processing failed:', err);
        }
      }
    });
  } catch (err) {
    isConnecting = false;
    console.error('[WHATSAPP] Error connecting to WhatsApp:', err);
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

module.exports = {
  connectToWhatsApp,
  getWhatsAppSocket: () => sock,
};
