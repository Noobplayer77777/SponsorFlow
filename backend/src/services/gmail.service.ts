import { google } from 'googleapis';
import crypto from 'crypto';
import prisma from '../utils/prisma';

// Use standard OAuth callback for backend Gmail integration
// This is typically different from the frontend Next.js login callback
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/gmail/callback';

export const getGmailClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
};

export const generateGmailAuthUrl = () => {
  const oauth2Client = getGmailClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get a refresh token
    prompt: 'consent', // Force consent screen to guarantee refresh token is returned
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
};

export const handleGmailCallback = async (code: string, userId: string) => {
  const oauth2Client = getGmailClient();
  const { tokens } = await oauth2Client.getToken(code);
  
  oauth2Client.setCredentials(tokens);

  // Fetch the user's Gmail address
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email;

  if (!email) throw new Error('Could not retrieve email address from Google');

  // Securely store the tokens in the database, attached to the User record
  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailAddress: email,
      gmailAccessToken: tokens.access_token,
      gmailRefreshToken: tokens.refresh_token,
      // Default to 1 hour if expiry_date is undefined
      gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000),
    },
  });

  return email;
};

// Internal function to ensure token freshness
const getAuthenticatedGmailClient = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user || !user.gmailRefreshToken) {
    throw new Error('Gmail not connected');
  }

  const oauth2Client = getGmailClient();
  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
    expiry_date: user.gmailTokenExpiry ? user.gmailTokenExpiry.getTime() : null,
  });

  // Automatically handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          gmailAccessToken: tokens.access_token,
          ...(tokens.refresh_token ? { gmailRefreshToken: tokens.refresh_token } : {}),
          ...(tokens.expiry_date ? { gmailTokenExpiry: new Date(tokens.expiry_date) } : {}),
        },
      });
    }
  });

  // Verify connection by attempting to get access token (will trigger refresh if needed)
  try {
    await oauth2Client.getAccessToken();
  } catch (error: any) {
    if (error.message.includes('invalid_grant')) {
      // User revoked access from their Google account manually
      await prisma.user.update({
        where: { id: userId },
        data: {
          gmailAddress: null,
          gmailAccessToken: null,
          gmailRefreshToken: null,
          gmailTokenExpiry: null,
        }
      });
      throw new Error('Gmail authorization revoked or expired. Please reconnect.');
    }
    throw error;
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

// Build RFC 2822 compliant email with optional attachments
const createMimeEmail = (to: string, subject: string, body: string, attachments?: { filename: string, content: Buffer, mimeType: string }[]) => {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const boundary = `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
  
  let raw = `To: ${to}\r\n`;
  raw += `Subject: ${utf8Subject}\r\n`;
  raw += `MIME-Version: 1.0\r\n`;
  
  if (attachments && attachments.length > 0) {
    raw += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    raw += `--${boundary}\r\n`;
    raw += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
    raw += `${body}\r\n\r\n`;
    
    for (const att of attachments) {
      raw += `--${boundary}\r\n`;
      raw += `Content-Type: ${att.mimeType}; name="${att.filename}"\r\n`;
      raw += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
      raw += `Content-Transfer-Encoding: base64\r\n\r\n`;
      raw += `${att.content.toString('base64')}\r\n\r\n`;
    }
    raw += `--${boundary}--`;
  } else {
    raw += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
    raw += `${body}`;
  }
  
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const sendGmail = async (
  userId: string, 
  to: string, 
  subject: string, 
  body: string,
  attachments?: { filename: string, content: Buffer, mimeType: string }[]
) => {
  const gmail = await getAuthenticatedGmailClient(userId);
  const rawMessage = createMimeEmail(to, subject, body, attachments);

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });
    return res.data;
  } catch (error: any) {
    if (error.code === 429) {
      throw new Error('Gmail API rate limit exceeded. Please try again later.');
    }
    if (error.code === 400 && error.message.includes('invalid recipient')) {
      throw new Error('Invalid email recipient address.');
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
