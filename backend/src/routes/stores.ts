import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const storesRouter = Router();

storesRouter.use(requireAuth);

storesRouter.get('/', async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({ orderBy: { storeCode: 'asc' } });
    res.json(stores);
  } catch (e) { next(e); }
});

storesRouter.get('/:id', async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({ where: { id: req.params.id } });
    if (!store) return res.status(404).json({ error: 'Not found' });
    res.json(store);
  } catch (e) { next(e); }
});

const upsertSchema = z.object({
  storeCode: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  shrinkagePct30d: z.number().nonnegative().default(0),
  activeInDemo: z.boolean().default(false),
});

storesRouter.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = upsertSchema.parse(req.body);
    const store = await prisma.store.create({ data });
    res.status(201).json(store);
  } catch (e) { next(e); }
});

storesRouter.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = upsertSchema.partial().parse(req.body);
    const store = await prisma.store.update({ where: { id: req.params.id }, data });
    res.json(store);
  } catch (e) { next(e); }
});

storesRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.store.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});
