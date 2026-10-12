export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WACRM Baileys API — WhatsApp Gateway</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #06090f;
            --card-bg: rgba(13, 19, 33, 0.75);
            --card-border: rgba(255, 255, 255, 0.08);
            --card-hover-border: rgba(37, 211, 102, 0.35);
            --primary: #25D366;
            --primary-glow: rgba(37, 211, 102, 0.25);
            --emerald: #10b981;
            --emerald-glow: rgba(16, 185, 129, 0.25);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --text-dim: #64748b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2.5rem 1.25rem;
            position: relative;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 50% 0%, rgba(37, 211, 102, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 15% 70%, rgba(59, 130, 246, 0.08) 0%, transparent 45%);
        }

        body::before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-size: 40px 40px;
            background-image: 
                linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
            z-index: 0;
            pointer-events: none;
        }

        .container {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 760px;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 1.25rem;
            padding: 2.5rem 2rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            text-align: center;
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
            border-color: var(--card-hover-border);
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px var(--primary-glow);
        }

        .logo-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 68px;
            height: 68px;
            border-radius: 1.2rem;
            background: linear-gradient(135deg, rgba(37, 211, 102, 0.2), rgba(16, 185, 129, 0.15));
            border: 1px solid rgba(37, 211, 102, 0.3);
            box-shadow: 0 10px 25px -5px rgba(37, 211, 102, 0.35);
            margin-bottom: 1.25rem;
        }

        .logo-wrap svg {
            width: 36px;
            height: 36px;
            color: #25D366;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(37, 211, 102, 0.1);
            color: #4ade80;
            border: 1px solid rgba(37, 211, 102, 0.3);
            padding: 0.35rem 0.95rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 1.25rem;
            box-shadow: 0 0 15px -3px rgba(37, 211, 102, 0.3);
        }

        .pulse-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: #25D366;
            position: relative;
        }

        .pulse-dot::after {
            content: '';
            position: absolute;
            top: -3px;
            left: -3px;
            right: -3px;
            bottom: -3px;
            border-radius: 50%;
            border: 2px solid #25D366;
            animation: pulse 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.6); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
        }

        h1 {
            font-size: 2.25rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            background: linear-gradient(135deg, #ffffff 40%, #86efac 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.6rem;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 0.95rem;
            line-height: 1.6;
            max-width: 540px;
            margin: 0 auto 2rem;
        }

        .actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.85rem;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 1.4rem;
            border-radius: 0.75rem;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid transparent;
        }

        .btn-primary {
            background: linear-gradient(135deg, #16a34a, #15803d);
            color: #ffffff;
            box-shadow: 0 4px 14px 0 rgba(22, 163, 74, 0.4);
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            box-shadow: 0 6px 20px 0 rgba(34, 197, 94, 0.5);
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: #e2e8f0;
            border-color: rgba(255, 255, 255, 0.1);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: #ffffff;
            transform: translateY(-1px);
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.75rem;
            margin-top: 1.25rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .metric-item {
            background: rgba(255, 255, 255, 0.025);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 0.75rem;
            padding: 0.75rem;
            text-align: left;
        }

        .metric-label {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.25rem;
        }

        .metric-value {
            font-size: 0.85rem;
            font-weight: 600;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .console-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 1.25rem;
            overflow: hidden;
            box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        }

        .console-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 1.25rem;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .window-dots {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .console-title {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .secret-input-bar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            background: rgba(0, 0, 0, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.8rem;
        }

        .secret-input-bar label {
            color: var(--text-dim);
            font-weight: 600;
            font-size: 0.75rem;
            white-space: nowrap;
        }

        .secret-input-bar input {
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.4rem;
            padding: 0.35rem 0.65rem;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            outline: none;
        }

        .secret-input-bar input:focus {
            border-color: rgba(37, 211, 102, 0.5);
        }

        .endpoint-list {
            padding: 1rem 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }

        .endpoint-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 0.6rem;
            padding: 0.6rem 0.85rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            transition: all 0.15s ease;
        }

        .endpoint-row:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .endpoint-meta {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .method {
            font-weight: 700;
            font-size: 0.7rem;
            padding: 0.15rem 0.4rem;
            border-radius: 0.3rem;
            letter-spacing: 0.03em;
        }

        .method-get {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .method-post {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.25);
        }

        .path {
            color: #e2e8f0;
        }

        .row-buttons {
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .action-icon-btn {
            background: transparent;
            border: none;
            color: var(--text-dim);
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            border-radius: 0.35rem;
            font-size: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.3rem;
            transition: all 0.15s;
        }

        .action-icon-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
        }

        .test-btn {
            color: #34d399;
        }
        .test-btn:hover {
            background: rgba(16, 185, 129, 0.15);
            color: #4ade80;
        }

        .response-drawer {
            display: none;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            background: #080c14;
            padding: 1.25rem;
        }

        .response-drawer.active {
            display: block;
        }

        .response-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.6rem;
            font-size: 0.75rem;
        }

        .status-pill {
            font-weight: 700;
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 9999px;
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
        }

        pre {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #94a3b8;
            line-height: 1.6;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
            background: rgba(0, 0, 0, 0.3);
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(255, 255, 255, 0.04);
        }

        footer {
            margin-top: 1rem;
            text-align: center;
            font-size: 0.75rem;
            color: var(--text-dim);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .toast {
            position: fixed;
            bottom: 2rem;
            background: rgba(15, 23, 42, 0.95);
            color: #4ade80;
            border: 1px solid rgba(74, 222, 128, 0.3);
            padding: 0.6rem 1.2rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.25s ease;
            pointer-events: none;
            z-index: 100;
        }

        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        @media (max-width: 640px) {
            h1 { font-size: 1.75rem; }
            .card { padding: 2rem 1.25rem; }
            .grid { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Main Hero Card -->
        <div class="card">
            <!-- Brand Icon -->
            <div class="logo-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
            </div>

            <!-- Status Badge -->
            <div>
                <div class="badge" id="systemBadge">
                    <span class="pulse-dot"></span>
                    <span id="badgeText">GATEWAY OPERATIONAL</span>
                </div>
            </div>

            <h1>WACRM Baileys API</h1>
            <p class="subtitle">High-Performance WhatsApp Multi-Device Gateway microservice for WACRM</p>

            <div class="actions">
                <button class="btn btn-primary" id="healthBtn" onclick="testEndpoint('/health', 'GET')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <span>Check API Health</span>
                </button>
                <button class="btn btn-secondary" onclick="testEndpoint('/session/status', 'GET')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Session Status</span>
                </button>
            </div>

            <!-- Architecture Grid -->
            <div class="grid">
                <div class="metric-item">
                    <div class="metric-label">Engine</div>
                    <div class="metric-value">Baileys v6</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Protocol</div>
                    <div class="metric-value">Multi-Device (MD)</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Runtime</div>
                    <div class="metric-value">Node.js Express</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Security</div>
                    <div class="metric-value">Secret / Bearer</div>
                </div>
            </div>
        </div>

        <!-- Endpoints & Terminal Card -->
        <div class="console-card">
            <div class="console-header">
                <div class="window-dots">
                    <span class="dot dot-red"></span>
                    <span class="dot dot-yellow"></span>
                    <span class="dot dot-green"></span>
                </div>
                <span class="console-title">baileys-gateway // rest-endpoints</span>
                <div style="width: 40px;"></div>
            </div>

            <div class="secret-input-bar">
                <label for="gatewaySecret">Gateway Secret:</label>
                <input type="password" id="gatewaySecret" placeholder="Enter BAILEYS_GATEWAY_SECRET (if enabled)" />
            </div>

            <div class="endpoint-list">
                <!-- /health -->
                <div class="endpoint-row">
                    <div class="endpoint-meta">
                        <span class="method method-get">GET</span>
                        <span class="path">/health</span>
                    </div>
                    <div class="row-buttons">
                        <button class="action-icon-btn test-btn" onclick="testEndpoint('/health', 'GET')">Test</button>
                        <button class="action-icon-btn" onclick="copyText('/health')">Copy</button>
                    </div>
                </div>

                <!-- /session/status -->
                <div class="endpoint-row">
                    <div class="endpoint-meta">
                        <span class="method method-get">GET</span>
                        <span class="path">/session/status</span>
                    </div>
                    <div class="row-buttons">
                        <button class="action-icon-btn test-btn" onclick="testEndpoint('/session/status', 'GET')">Test</button>
                        <button class="action-icon-btn" onclick="copyText('/session/status')">Copy</button>
                    </div>
                </div>

                <!-- /session/qr -->
                <div class="endpoint-row">
                    <div class="endpoint-meta">
                        <span class="method method-get">GET</span>
                        <span class="path">/session/qr</span>
                    </div>
                    <div class="row-buttons">
                        <button class="action-icon-btn test-btn" onclick="testEndpoint('/session/qr', 'GET')">Test</button>
                        <button class="action-icon-btn" onclick="copyText('/session/qr')">Copy</button>
                    </div>
                </div>

                <!-- /session/pairing-code -->
                <div class="endpoint-row">
                    <div class="endpoint-meta">
                        <span class="method method-post">POST</span>
                        <span class="path">/session/pairing-code</span>
                    </div>
                    <div class="row-buttons">
                        <button class="action-icon-btn" onclick="copyText('/session/pairing-code')">Copy</button>
                    </div>
                </div>

                <!-- /messages/send -->
                <div class="endpoint-row">
                    <div class="endpoint-meta">
                        <span class="method method-post">POST</span>
                        <span class="path">/messages/send</span>
                    </div>
                    <div class="row-buttons">
                        <button class="action-icon-btn" onclick="copyText('/messages/send')">Copy</button>
                    </div>
                </div>

                <!-- /session/restart -->
                <div class="endpoint-row">
                    <div class="endpoint-meta">
                        <span class="method method-post">POST</span>
                        <span class="path">/session/restart</span>
                    </div>
                    <div class="row-buttons">
                        <button class="action-icon-btn test-btn" onclick="testEndpoint('/session/restart', 'POST')">Test</button>
                        <button class="action-icon-btn" onclick="copyText('/session/restart')">Copy</button>
                    </div>
                </div>
            </div>

            <!-- Live Response Drawer -->
            <div class="response-drawer" id="responseDrawer">
                <div class="response-bar">
                    <span style="color: #64748b; font-family: 'JetBrains Mono', monospace;" id="pingTime">Latency: -- ms</span>
                    <span class="status-pill" id="statusCode">200 OK</span>
                </div>
                <pre id="jsonOutput">{"status": "ready"}</pre>
            </div>
        </div>

        <!-- Footer -->
        <footer>
            <span>&copy; 2026 WACRM</span>
            <span>&bull;</span>
            <span>WhatsApp Baileys Gateway</span>
        </footer>
    </div>

    <!-- Toast Notification -->
    <div class="toast" id="toast">Copied to clipboard!</div>

    <script>
        async function testEndpoint(endpoint, method) {
            const drawer = document.getElementById('responseDrawer');
            const jsonOutput = document.getElementById('jsonOutput');
            const pingTime = document.getElementById('pingTime');
            const statusCode = document.getElementById('statusCode');
            const secret = document.getElementById('gatewaySecret').value;

            drawer.classList.add('active');
            jsonOutput.textContent = 'Requesting ' + endpoint + '...';
            pingTime.textContent = 'Testing...';

            const headers = {};
            if (secret) {
                headers['x-baileys-secret'] = secret;
            }

            const startTime = performance.now();
            try {
                const res = await fetch(endpoint, {
                    method: method,
                    headers: headers
                });
                const latency = Math.round(performance.now() - startTime);
                const data = await res.json().catch(() => ({ status: res.statusText }));

                pingTime.textContent = 'Latency: ' + latency + 'ms';
                statusCode.textContent = res.status + ' ' + (res.statusText || '');
                statusCode.style.background = res.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                statusCode.style.color = res.ok ? '#34d399' : '#f87171';
                jsonOutput.textContent = JSON.stringify(data, null, 2);

                if (endpoint === '/health' && data.status === 'ok') {
                    document.getElementById('badgeText').textContent = 'GATEWAY OPERATIONAL (' + latency + 'ms)';
                }
            } catch (err) {
                pingTime.textContent = 'Error';
                statusCode.textContent = 'FAILED';
                statusCode.style.background = 'rgba(239, 68, 68, 0.15)';
                statusCode.style.color = '#f87171';
                jsonOutput.textContent = JSON.stringify({
                    error: 'Unable to reach ' + endpoint,
                    message: err.message || String(err)
                }, null, 2);
            }
        }

        function copyText(text) {
            const fullUrl = window.location.origin + text;
            navigator.clipboard.writeText(fullUrl).then(() => {
                showToast('Copied: ' + fullUrl);
            }).catch(() => {
                showToast('Copied: ' + text);
            });
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2500);
        }
    </script>
</body>
</html>`;
}
