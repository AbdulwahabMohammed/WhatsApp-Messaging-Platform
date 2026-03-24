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
  const url = whatsappService.getScanUrl(id);
  res.json({ url });
});

app.get('/api/sessions', (req, res) => {
  const stmt = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC');
  const sessions = stmt.all();
  res.json(sessions);
});

// --- Targets ---
app.get('/api/whatsapp/groups', async (req, res) => {
  const { session_id } = req.query;
  try {
    const response = await whatsappService.getGroups(session_id as string);
    let groups = response.data.groups || response.data || [];
    
    if (!Array.isArray(groups)) {
      groups = [];
    }

    res.json(groups);
  } catch (error: any) {
    console.error('Error fetching groups:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ 
      error: error.message, 
      details: error.response?.data 
    });
  }
});

app.get('/api/whatsapp/channels', async (req, res) => {
  const { session_id } = req.query;
  try {
    const response = await whatsappService.getChannels(session_id as string);
    
    if (response.data && response.data.ok === false) {
      if (response.data.code === 'NOT_SUPPORTED') {
        return res.status(501).json({ code: 'NOT_SUPPORTED', error: 'Channel listing not supported by current Baileys build' });
      }
      return res.status(400).json(response.data);
    }

    let channels = response.data.channels || response.data || [];
    
    if (!Array.isArray(channels)) {
      channels = [];
    }

    res.json(channels);
  } catch (error: any) {
    console.error('Error fetching channels:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const data = error.response?.data || {};
    
    if (status === 501 || data.code === 'NOT_SUPPORTED') {
      return res.status(501).json({ code: 'NOT_SUPPORTED', error: 'Channel listing not supported by current Baileys build' });
    }

    res.status(status).json({ 
      error: error.message, 
      details: data 
    });
  }
});

app.post('/api/targets/bulk', (req, res) => {
  const { session_id, targets } = req.body;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO targets (id, session_id, type, target_id, name) VALUES (?, ?, ?, ?, ?)');
    
    const insertMany = db.transaction((targetList) => {
      for (const t of targetList) {
        stmt.run(uuidv4(), session_id, t.type, t.target_id, t.name);
      }
    });
    insertMany(targets);

    res.json({ success: true, count: targets.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/targets/manual', (req, res) => {
  const { session_id, type, target_id, name } = req.body;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO targets (id, session_id, type, target_id, name) VALUES (?, ?, ?, ?, ?)');
    stmt.run(uuidv4(), session_id, type || 'number', target_id, name);
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
      } else if (file) {
        if (message_type === 'attachment') {
          response = await whatsappService.sendChannelAttachment(session_id, target_id, content || '', file.path, idempotencyKey, webhookUrl);
        } else if (message_type === 'mixed' || (message_type === 'media' && content)) {
          // If it's mixed, or if it's media but has a caption, we must use the mixed endpoint
          response = await whatsappService.sendChannelMixed(session_id, target_id, content || '', file.path, idempotencyKey, webhookUrl);
        } else {
          // Media only (no caption)
          response = await whatsappService.sendChannelMedia(session_id, target_id, file.path, idempotencyKey, webhookUrl);
        }
      }
    } else if (target_type === 'channel_invite') {
      if (message_type === 'text') {
        response = await whatsappService.sendChannelTextByInvite(session_id, target_id, content, idempotencyKey, webhookUrl);
      } else if (file) {
        if (message_type === 'attachment') {
          response = await whatsappService.sendChannelAttachmentByInvite(session_id, target_id, content || '', file.path, idempotencyKey, webhookUrl);
        } else if (message_type === 'mixed' || (message_type === 'media' && content)) {
          response = await whatsappService.sendChannelMixedByInvite(session_id, target_id, content || '', file.path, idempotencyKey, webhookUrl);
        } else {
          response = await whatsappService.sendChannelMediaByInvite(session_id, target_id, file.path, idempotencyKey, webhookUrl);
        }
      }
    } else {
      // number or group
      if (message_type === 'text') {
        response = await whatsappService.sendText(session_id, target_type, target_id, content, idempotencyKey, webhookUrl);
      } else if (file) {
        // For numbers and groups, sendMedia handles all files and optional captions
        response = await whatsappService.sendMedia(session_id, target_type, target_id, content || '', file.path, idempotencyKey, webhookUrl);
      }
    }

    // Update status
    const externalId = response?.data?.channel_message_id || response?.data?.id || response?.data?.message_id || null;
    db.prepare('UPDATE messages SET status = ?, external_id = ? WHERE id = ?').run('SENT', externalId, messageId);
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
    const logId = uuidv4();
    const externalId = payload.channel_message_id || payload.id;
    const status = payload.status || 'WEBHOOK_RECEIVED';

    if (externalId) {
      // Try to find the message by external_id
      const msg = db.prepare('SELECT id FROM messages WHERE external_id = ?').get(externalId) as any;
      if (msg) {
        db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, msg.id);
        db.prepare('INSERT INTO message_logs (id, message_id, status, details) VALUES (?, ?, ?, ?)').run(logId, msg.id, status, JSON.stringify(payload));
      } else {
        // Fallback if not found
        db.prepare('INSERT INTO message_logs (id, message_id, status, details) VALUES (?, ?, ?, ?)').run(logId, externalId, status, JSON.stringify(payload));
      }
    } else {
      db.prepare('INSERT INTO message_logs (id, message_id, status, details) VALUES (?, ?, ?, ?)').run(logId, 'unknown', status, JSON.stringify(payload));
    }
    
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
