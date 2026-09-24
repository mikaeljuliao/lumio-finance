console.log(">>> Starting Lumio Backend...");
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');
const { connectToWhatsApp } = require('./whatsapp/client');

const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT} at host 0.0.0.0`);
  connectToWhatsApp();
});
