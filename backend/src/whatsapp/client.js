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

function clearAuthFolder() {
  try {
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
  } catch (e) {}
}

function scheduleReconnect(delayMs = 3000) {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  reconnectAttempts++;
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToWhatsApp();
  }, delayMs);
}

async function connectToWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'error' });

    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.ws?.close();
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

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        try {
          currentQR = await QRCode.toDataURL(qr);
          isConnected = false;
          isConnecting = false;
        } catch (err) {
          console.error('[WHATSAPP] Error generating QR:', err);
        }
      }

      if (connection === 'open') {
        isConnecting = false;
        isConnected = true;
        reconnectAttempts = 0;
        consecutive428Count = 0;
        currentQR = null;
        console.log('[WHATSAPP] ✅ Connected');
        return;
      }

      if (connection === 'close') {
        isConnecting = false;
        isConnected = false;
        currentQR = null;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.statusCode ||
          0;

        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;
        const isConnectionClosed = statusCode === 428 || statusCode === DisconnectReason.connectionClosed;

        if (isLoggedOut) {
          reconnectAttempts = 0;
          consecutive428Count = 0;
          clearAuthFolder();
        } else if (isRestartRequired) {
          scheduleReconnect(1000);
        } else if (isConnectionClosed) {
          consecutive428Count++;
          if (consecutive428Count >= 3) {
            consecutive428Count = 0;
            reconnectAttempts = 0;
            clearAuthFolder();
            scheduleReconnect(1000);
          } else {
            scheduleReconnect(3000);
          }
        } else {
          scheduleReconnect(3000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;
          if (msg.key.fromMe) continue;

          if (msg.key.id && sentMessageIds.has(msg.key.id)) {
            sentMessageIds.delete(msg.key.id);
            continue;
          }

          await processMessage(msg, msg.key.remoteJid, sock);
        } catch (err) {
          console.error('[WHATSAPP] Message processing error:', err);
        }
      }
    });
  } catch (err) {
    isConnecting = false;
    console.error('[WHATSAPP] Connection error:', err);
  }
}

module.exports = {
  connectToWhatsApp,
  getWhatsAppSocket: () => sock,
};
