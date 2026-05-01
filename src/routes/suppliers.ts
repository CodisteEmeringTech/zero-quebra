import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);

suppliersRouter.get('/', async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { skus: true } } },
    });
    res.json(suppliers);
  } catch (e) { next(e); }
});

const schema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

suppliersRouter.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const s = await prisma.supplier.create({ data });
    res.status(201).json(s);
  } catch (e) { next(e); }
});

suppliersRouter.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const s = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(s);
  } catch (e) { next(e); }
});

suppliersRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});
