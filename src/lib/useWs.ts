import { useEffect, useRef } from 'react';
import { auth } from './api';

let socket: WebSocket | null = null;
const listeners = new Set<(msg: any) => void>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 250;

function connect() {
  const token = auth.getToken();
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  let url: string;
  if (apiBase) {
    // Production: build a wss:// URL from the configured API base.
    const wsBase = apiBase.replace(/^http/, 'ws');
    url = `${wsBase}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  } else {
    // Dev / same-origin: use the page's host (Vite proxies /ws to the backend).
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    url = `${proto}//${window.location.host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }
  socket = new WebSocket(url);
  socket.addEventListener('open', () => { backoff = 250; });
  socket.addEventListener('close', () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 4000);
  });
  socket.addEventListener('message', (e) => {
    try { const msg = JSON.parse(typeof e.data === 'string' ? e.data : ''); listeners.forEach(l => l(msg)); } catch {}
  });
}

export function ensureWs() {
  if (!socket) connect();
}

export function useWsEvent(handler: (msg: any) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    ensureWs();
    const fn = (m: any) => ref.current(m);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
}
