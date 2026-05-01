import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { evaluate, type Scenario, type Weather } from '../engine.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

inventoryRouter.get('/', async (req, res, next) => {
  try {
    const where: { storeId?: string } = {};
    const me = req.user!;
    if (me.role === 'STORE_MANAGER' && me.storeId) where.storeId = me.storeId;
    else if (req.query.storeId && typeof req.query.storeId === 'string') where.storeId = req.query.storeId;

    const items = await prisma.inventory.findMany({
      where,
      include: { sku: true, store: true },
      orderBy: [{ urgencyTier: 'desc' }, { hoursToExpiry: 'asc' }],
    });
    res.json(items);
  } catch (e) { next(e); }
});

inventoryRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: { sku: true, store: true, alerts: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) { next(e); }
});

// AI engine reasoning for an inventory item — used by the variable-analysis drawer
// (the brief's Step 2 "multi-variable analysis" moment).
inventoryRouter.get('/:id/recommendation', async (req, res, next) => {
  try {
    const scenario = (req.query.scenario as Scenario | undefined) ?? 'B';
    const weather  = (req.query.weather  as Weather | undefined)  ?? 'normal';
    const item = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: { sku: true, store: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    const start = Date.now();
    const rec = evaluate(item, scenario, weather);
    const ms = Date.now() - start;
    res.json({ recommendation: rec, processingMs: ms, scenario, weather });
  } catch (e) { next(e); }
});

const upsertSchema = z.object({
  skuId: z.string().min(1),
  storeId: z.string().min(1),
  shelf: z.string().min(1),
  unitsInStock: z.number().int().nonnegative(),
  hoursToExpiry: z.number().int().nonnegative(),
  unitsSoldToday: z.number().int().nonnegative().default(0),
  velocityPerHour: z.number().nonnegative().default(0),
  dayOfWeekIndex: z.number().positive().default(1),
  weatherSensitivity: z.number().min(0).max(1).default(0),
  isHeadline: z.boolean().default(false),
});

inventoryRouter.post('/', requireRole('ADMIN', 'STORE_MANAGER'), async (req, res, next) => {
  try {
    const data = upsertSchema.parse(req.body);
    if (req.user!.role === 'STORE_MANAGER' && req.user!.storeId !== data.storeId) {
      return res.status(403).json({ error: 'Cannot create inventory for another store' });
    }
    const item = await prisma.inventory.create({ data });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

const updateSchema = upsertSchema.partial();

inventoryRouter.put('/:id', requireRole('ADMIN', 'STORE_MANAGER'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.inventory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user!.role === 'STORE_MANAGER' && req.user!.storeId !== existing.storeId) {
      return res.status(403).json({ error: 'Cannot edit inventory from another store' });
    }
    const item = await prisma.inventory.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (e) { next(e); }
});

inventoryRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.inventory.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

const restockSchema = z.object({ unitsAdded: z.number().int().positive(), hoursToExpiry: z.number().int().positive() });
inventoryRouter.post('/:id/restock', requireRole('ADMIN', 'STORE_MANAGER'), async (req, res, next) => {
  try {
    const { unitsAdded, hoursToExpiry } = restockSchema.parse(req.body);
    const existing = await prisma.inventory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user!.role === 'STORE_MANAGER' && req.user!.storeId !== existing.storeId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const item = await prisma.inventory.update({
      where: { id: req.params.id },
      data: { unitsInStock: existing.unitsInStock + unitsAdded, hoursToExpiry },
    });
    res.json(item);
  } catch (e) { next(e); }
});
