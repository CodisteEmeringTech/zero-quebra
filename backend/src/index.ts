import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { prisma } from './prisma.js';
import { authRouter } from './routes/auth.js';
import { storesRouter } from './routes/stores.js';
import { suppliersRouter } from './routes/suppliers.js';
import { skusRouter } from './routes/skus.js';
import { inventoryRouter } from './routes/inventory.js';
import { alertsRouter } from './routes/alerts.js';
import { actionsRouter } from './routes/actions.js';
import { cooRouter } from './routes/coo.js';
import { usersRouter } from './routes/users.js';
import { demoRouter } from './routes/demo.js';
import { aiRouter } from './routes/ai.js';
import { errorHandler } from './middleware/error.js';
import { setupWebSocket } from './ws.js';
import { startScanner } from './scanner.js';

const PORT = Number(process.env.PORT) || 4321;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/stores', storesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/skus', skusRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/coo', cooRouter);
app.use('/api/users', usersRouter);
app.use('/api/demo', demoRouter);
app.use('/api/ai', aiRouter);

app.use(errorHandler);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

server.listen(PORT, () => {
  console.log(`[zero-quebra] api+ws on http://localhost:${PORT}`);
  startScanner();
});

process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0); });
