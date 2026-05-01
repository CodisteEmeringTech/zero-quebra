import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from './middleware/auth.js';

let wssRef: WebSocketServer | null = null;

export function setupWebSocket(wss: WebSocketServer) {
  wssRef = wss;
  wss.on('connection', (ws, req) => {
    // Token may be passed via ?token= query param
    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const u = verifyToken(token);
        (ws as WebSocket & { userId?: string; role?: string }).userId = u.id;
        (ws as WebSocket & { userId?: string; role?: string }).role = u.role;
      } catch { /* anonymous read-only */ }
    }
    ws.send(JSON.stringify({ type: 'CONNECTED' }));
  });
}

export function broadcast(msg: object) {
  if (!wssRef) return;
  const data = JSON.stringify(msg);
  for (const client of wssRef.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}
