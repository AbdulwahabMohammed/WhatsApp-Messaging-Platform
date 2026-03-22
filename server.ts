import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import db from './server/db.js';
import { whatsappService } from './server/services/whatsapp.js';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: 'uploads/' });

// API Routes

// --- Sessions ---
app.post('/api/sessions/init', async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  try {
    await whatsappService.initSession(session_id);
    
    const stmt = db.prepare('INSERT OR IGNORE INTO sessions (id, session_id, status) VALUES (?, ?, ?)');
    stmt.run(uuidv4(), session_id, 'INITIATED');

    res.json({ success: true, session_id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions/:id/status', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await whatsappService.getStatus(id);
    
    const stmt = db.prepare('UPDATE sessions SET status = ? WHERE session_id = ?');
    stmt.run(response.data.status || 'UNKNOWN', id);

    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions/:id/scan', (req, res) => {
  const { id } = req.params;
  // Instead of returning the external WhatsApp API URL directly,
  // we return a local proxy URL so the browser can load it regardless of network setup.
  const url = `/api/sessions/${id}/qr-image`;
  res.json({ url });
});

app.get('/api/sessions/:id/qr-image', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch the image from the WhatsApp API server
    const response = await axios.get(`${process.env.WHATSAPP_API_URL || 'http://localhost:8080'}/wa/scan`, {
      params: { session_id: id },
      headers: { 'x-api-key': process.env.WHATSAPP_API_KEY || 'dummy_api_key' },
      responseType: 'arraybuffer'
    });
    
    const contentType = response.headers['content-type'];
    
    // Handle case where API returns JSON with base64 string
    if (contentType && contentType.includes('application/json')) {
      const data = JSON.parse(response.data.toString('utf-8'));
      const qrData = data.qr || data.qrcode || data.base64;
      if (qrData) {
        const base64Data = qrData.replace(/^data:image\/\w+;base64,/, "");
        const img = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': img.length
        });
        return res.end(img);
      } else {
        return res.status(404).send('QR code not found in response');
      }
    }

    // Handle case where API returns the image directly
    res.setHeader('Content-Type', contentType || 'image/png');
    res.send(response.data);
  } catch (error: any) {
    console.error('Error fetching QR code:', error.message);
    res.status(500).send('Error fetching QR code');
  }
});

app.get('/api/sessions', (req, res) => {
  const stmt = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC');
  const sessions = stmt.all();
  res.json(sessions);
});

// --- Targets ---
app.post('/api/targets/groups/sync', async (req, res) => {
  const { session_id } = req.body;
  try {
    const response = await whatsappService.getGroups(session_id);
    const groups = response.data.groups || [];

    const stmt = db.prepare('INSERT OR IGNORE INTO targets (id, session_id, type, target_id, name) VALUES (?, ?, ?, ?, ?)');
    
    const insertMany = db.transaction((groupsList) => {
      for (const group of groupsList) {
        stmt.run(uuidv4(), session_id, 'group', group.id, group.name || group.subject);
      }
    });
    insertMany(groups);

    res.json({ success: true, count: groups.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/targets/channels/sync', async (req, res) => {
  const { session_id } = req.body;
  try {
    const response = await whatsappService.getChannels(session_id);
    const channels = response.data.channels || [];

    const stmt = db.prepare('INSERT OR IGNORE INTO targets (id, session_id, type, target_id, name) VALUES (?, ?, ?, ?, ?)');
    
    const insertMany = db.transaction((channelList) => {
      for (const channel of channelList) {
        stmt.run(uuidv4(), session_id, 'channel', channel.id, channel.name);
      }
    });
    insertMany(channels);

    res.json({ success: true, count: channels.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/targets/contact', (req, res) => {
  const { session_id, phone_number, name } = req.body;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO targets (id, session_id, type, target_id, name) VALUES (?, ?, ?, ?, ?)');
    stmt.run(uuidv4(), session_id, 'number', phone_number, name);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/targets', (req, res) => {
  const stmt = db.prepare('SELECT * FROM targets ORDER BY created_at DESC');
  const targets = stmt.all();
  res.json(targets);
});

// --- Messages ---
app.post('/api/messages/send', upload.single('file'), async (req, res) => {
  const { session_id, target_type, target_id, message_type, content } = req.body;
  const file = req.file;
  const idempotencyKey = uuidv4();
  const messageId = uuidv4();
  const webhookUrl = `${process.env.APP_URL}/api/webhooks/wa-status`;

  try {
    // Save pending message
    const stmt = db.prepare('INSERT INTO messages (id, session_id, target_type, target_id, message_type, content, file_path, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(messageId, session_id, target_type, target_id, message_type, content || null, file ? file.path : null, idempotencyKey);

    let response;
    if (target_type === 'channel') {
      if (message_type === 'text') {
        response = await whatsappService.sendChannelText(session_id, target_id, content, idempotencyKey, webhookUrl);
      } else if (message_type === 'media' && file) {
        response = await whatsappService.sendChannelMedia(session_id, target_id, file.path, idempotencyKey, webhookUrl);
      } else if (message_type === 'attachment' && file) {
        response = await whatsappService.sendChannelAttachment(session_id, target_id, content, file.path, idempotencyKey, webhookUrl);
      } else if (message_type === 'mixed' && file) {
        response = await whatsappService.sendChannelMixed(session_id, target_id, content, file.path, idempotencyKey, webhookUrl);
      }
    } else {
      // number or group
      if (message_type === 'text') {
        response = await whatsappService.sendText(session_id, target_type, target_id, content, idempotencyKey, webhookUrl);
      } else if (message_type === 'media' && file) {
        response = await whatsappService.sendMedia(session_id, target_type, target_id, content, file.path, idempotencyKey, webhookUrl);
      }
    }

    // Update status
    db.prepare('UPDATE messages SET status = ? WHERE id = ?').run('SENT', messageId);
    db.prepare('INSERT INTO message_logs (id, message_id, status, details) VALUES (?, ?, ?, ?)').run(uuidv4(), messageId, 'SENT', JSON.stringify(response?.data || {}));

    res.json({ success: true, messageId, data: response?.data });
  } catch (error: any) {
    db.prepare('UPDATE messages SET status = ? WHERE id = ?').run('FAILED', messageId);
    db.prepare('INSERT INTO message_logs (id, message_id, status, details) VALUES (?, ?, ?, ?)').run(uuidv4(), messageId, 'FAILED', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', (req, res) => {
  const stmt = db.prepare('SELECT * FROM messages ORDER BY created_at DESC');
  const messages = stmt.all();
  res.json(messages);
});

// --- Webhooks ---
app.post('/api/webhooks/wa-status', (req, res) => {
  const payload = req.body;
  // payload should contain id (message_id), status, etc.
  try {
    // Find message by external ID or idempotency key if possible, but for MVP we just log it
    // If we had the internal messageId mapped to the external message_id, we'd update it here.
    const logId = uuidv4();
    db.prepare('INSERT INTO message_logs (id, message_id, status, details) VALUES (?, ?, ?, ?)').run(logId, payload.id || 'unknown', payload.status || 'WEBHOOK_RECEIVED', JSON.stringify(payload));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
