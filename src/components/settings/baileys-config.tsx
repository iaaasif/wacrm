'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  QrCode,
  Smartphone,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function BaileysConfig() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [jid, setJid] = useState<string | null>(null);

  // Pairing code mode
  const [usePairingCode, setUsePairingCode] = useState(false);
  const [pairPhoneInput, setPairPhoneInput] = useState('');
  const [pairingCodeResult, setPairingCodeResult] = useState<string | null>(null);
  const [pairLoading, setPairLoading] = useState(false);

  const fetchStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch('/api/whatsapp/baileys/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data.status);
      setQrCodeUrl(data.qrCodeUrl);
      setPhone(data.phone);
      setJid(data.jid);
    } catch (err: any) {
      console.error('[Baileys] Error fetching status:', err);
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, []);

  // Poll status while connecting/scanning
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleRestart() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp/baileys/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      });
      if (!res.ok) throw new Error('Restart failed');
      toast.success('Baileys connection restarted');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to restart connection');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLogout() {
    if (!confirm('Are you sure you want to disconnect this WhatsApp number?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp/baileys/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      if (!res.ok) throw new Error('Logout failed');
      toast.success('Logged out successfully');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to logout');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestPairingCode() {
    if (!pairPhoneInput.trim()) {
      toast.error('Please enter a phone number with country code');
      return;
    }
    setPairLoading(true);
    try {
      const res = await fetch('/api/whatsapp/baileys/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pair', phone: pairPhoneInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get code');
      setPairingCodeResult(data.code);
      toast.success('Pairing code generated! Enter it in WhatsApp.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate code');
    } finally {
      setPairLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = status === 'connected';

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-full ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-amber-500/10 text-amber-500'
                }`}
              >
                {isConnected ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {isConnected ? 'WhatsApp Connected' : 'WhatsApp Disconnected'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? `Active Device: +${phone || 'Unknown'} (${jid || ''})`
                    : 'Scan the QR code below from your WhatsApp mobile app to connect.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStatus()}
                disabled={refreshing || actionLoading}
              >
                <RefreshCw className={`mr-1.5 size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isConnected ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                  disabled={actionLoading}
                >
                  <LogOut className="mr-1.5 size-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestart}
                  disabled={actionLoading}
                >
                  Restart Socket
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Area */}
      {!isConnected && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* QR Code Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="size-4 text-primary" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-6">
              <div className="relative flex size-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4">
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeUrl}
                    alt="WhatsApp QR Code"
                    className="size-full rounded-lg object-contain shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span>Generating QR Code...</span>
                    <span className="text-xs">Ensure Baileys microservice is running</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                QR codes expire every 20-30 seconds. The code refreshes automatically.
              </p>
            </CardContent>
          </Card>

          {/* Pairing Code Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="size-4 text-primary" />
                Link with Phone Number
              </CardTitle>
              <CardDescription>
                Alternative: enter your phone number to receive an 8-digit pairing code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pairPhone">Phone number (with country code)</Label>
                <div className="flex gap-2">
                  <Input
                    id="pairPhone"
                    placeholder="+88017XXXXXXXX"
                    value={pairPhoneInput}
                    onChange={(e) => setPairPhoneInput(e.target.value)}
                  />
                  <Button
                    onClick={handleRequestPairingCode}
                    disabled={pairLoading}
                    className="shrink-0"
                  >
                    {pairLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="mr-1.5 size-4" />
                    )}
                    Get Code
                  </Button>
                </div>
              </div>

              {pairingCodeResult && (
                <Alert className="border-primary/20 bg-primary/5">
                  <ShieldCheck className="size-4 text-primary" />
                  <AlertTitle className="text-sm font-semibold">Your Pairing Code</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="text-center font-mono text-2xl font-bold tracking-widest text-primary">
                      {pairingCodeResult}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      Notification received on your phone? Tap it and type this code.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg bg-muted/40 p-4 text-xs space-y-2 text-muted-foreground">
                <p className="font-medium text-foreground">Important Baileys Guidelines:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>No Meta Developer Account or verification fees required.</li>
                  <li>Works directly with your personal or regular WhatsApp Business app.</li>
                  <li>Avoid sudden mass broadcasts to unknown numbers to prevent number blocks.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connected Details */}
      {isConnected && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-4 text-emerald-500" />
              Linked Device Active
            </CardTitle>
            <CardDescription>
              Messages sent from WACRM inbox and automations will route through your linked device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 border border-border">
              <div>
                <span className="text-xs text-muted-foreground block">Connected Number</span>
                <span className="font-semibold text-foreground">+{phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Session ID / JID</span>
                <span className="font-mono text-xs text-foreground">{jid || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
