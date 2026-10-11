/**
 * Client for communicating with the Baileys WhatsApp Gateway microservice.
 */

const GATEWAY_URL = process.env.BAILEYS_GATEWAY_URL || 'http://localhost:3001';
const GATEWAY_SECRET = process.env.BAILEYS_GATEWAY_SECRET || '';

interface BaileysSessionStatus {
  status: 'connected' | 'connecting' | 'disconnected';
  phone: string | null;
  jid: string | null;
  qrCodeUrl: string | null;
  pairingCode: string | null;
  lastUpdated: string;
}

interface SendBaileysOptions {
  recipient: string;
  content: {
    text?: string;
    image?: { url: string; caption?: string };
    video?: { url: string; caption?: string };
    audio?: { url: string };
    document?: { url: string; mimetype?: string; filename?: string; caption?: string };
    react?: { text: string; key: any };
  };
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(GATEWAY_SECRET ? { 'x-baileys-secret': GATEWAY_SECRET } : {}),
  };
}

export async function getBaileysStatus(): Promise<BaileysSessionStatus> {
  try {
    const res = await fetch(`${GATEWAY_URL}/session/status`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Baileys gateway error (${res.status}): ${res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    return {
      status: 'disconnected',
      phone: null,
      jid: null,
      qrCodeUrl: null,
      pairingCode: null,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function getBaileysQr(): Promise<{
  status: 'connected' | 'connecting' | 'disconnected';
  qrCodeUrl: string | null;
  phone: string | null;
  jid: string | null;
}> {
  try {
    const res = await fetch(`${GATEWAY_URL}/session/qr`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Baileys gateway error (${res.status}): ${res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    return {
      status: 'disconnected',
      qrCodeUrl: null,
      phone: null,
      jid: null,
    };
  }
}

export async function requestBaileysPairingCode(phone: string): Promise<string> {
  const res = await fetch(`${GATEWAY_URL}/session/pairing-code`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to request pairing code');
  }

  const data = await res.json();
  return data.code;
}

export async function restartBaileysSession(): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/session/restart`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to restart Baileys connection');
  }
}

export async function logoutBaileysSession(): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/session/logout`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to logout Baileys session');
  }
}

export async function sendBaileysMessage(
  options: SendBaileysOptions
): Promise<{ messageId: string }> {
  const res = await fetch(`${GATEWAY_URL}/messages/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Baileys message send failed (${res.status})`);
  }

  return await res.json();
}
