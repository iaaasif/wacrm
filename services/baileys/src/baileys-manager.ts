import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type ConnectionState,
  type proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';

export interface BaileysStatus {
  status: 'connected' | 'connecting' | 'disconnected';
  phone: string | null;
  jid: string | null;
  qrCodeUrl: string | null;
  pairingCode: string | null;
  lastUpdated: string;
}

export class BaileysManager {
  private sock: WASocket | null = null;
  private authFolder: string;
  private webhookUrl: string;
  private webhookSecret: string;
  private logger = pino({ level: process.env.LOG_LEVEL || 'info' });

  private currentStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private currentQrDataUrl: string | null = null;
  private currentRawQr: string | null = null;
  private connectedJid: string | null = null;
  private connectedPhone: string | null = null;
  private saveCreds: (() => Promise<void>) | null = null;

  constructor(options: { authFolder: string; webhookUrl: string; webhookSecret: string }) {
    this.authFolder = path.resolve(options.authFolder);
    this.webhookUrl = options.webhookUrl;
    this.webhookSecret = options.webhookSecret;

    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
    }
  }

  public async start(): Promise<void> {
    if (this.sock) {
      return;
    }

    this.currentStatus = 'connecting';
    const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
    this.saveCreds = saveCreds;

    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      logger: this.logger as any,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger as any),
      },
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });

    this.sock.ev.on('creds.update', async () => {
      if (this.saveCreds) {
        await this.saveCreds();
      }
    });

    this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.currentRawQr = qr;
        try {
          this.currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
        } catch (err) {
          this.logger.error({ err }, 'Failed to render QR Code');
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.logger.warn({ statusCode, shouldReconnect }, 'Connection closed');

        this.currentStatus = 'disconnected';
        this.currentQrDataUrl = null;
        this.currentRawQr = null;
        this.sock = null;

        if (statusCode === DisconnectReason.loggedOut) {
          this.logger.warn('Device logged out, removing auth folder');
          await this.clearAuthFolder();
          await this.notifyWebhook('connection_update', {
            status: 'disconnected',
            reason: 'logged_out',
          });
        } else if (shouldReconnect) {
          setTimeout(() => {
            this.start().catch((e) => this.logger.error({ e }, 'Error reconnecting'));
          }, 3000);
        }
      } else if (connection === 'open') {
        this.currentStatus = 'connected';
        this.currentQrDataUrl = null;
        this.currentRawQr = null;

        const userJid = this.sock?.user?.id || '';
        this.connectedJid = userJid;
        // JID format: 88017XXXXXXXX:X@s.whatsapp.net -> extract digits
        const phone = userJid.split(':')[0]?.split('@')[0] || null;
        this.connectedPhone = phone;

        this.logger.info({ jid: this.connectedJid, phone: this.connectedPhone }, 'WhatsApp connected successfully');

        await this.notifyWebhook('connection_update', {
          status: 'connected',
          phone: this.connectedPhone,
          jid: this.connectedJid,
        });
      }
    });

    // Inbound Messages
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        // Skip messages sent by our own socket in other sessions if needed,
        // or forward them to sync the conversation
        await this.handleIncomingMessage(msg);
      }
    });

    // Message Status Updates (Delivered, Read)
    this.sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        await this.notifyWebhook('message_status_update', update);
      }
    });
  }

  public getStatus(): BaileysStatus {
    return {
      status: this.currentStatus,
      phone: this.connectedPhone,
      jid: this.connectedJid,
      qrCodeUrl: this.currentQrDataUrl,
      pairingCode: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  public async requestPairingCode(phoneNumber: string): Promise<string> {
    if (!this.sock) {
      throw new Error('Socket is not initialized');
    }
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const code = await this.sock.requestPairingCode(cleanPhone);
    return code;
  }

  public async sendMessage(
    recipientPhoneOrJid: string,
    content: {
      text?: string;
      image?: { url: string; caption?: string };
      video?: { url: string; caption?: string };
      audio?: { url: string };
      document?: { url: string; mimetype?: string; filename?: string; caption?: string };
      react?: { text: string; key: any };
    }
  ): Promise<{ messageId: string }> {
    if (!this.sock || this.currentStatus !== 'connected') {
      throw new Error('WhatsApp is not connected');
    }

    let jid = recipientPhoneOrJid;
    if (!jid.includes('@')) {
      const cleanPhone = recipientPhoneOrJid.replace(/[^0-9]/g, '');
      jid = `${cleanPhone}@s.whatsapp.net`;
    }

    let payload: any = {};
    if (content.text) {
      payload = { text: content.text };
    } else if (content.image) {
      payload = { image: { url: content.image.url }, caption: content.image.caption };
    } else if (content.video) {
      payload = { video: { url: content.video.url }, caption: content.video.caption };
    } else if (content.audio) {
      payload = { audio: { url: content.audio.url }, mimetype: 'audio/mp4' };
    } else if (content.document) {
      payload = {
        document: { url: content.document.url },
        mimetype: content.document.mimetype || 'application/octet-stream',
        fileName: content.document.filename || 'document',
        caption: content.document.caption,
      };
    } else if (content.react) {
      payload = { react: content.react };
    } else {
      throw new Error('Unsupported message payload');
    }

    const sent = await this.sock.sendMessage(jid, payload);
    const messageId = sent?.key?.id || '';
    return { messageId };
  }

  public async logout(): Promise<void> {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        this.logger.warn({ e }, 'Error during socket logout');
      }
      this.sock = null;
    }
    await this.clearAuthFolder();
    this.currentStatus = 'disconnected';
    this.currentQrDataUrl = null;
    this.connectedJid = null;
    this.connectedPhone = null;
  }

  public async restart(): Promise<void> {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (e) {
        this.logger.warn({ e }, 'Error terminating socket');
      }
      this.sock = null;
    }
    await this.start();
  }

  private async clearAuthFolder(): Promise<void> {
    if (fs.existsSync(this.authFolder)) {
      fs.rmSync(this.authFolder, { recursive: true, force: true });
      fs.mkdirSync(this.authFolder, { recursive: true });
    }
  }

  private async handleIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
    if (!msg.message) return;

    // Normalize Baileys message structure into a webhook payload
    const fromMe = Boolean(msg.key.fromMe);
    const remoteJid = msg.key.remoteJid || '';
    const messageId = msg.key.id || '';
    const participant = msg.key.participant || remoteJid;

    // Disregard status broadcast messages (WhatsApp status stories)
    if (remoteJid === 'status@broadcast') return;

    const messageContent = msg.message;
    let text = '';
    let type = 'text';
    let mediaUrl: string | undefined;

    if (messageContent.conversation) {
      text = messageContent.conversation;
      type = 'text';
    } else if (messageContent.extendedTextMessage?.text) {
      text = messageContent.extendedTextMessage.text;
      type = 'text';
    } else if (messageContent.imageMessage) {
      type = 'image';
      text = messageContent.imageMessage.caption || '';
    } else if (messageContent.videoMessage) {
      type = 'video';
      text = messageContent.videoMessage.caption || '';
    } else if (messageContent.audioMessage) {
      type = 'audio';
    } else if (messageContent.documentMessage) {
      type = 'document';
      text = messageContent.documentMessage.caption || '';
    } else if (messageContent.reactionMessage) {
      type = 'reaction';
      text = messageContent.reactionMessage.text || '';
    }

    const senderPhone = (fromMe ? this.connectedPhone : participant.split('@')[0]?.split(':')[0]) || '';

    const payload = {
      event: 'inbound_message',
      message: {
        id: messageId,
        fromMe,
        remoteJid,
        senderPhone,
        timestamp: typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : Number(msg.messageTimestamp || Date.now() / 1000),
        type,
        text,
        rawMessage: msg,
      },
    };

    await this.notifyWebhook('inbound_message', payload);
  }

  private async notifyWebhook(eventType: string, data: any): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-baileys-secret': this.webhookSecret,
        },
        body: JSON.stringify({
          event: eventType,
          data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        this.logger.warn({ status: response.status, statusText: response.statusText }, 'Webhook notification returned non-200');
      }
    } catch (err) {
      this.logger.error({ err }, 'Failed to deliver webhook notification to CRM');
    }
  }
}
