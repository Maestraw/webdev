import path from 'node:path';
import process from 'node:process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import readline from 'node:readline/promises';

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let currentPageToken = null;
let pageHistory = []; 

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

async function sendEmail(auth, { to, subject, body, threadId = null, references = null }) {
  const gmail = google.gmail({ version: 'v1', auth });
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    references ? `In-Reply-To: ${references}` : '',
    references ? `References: ${references}` : '',
    '',
    body,
  ];
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage, threadId },
  });
}

async function viewThread(auth, threadId) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.threads.get({ userId: 'me', id: threadId });
  const threadMessages = res.data.messages;

  console.clear();
  console.log(`--- CONVERSATION HISTORY (${threadMessages.length} messages) --- \n`);

  threadMessages.forEach((msg) => {
    const from = msg.payload.headers.find(h => h.name === 'From')?.value || 'Unknown';
    const body = getMessageBody(msg.payload);
    
    // Formatting it to look more like a chat
    const isMe = from.includes("me") || from.includes("your-email@gmail.com"); // Optional: add your email here
    console.log(`[${from}]`);
    console.log(`${body.trim()}`);
    console.log('-'.repeat(30));
  });

  return threadMessages[threadMessages.length - 1]; 
}

async function mainLoop(auth) {
  console.clear();
  console.log('--- ECHOFI TERMINAL ---');
  console.log('1. View Inbox');
  console.log('2. Compose New Email');
  console.log('3. Exit');
  
  const choice = await rl.question('\nSelect: ');

  if (choice === '1') {
    const gmail = google.gmail({ version: 'v1', auth }); // FIXED THIS LINE
    const res = await gmail.users.messages.list({ 
        userId: 'me', 
        maxResults: 10,
        pageToken: currentPageToken 
    });

    const messages = res.data.messages || [];
    const nextPageToken = res.data.nextPageToken;

    console.log(`\n--- INBOX (Page ${pageHistory.length + 1}) ---`);
    const details = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: messages[i].id });
      const subject = msg.data.payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = msg.data.payload.headers.find(h => h.name === 'From')?.value || 'Unknown';
      details.push(msg.data);
      console.log(`[${i}] ${from.substring(0, 25).padEnd(26)} | ${subject.substring(0, 40)}`);
    }

    console.log('\nOptions: [ID] to Read | [n]ext page | [p]revious page | [b]ack');
    const input = await rl.question('Choice: ');

    if (input === 'n' && nextPageToken) {
      pageHistory.push(currentPageToken);
      currentPageToken = nextPageToken;
      return mainLoop(auth);
    } else if (input === 'p' && pageHistory.length > 0) {
      currentPageToken = pageHistory.pop();
      return mainLoop(auth);
    } else if (input === 'b') {
      return mainLoop(auth);
    } else if (details[input]) {
      const lastMsg = await viewThread(auth, details[input].threadId);
      
      console.log('\nActions: [r]eply | [f]orward | [b]ack');
      const action = await rl.question('Action: ');

      const subject = lastMsg.payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = lastMsg.payload.headers.find(h => h.name === 'From')?.value || '';

      if (action === 'r') {
        const replyText = await rl.question('\nMessage: ');
        await sendEmail(auth, { 
            to: from, 
            subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`, 
            body: replyText, 
            threadId: lastMsg.threadId, 
            references: lastMsg.id 
        });
        console.log('Sent!');
      } else if (action === 'f') {
        const forwardTo = await rl.question('\nForward to: ');
        await sendEmail(auth, { 
            to: forwardTo, 
            subject: `Fwd: ${subject}`, 
            body: getMessageBody(lastMsg.payload) 
        });
        console.log('Forwarded!');
      }
    }
  } else if (choice === '2') {
    const to = await rl.question('To: ');
    const sub = await rl.question('Subject: ');
    const body = await rl.question('Message: ');
    await sendEmail(auth, { to, subject: sub, body });
    console.log('Email Sent!');
  } else if (choice === '3') {
    process.exit();
  }

  await rl.question('\nPress Enter to return to menu...');
  mainLoop(auth);
}

async function run() {
  const auth = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
  mainLoop(auth);
}

run().catch(console.error);