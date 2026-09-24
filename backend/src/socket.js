const { Server } = require('socket.io');
const { parseCookies } = require('./api/middlewares');
const { getSessionUser } = require('./services/auth.service');

let io = null;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  io.on('connection', async (socket) => {
    console.log('[SOCKET] Client connected to Socket.IO');

    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers.cookie) {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      token = cookies.lumio_session;
    }

    const user = await getSessionUser(token);
    if (user) {
      socket.userId = user.id;
      socket.join(`user:${user.id}`);
      console.log(`[SOCKET] ✅ Client authenticated and joined room user:${user.id}`);
      socket.emit('connected', { userId: user.id, whatsappId: user.whatsappId });
    } else {
      socket.emit('unauthenticated');
    }

    socket.on('disconnect', () => {
      console.log('[SOCKET] Client disconnected');
    });
  });

  return io;
}

function getSocketIo() {
  return io;
}

module.exports = {
  initializeSocket,
  getSocketIo,
};
