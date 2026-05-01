// Guided demo orchestration: scripted live changes to inventory that drive
// the engine + scanner naturally. Lets the presenter narrate while the
// system reacts to real DB state, not button-controlled UI flips.
import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { runScannerOnce } from '../scanner.js';
import { broadcast } from '../ws.js';

export const demoRouter = Router();
demoRouter.use(requireAuth, requireRole('ADMIN'));

demoRouter.post('/trigger-headline', async (_req, res, next) => {
  try {
    const headline = await prisma.inventory.findFirst({
      where: { isHeadline: true },
      include: { sku: true, store: true },
    });
    if (!headline) return res.status(404).json({ error: 'No headline inventory configured' });

    // Brief: detection state is "40 units in stock, 18h to expiry, 22 sold so far,
    // 18 at risk."  Engine (scenario B) projection is
    //   remaining = stock - velocity * dayOfWeekIndex * hours
    // For Morango · Loja 7 we seed dayOfWeekIndex = 0.87 (the brief's Tuesday example).
    // Solve for the raw velocity that lands exactly on 18 at-risk units:
    //   18 = 40 - v * 0.87 * 18   →   v = 22 / (0.87 * 18) ≈ 1.40
    await prisma.inventory.update({
      where: { id: headline.id },
      data: {
        unitsInStock: 40,
        hoursToExpiry: 18,
        unitsSoldToday: 22,
        velocityPerHour: 1.40,
      },
    });
    const result = await runScannerOnce();
    broadcast({ type: 'DEMO_TRIGGERED', sku: headline.sku.productNamePt, store: headline.store.storeCode });
    res.json({ ok: true, scanned: result.scanned, alertsRaised: result.raised });
  } catch (e) { next(e); }
});

demoRouter.post('/reset', async (_req, res, next) => {
  try {
    await prisma.alert.deleteMany({ where: { status: 'PENDING' } });
    const headline = await prisma.inventory.findFirst({ where: { isHeadline: true } });
    if (headline) {
      await prisma.inventory.update({
        where: { id: headline.id },
        data: {
          unitsInStock: 40,
          hoursToExpiry: 18,
          unitsSoldToday: 22,
          velocityPerHour: 1.1,
          urgencyTier: 'SAFE',
        },
      });
    }
    broadcast({ type: 'DEMO_RESET' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
