import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { handleAudioSocket } from './websocket/audioHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the repo root (locally). On Render, env vars are set via dashboard.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: isProduction
    ? {}
    : { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
  path: '/socket.io'
});

io.on('connection', (socket) => {
  // eslint-disable-next-line no-console
  console.log('WebSocket client connected', socket.id);
  handleAudioSocket(socket);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// In production, serve the built React client
if (isProduction) {
  const clientDist = path.resolve(__dirname, '../../client/client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
