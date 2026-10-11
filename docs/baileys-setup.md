# WhatsApp Linked Device (Baileys) Integration Guide

WACRM supports **Linked Device mode** powered by **Baileys** (`@whiskeysockets/baileys`) alongside the official Meta WhatsApp Cloud API in **Hybrid Mode**.

---

## 🌟 Benefits of Linked Device (Baileys)
- **Zero message costs**: No per-conversation or template fees paid to Meta.
- **Instant activation**: Scan a QR code from any standard WhatsApp or WhatsApp Business mobile app — no Meta Business verification or developer account required.
- **Full CRM feature parity**: Messages sync to the shared inbox, AI reply assistant, flows, contact management, and automations.

---

## 🚀 How to Run Locally

### 1. Configure Environment Variables
In your root `.env.local`:
```bash
# Baileys Gateway settings
BAILEYS_GATEWAY_URL=http://localhost:3001
BAILEYS_GATEWAY_SECRET=your-random-secure-secret-token
```

In `services/baileys/.env`:
```bash
PORT=3001
BAILEYS_GATEWAY_SECRET=your-random-secure-secret-token
CRM_WEBHOOK_URL=http://localhost:3000/api/whatsapp/baileys/webhook
AUTH_FOLDER=./auth_info_baileys
```

### 2. Start the Baileys Gateway Service
Open a terminal in `services/baileys`:
```bash
cd services/baileys
npm install
npm run dev
```
The gateway will start listening on port `3001`.

### 3. Start WACRM Next.js App
In a second terminal:
```bash
npm run dev
```
Open <http://localhost:3000>.

---

## 🐳 Running with Docker Compose
The gateway is integrated into `docker-compose.yml`:
```bash
docker compose up --build
```
This launches:
- `app`: WACRM Next.js on port 3000
- `baileys`: Baileys Gateway on port 3001 with persistent session volume (`baileys_auth`)

---

## 📱 How to Connect Your Device

1. Go to **Settings** (`/settings?tab=whatsapp`).
2. At the top of the WhatsApp Settings panel, toggle to **Linked Device (Baileys)**.
3. Open WhatsApp on your smartphone:
   - **Android**: Tap the 3 dots (top right) → **Linked Devices** → **Link a Device**.
   - **iPhone**: Tap **Settings** (bottom right) → **Linked Devices** → **Link a Device**.
4. Point your camera at the QR code displayed on screen (or enter your phone number to get an 8-digit Pairing Code).
5. Once scanned, your status will turn green with **WhatsApp Connected**!

---

## ⚠️ Best Practices & Safety Tips
- Do **not** send mass spam or unprompted marketing to thousands of numbers at once.
- Warm up new numbers gradually before doing broadcasts.
- If you need high-volume, Meta-approved marketing broadcasts, toggle back to **Meta Cloud API** in Settings.
