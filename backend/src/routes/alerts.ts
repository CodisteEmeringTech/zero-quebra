import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../ws.js';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get('/', async (req, res, next) => {
  try {
    const me = req.user!;
    const status = (req.query.status as string | undefined) ?? undefined;
    const where: { status?: 'PENDING' | 'CONFIRMED' | 'DISMISSED'; inventory?: { storeId: string } } = {};
    if (status === 'PENDING' || status === 'CONFIRMED' || status === 'DISMISSED') where.status = status;
    if ((me.role === 'STORE_MANAGER' || me.role === 'SUPERVISOR') && me.storeId) {
      where.inventory = { storeId: me.storeId };
    }
    const alerts = await prisma.alert.findMany({
      where,
      include: { inventory: { include: { sku: true, store: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(alerts);
  } catch (e) { next(e); }
});

const confirmSchema = z.object({ outcome: z.string().optional() });

alertsRouter.post('/:id/confirm', requireRole('SUPERVISOR', 'STORE_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { outcome } = confirmSchema.parse(req.body);
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: { inventory: true },
    });
    if (!alert) return res.status(404).json({ error: 'Not found' });
    if (alert.status !== 'PENDING') return res.status(409).json({ error: 'Alerta já resolvido' });
    if (req.user!.role === 'STORE_MANAGER' && req.user!.storeId !== alert.inventory.storeId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.alert.update({
        where: { id: alert.id },
        data: { status: 'CONFIRMED', resolvedAt: new Date() },
      });
      const log = await tx.actionLog.create({
        data: {
          alertId: alert.id,
          storeId: alert.inventory.storeId,
          recommendation: alert.recommendation,
          discountPct: alert.discountPct,
          unitsAtRisk: alert.unitsAtRisk,
          estSavingsBrl: alert.estSavingsBrl,
          estMarginProtBrl: alert.estMarginProtBrl,
          confirmedById: req.user!.id,
          outcome,
        },
        include: { store: true, confirmedBy: true, alert: { include: { inventory: { include: { sku: true } } } } },
      });
      return { updated, log };
    });

    broadcast({ type: 'ACTION_CONFIRMED', alertId: alert.id, log: result.log });
    res.json(result);
  } catch (e) { next(e); }
});

alertsRouter.post('/:id/dismiss', requireRole('SUPERVISOR', 'STORE_MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: { inventory: true },
    });
    if (!alert) return res.status(404).json({ error: 'Not found' });
    if (req.user!.role === 'STORE_MANAGER' && req.user!.storeId !== alert.inventory.storeId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'DISMISSED', resolvedAt: new Date() },
    });
    broadcast({ type: 'ALERT_DISMISSED', alertId: alert.id });
    res.json(updated);
  } catch (e) { next(e); }
});
