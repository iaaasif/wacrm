import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BaileysManager } from './baileys-manager.js';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const BAILEYS_GATEWAY_SECRET = process.env.BAILEYS_GATEWAY_SECRET || '';
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || 'http://localhost:3000/api/whatsapp/baileys/webhook';
const AUTH_FOLDER = process.env.AUTH_FOLDER || './auth_info_baileys';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const manager = new BaileysManager({
  authFolder: AUTH_FOLDER,
  webhookUrl: CRM_WEBHOOK_URL,
  webhookSecret: BAILEYS_GATEWAY_SECRET,
});

// Auth middleware for protected routes
function authenticate(req: Request, res: Response, next: NextFunction) {
  if (!BAILEYS_GATEWAY_SECRET) {
    return next();
  }

  const secretHeader = req.headers['x-baileys-secret'];
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (secretHeader === BAILEYS_GATEWAY_SECRET || token === BAILEYS_GATEWAY_SECRET) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: invalid or missing gateway secret' });
}

// Health check (public)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Session status
app.get('/session/status', authenticate, (_req: Request, res: Response) => {
  res.json(manager.getStatus());
});

// Session QR code
app.get('/session/qr', authenticate, (_req: Request, res: Response) => {
  const status = manager.getStatus();
  res.json({
    status: status.status,
    qrCodeUrl: status.qrCodeUrl,
    phone: status.phone,
    jid: status.jid,
  });
});

// Request 8-digit Pairing Code
app.post('/session/pairing-code', authenticate, async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const code = await manager.requestPairingCode(phone);
    return res.json({ code });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate pairing code' });
  }
});

// Restart connection
app.post('/session/restart', authenticate, async (_req: Request, res: Response) => {
  try {
    await manager.restart();
    return res.json({ success: true, message: 'Restart triggered' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to restart connection' });
  }
});

// Logout and clear credentials
app.post('/session/logout', authenticate, async (_req: Request, res: Response) => {
  try {
    await manager.logout();
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to logout' });
  }
});

// Send message
app.post('/messages/send', authenticate, async (req: Request, res: Response) => {
  const { recipient, content } = req.body;
  if (!recipient || !content) {
    return res.status(400).json({ error: 'recipient and content are required' });
  }

  try {
    const result = await manager.sendMessage(recipient, content);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

// Start Express and Baileys Manager
app.listen(PORT, async () => {
  console.log(`[Baileys Gateway] Listening on port ${PORT}`);
  try {
    await manager.start();
    console.log('[Baileys Gateway] Socket manager started');
  } catch (err) {
    console.error('[Baileys Gateway] Failed to start socket manager:', err);
  }
});
