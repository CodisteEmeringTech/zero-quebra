import { prisma } from './prisma.js';
import { evaluate } from './engine.js';
import { broadcast } from './ws.js';

const INTERVAL = Number(process.env.SCANNER_INTERVAL_MS) || 15000;

export const scannerState = {
  intervalMs: INTERVAL,
  lastRunAt: null as string | null,
  lastRunMs: 0,
  lastScanned: 0,
  lastRaised: 0,
  totalRuns: 0,
};

export async function runScannerOnce(): Promise<{ scanned: number; raised: number }> {
  const start = Date.now();
  const inventories = await prisma.inventory.findMany({ include: { sku: true } });
  let raised = 0;

  for (const inv of inventories) {
    const rec = evaluate(inv);
    const prevTier = inv.urgencyTier;
    if (rec.urgency !== prevTier) {
      await prisma.inventory.update({
        where: { id: inv.id },
        data: { urgencyTier: rec.urgency },
      });
    }
    if (rec.urgency === 'AMBER' || rec.urgency === 'CRITICAL') {
      const existing = await prisma.alert.findFirst({
        where: { inventoryId: inv.id, status: 'PENDING' },
      });
      if (!existing) {
        const alert = await prisma.alert.create({
          data: {
            inventoryId: inv.id,
            urgency: rec.urgency,
            recommendation: rec.action === 'NONE' ? 'MARKDOWN' : rec.action,
            discountPct: rec.discountPct,
            reasonPt: rec.reasonPt,
            unitsAtRisk: rec.unitsAtRisk,
            hoursToExpiry: inv.hoursToExpiry,
            urgencyWindowHours: rec.urgencyWindowHours,
            estSavingsBrl: rec.estSavingsBrl,
            estMarginProtBrl: rec.estMarginProtBrl,
            confidencePct: rec.confidence,
          },
          include: { inventory: { include: { sku: true, store: true } } },
        });
        raised++;
        broadcast({ type: 'ALERT_RAISED', alert });
      }
    }
  }

  if (raised > 0) {
    console.log(`[scanner] scanned ${inventories.length}, raised ${raised} alerts`);
  }
  scannerState.lastRunAt   = new Date().toISOString();
  scannerState.lastRunMs   = Date.now() - start;
  scannerState.lastScanned = inventories.length;
  scannerState.lastRaised  = raised;
  scannerState.totalRuns  += 1;
  return { scanned: inventories.length, raised };
}

export function startScanner() {
  console.log(`[scanner] starting with interval ${INTERVAL}ms`);
  setTimeout(() => { runScannerOnce().catch(err => console.error('[scanner]', err)); }, 1500);
  setInterval(() => {
    runScannerOnce().catch(err => console.error('[scanner]', err));
  }, INTERVAL);
}
