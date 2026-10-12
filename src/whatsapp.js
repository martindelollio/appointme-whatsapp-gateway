import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';

import pino from 'pino';

let sock = null;
let connected = false;
let reconnectTimer = null;

export async function connectWhatsApp() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info');

  const client = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock = client;
  connected = false;

  let pairingRequested = false;

  client.ev.on('creds.update', saveCreds);

  client.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    // Esperar a que el WebSocket esté disponible.
    if (
      !state.creds.registered &&
      !pairingRequested &&
      client.ws?.isOpen
    ) {
      pairingRequested = true;

      try {
        const phoneNumber = process.env.WHATSAPP_NUMBER;

        if (!phoneNumber) {
          throw new Error('Falta WHATSAPP_NUMBER en .env');
        }

        const code = await client.requestPairingCode(
          phoneNumber.replace(/\D/g, '')
        );

        console.log('Código de vinculación:', code);
      } catch (error) {
        console.error('Error al solicitar código:', error.message);
      }
    }

    if (connection === 'open') {
      connected = true;
      console.log('WhatsApp conectado');
    }

    if (connection === 'close') {
      connected = false;

      const code =
        lastDisconnect?.error?.output?.statusCode;

      console.log('WhatsApp desconectado:', code);

      if (code !== DisconnectReason.loggedOut && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectWhatsApp().catch(console.error);
        }, 3000);
      }
    }
  });

  return client;
}

export async function sendWhatsApp(to, message) {
  if (!connected || !sock) {
    throw new Error('WhatsApp no está conectado');
  }

  const number = to.replace(/\D/g, '');

  if (!/^\d{8,15}$/.test(number)) {
    throw new Error('Número inválido');
  }

  const jid = `${number}@s.whatsapp.net`;

  const result = await sock.sendMessage(jid, {
    text: message
  });

  return result?.key?.id;
}

export function isConnected() {
  return connected;
}