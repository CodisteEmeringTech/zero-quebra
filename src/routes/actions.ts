import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const actionsRouter = Router();
actionsRouter.use(requireAuth);

actionsRouter.get('/', async (req, res, next) => {
  try {
    const me = req.user!;
    const where: { storeId?: string } = {};
    if ((me.role === 'STORE_MANAGER' || me.role === 'SUPERVISOR') && me.storeId) {
      where.storeId = me.storeId;
    } else if (req.query.storeId && typeof req.query.storeId === 'string') {
      where.storeId = req.query.storeId;
    }
    const logs = await prisma.actionLog.findMany({
      where,
      include: {
        confirmedBy: { select: { id: true, name: true, role: true } },
        store: true,
        alert: { include: { inventory: { include: { sku: true } } } },
      },
      orderBy: { confirmedAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (e) { next(e); }
});
