import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const skusRouter = Router();
skusRouter.use(requireAuth);

skusRouter.get('/', async (_req, res, next) => {
  try {
    const skus = await prisma.sku.findMany({
      orderBy: { productNamePt: 'asc' },
      include: { supplier: true },
    });
    res.json(skus);
  } catch (e) { next(e); }
});

const schema = z.object({
  skuCode: z.string().min(1),
  productNamePt: z.string().min(1),
  section: z.string().default('FLV'),
  baseCostBrl: z.number().nonnegative(),
  baseSaleBrl: z.number().positive(),
  marginFloorBrl: z.number().nonnegative(),
  supplierId: z.string().optional().nullable(),
});

skusRouter.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const sku = await prisma.sku.create({ data });
    res.status(201).json(sku);
  } catch (e) { next(e); }
});

skusRouter.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const sku = await prisma.sku.update({ where: { id: req.params.id }, data });
    res.json(sku);
  } catch (e) { next(e); }
});

skusRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.sku.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});
