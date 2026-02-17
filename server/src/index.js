import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { handleAudioSocket } from './websocket/audioHandler.js';

// Load .env from the repo root (one level above /server)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  },
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

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

