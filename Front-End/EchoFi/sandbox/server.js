import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

let authClient = null;

async function getAuthorizedClient() {
  if (!authClient) authClient = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
  return authClient;
}

function getMessageBody(payload) {
  let body = "";
  if (payload.parts) {
    const part = payload.parts.find(p => p.mimeType === 'text/plain') || payload.parts[0];
    if (part.body && part.body.data) body = Buffer.from(part.body.data, 'base64').toString();
    else if (part.parts) body = getMessageBody(part); 
  } else if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, 'base64').toString();
  }
  return body || "[No content]";
}

app.get('/api/user', async (req, res) => {
  try {
    const auth = await getAuthorizedClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    res.json({ email: profile.data.emailAddress });
  } catch (error) { res.status(401).json({ error: "Not authenticated" }); }
});

app.post('/api/logout', async (req, res) => {
  try {
    authClient = null;
    try { await fs.unlink(TOKEN_PATH); } catch (e) {} 
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/messages', async (req, res) => {
  try {
    const auth = await getAuthorizedClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const response = await gmail.users.messages.list({ userId: 'me', maxResults: 1000000 });
    const messages = response.data.messages || [];

    const details = await Promise.all(messages.map(async (m) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
      return {
        id: detail.data.id,
        threadId: detail.data.threadId,
        from: detail.data.payload.headers.find(h => h.name === 'From')?.value || 'Unknown',
        subject: detail.data.payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject',
        snippet: detail.data.snippet,
        isUnread: detail.data.labelIds.includes('UNREAD'),
        timestamp: new Date(detail.data.payload.headers.find(h => h.name === 'Date')?.value).getTime()
      };
    }));

    const grouped = {};
    details.forEach(msg => {
      const emailMatch = msg.from.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : msg.from;
      if (!grouped[email] || msg.timestamp > grouped[email].timestamp) {
        grouped[email] = msg;
      }
    });

    res.json({ messages: Object.values(grouped).sort((a, b) => b.timestamp - a.timestamp) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/threads/:id', async (req, res) => {
  try {
    const auth = await getAuthorizedClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const response = await gmail.users.threads.get({ userId: 'me', id: req.params.id, format: 'full' });
    
    const threadMessages = response.data.messages.map(msg => ({
      id: msg.id,
      from: msg.payload.headers.find(h => h.name === 'From')?.value,
      fromName: (msg.payload.headers.find(h => h.name === 'From')?.value || "").split('<')[0].replace(/"/g, '').trim(),
      body: getMessageBody(msg.payload),
      isMe: msg.labelIds.includes('SENT'),
      time: new Date(parseInt(msg.internalDate)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    res.json({ messages: threadMessages });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/send', async (req, res) => {
  try {
    const { to, subject, body, threadId, messageId } = req.body;
    const auth = await getAuthorizedClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const messageParts = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', messageId ? `In-Reply-To: ${messageId}` : '', messageId ? `References: ${messageId}` : '', '', body];
    const encodedMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage, threadId } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => console.log(`🚀 EchoFi Server: http://localhost:${PORT}`));