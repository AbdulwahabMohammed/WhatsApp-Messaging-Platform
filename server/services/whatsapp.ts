import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_KEY = process.env.WHATSAPP_API_KEY || 'dummy_api_key';
const BASE_URL = process.env.WHATSAPP_API_URL || 'http://localhost:8080';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-api-key': API_KEY,
  },
});

export const whatsappService = {
  // Session Management
  initSession: async (sessionId: string) => {
    return client.post('/sessions/init', { session_id: sessionId });
  },
  
  getStatus: async (sessionId: string) => {
    return client.get('/wa/status', { params: { session_id: sessionId } });
  },

  getScanUrl: (sessionId: string) => {
    return `${BASE_URL}/wa/scan?session_id=${sessionId}`;
  },

  // Target Management
  getGroups: async (sessionId: string) => {
    return client.get('/wa/groups', { params: { session_id: sessionId } });
  },

  getChannels: async (sessionId: string) => {
    return client.get('/v3/channels', { params: { session_id: sessionId } });
  },

  // Messaging
  sendText: async (sessionId: string, toType: string, to: string, text: string, idempotencyKey: string, webhookUrl?: string) => {
    return client.post('/wa/send-text', {
      session_id: sessionId,
      to_type: toType,
      to,
      text,
      webhook_url: webhookUrl,
    }, {
      headers: { 'x-idempotency-key': idempotencyKey }
    });
  },

  sendMedia: async (sessionId: string, toType: string, to: string, caption: string, filePath: string, idempotencyKey: string, webhookUrl?: string) => {
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('to_type', toType);
    form.append('to', to);
    if (caption) form.append('caption', caption);
    form.append('file', fs.createReadStream(filePath));
    if (webhookUrl) form.append('webhook_url', webhookUrl);

    return client.post('/wa/send-media', form, {
      headers: {
        ...form.getHeaders(),
        'x-idempotency-key': idempotencyKey,
      },
    });
  },

  // Channel Messaging (v3)
  sendChannelText: async (sessionId: string, channelId: string, text: string, idempotencyKey: string, webhookUrl?: string) => {
    return client.post('/v3/channels/text', {
      session_id: sessionId,
      channel_id: channelId,
      text,
      webhook_url: webhookUrl,
    }, {
      headers: { 'x-idempotency-key': idempotencyKey }
    });
  },

  sendChannelMedia: async (sessionId: string, channelId: string, filePath: string, idempotencyKey: string, webhookUrl?: string) => {
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('channel_id', channelId);
    form.append('file', fs.createReadStream(filePath));
    if (webhookUrl) form.append('webhook_url', webhookUrl);

    return client.post('/v3/channels/media', form, {
      headers: {
        ...form.getHeaders(),
        'x-idempotency-key': idempotencyKey,
      },
    });
  },

  sendChannelAttachment: async (sessionId: string, channelId: string, text: string, filePath: string, idempotencyKey: string, webhookUrl?: string) => {
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('channel_id', channelId);
    if (text) form.append('text', text);
    form.append('file', fs.createReadStream(filePath));
    if (webhookUrl) form.append('webhook_url', webhookUrl);

    return client.post('/v3/channels/attachments', form, {
      headers: {
        ...form.getHeaders(),
        'x-idempotency-key': idempotencyKey,
      },
    });
  },

  sendChannelMixed: async (sessionId: string, channelId: string, text: string, filePath: string, idempotencyKey: string, webhookUrl?: string) => {
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('channel_id', channelId);
    if (text) form.append('text', text);
    form.append('file', fs.createReadStream(filePath));
    if (webhookUrl) form.append('webhook_url', webhookUrl);

    return client.post('/v3/channels/mixed', form, {
      headers: {
        ...form.getHeaders(),
        'x-idempotency-key': idempotencyKey,
      },
    });
  }
};
