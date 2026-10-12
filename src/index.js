import 'dotenv/config';
import express from 'express';

import {
  connectWhatsApp,
  sendWhatsApp,
  isConnected
} from './whatsapp.js';

const app = express();

app.use(express.json({ limit: '16kb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: isConnected()
      ? 'connected'
      : 'disconnected'
  });
});

app.post('/api/messages', async (req, res) => {
  const token = req.headers.authorization;
  const expected = `Bearer ${process.env.API_KEY}`;

  if (!process.env.API_KEY || token !== expected) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  const { to, message, eventId } = req.body ?? {};

  if (
    typeof to !== 'string' ||
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 1000 ||
    typeof eventId !== 'string' ||
    !eventId.trim()
  ) {
    return res.status(400).json({
      error: 'Invalid payload'
    });
  }

  try {
    const messageId = await sendWhatsApp(to, message);

    return res.status(200).json({
  success: true,
  message: 'Mensaje enviado',
  eventId,
  messageId
});
  } catch (error) {
    console.error('Error de envío:', error.message);

    return res.status(503).json({
      error: 'Message delivery unavailable'
    });
  }
});

const port = Number(process.env.PORT || 3001);

app.listen(port, '127.0.0.1', () => {
  console.log(`Gateway en http://127.0.0.1:${port}`);
});

connectWhatsApp().catch(console.error);