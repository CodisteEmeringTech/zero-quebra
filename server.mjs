// Minimal static-file server with SPA fallback.
// Reads PORT from process.env so it picks up Railway's injected port automatically.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = resolve('./dist');

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.mjs':   'application/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.ico':   'image/x-icon',
  '.webp':  'image/webp',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf',
  '.txt':   'text/plain; charset=utf-8',
  '.map':   'application/json; charset=utf-8',
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
};

const sendFile = async (res, filepath, status = 200) => {
  const data = await readFile(filepath);
  const type = MIME[extname(filepath).toLowerCase()] || 'application/octet-stream';
  // Long-cache immutable hashed assets (Vite emits to /assets/*.{js,css}); HTML stays no-cache.
  const cache = filepath.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  send(res, status, data, { 'Content-Type': type, 'Cache-Control': cache });
};

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Method not allowed');
    }
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url.includes('..')) return send(res, 400, 'Bad request');

    let filepath = join(ROOT, url);
    try {
      const s = await stat(filepath);
      if (s.isDirectory()) filepath = join(filepath, 'index.html');
    } catch {
      // Not found on disk — SPA fallback to index.html so client-side router takes over.
      filepath = join(ROOT, 'index.html');
    }

    await sendFile(res, filepath);
  } catch (err) {
    console.error('[server]', err);
    send(res, 500, 'Internal server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[zero-quebra-frontend] serving ${ROOT} on http://${HOST}:${PORT}`);
});
