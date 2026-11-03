import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.G3OPS_API_KEY || 'g3ops-poc-key';
// Opcional. En producción detrás de proxy: https://notify.tuempresa.com
const PUBLIC_URL = process.env.G3OPS_PUBLIC_URL;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
// Solo png/jpeg/webp (nada de SVG: puede traer scripts)
const IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' }, transports: ['websocket', 'polling'] });

type ClientInfo = { socketId: string; deviceId: string; name: string; connectedAt: string };
const clients = new Map<string, ClientInfo>();

const schema = z.object({
  title: z.string().min(1).max(80),
  message: z.string().min(1).max(2000),
  type: z.enum(['info', 'reminder', 'urgent', 'image']),
  imageData: z.string().regex(IMAGE_RE).max(6_000_000).optional().or(z.literal('')),
  actionUrl: z.string().url().optional().or(z.literal('')),
  targetDeviceId: z.string().optional().or(z.literal('')),
  duration: z.number().min(0).max(60000).optional(),
});

io.on('connection', (socket) => {
  socket.on('register-device', (data: { deviceId: string; name: string }) => {
    const item = {
      socketId: socket.id,
      deviceId: data.deviceId,
      name: data.name || data.deviceId,
      connectedAt: new Date().toISOString(),
    };
    clients.set(socket.id, item);
    socket.join(`device:${data.deviceId}`);
    io.emit('clients', Array.from(clients.values()));
  });
  socket.on('ack', (payload) => io.emit('ack', { ...payload, at: new Date().toISOString() }));
  socket.on('disconnect', () => {
    clients.delete(socket.id);
    io.emit('clients', Array.from(clients.values()));
  });
});

app.get('/health', (_, res) => res.json({ ok: true, clients: clients.size, time: new Date().toISOString() }));

app.get('/api/clients', (req, res) => {
  if (req.header('x-api-key') !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  res.json(Array.from(clients.values()));
});

app.post('/api/send', async (req, res) => {
  if (req.header('x-api-key') !== API_KEY) return res.status(401).json({ error: 'Clave inválida' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { imageData, ...data } = parsed.data;

  // Guardar la imagen en disco y enviar solo su URL a los agentes
  let imageUrl: string | undefined;
  if (imageData) {
    const match = IMAGE_RE.exec(imageData);
    if (!match) return res.status(400).json({ error: 'Imagen inválida' });
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: 'La imagen supera 4 MB' });

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const fileName = `${crypto.randomUUID()}.${ext}`;
    await fs.promises.writeFile(path.join(UPLOADS_DIR, fileName), buffer);
    imageUrl = `${PUBLIC_URL || `${req.protocol}://${req.get('host')}`}/uploads/${fileName}`;
  }

  const notification = { id: crypto.randomUUID(), ...data, imageUrl, sentAt: Date.now() };

  if (notification.targetDeviceId) {
    io.to(`device:${notification.targetDeviceId}`).emit('notification', notification);
  } else {
    io.emit('notification', notification);
  }
  res.json({ ok: true, id: notification.id, connectedClients: clients.size });
});

httpServer.listen(PORT, '0.0.0.0', () => console.log(`G3 Ops PoC server on http://localhost:${PORT}`));