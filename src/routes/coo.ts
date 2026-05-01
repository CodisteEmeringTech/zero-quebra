import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const cooRouter = Router();
cooRouter.use(requireAuth);

cooRouter.get('/dashboard', requireRole('COO', 'ADMIN'), async (_req, res, next) => {
  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const weekStart  = new Date(); weekStart.setUTCDate(weekStart.getUTCDate() - 7);

    const [
      coo30d, learning, stores,
      todayActions, weekActions,
      liveSavingsAgg, liveMarginAgg,
    ] = await Promise.all([
      prisma.cooDailyMetric.findMany({
        where: { storeId: null, date: { gte: since } },
        orderBy: { date: 'asc' },
      }),
      prisma.learningWeek.findMany({ orderBy: { week: 'asc' } }),
      prisma.store.findMany({ orderBy: { storeCode: 'asc' } }),
      prisma.actionLog.count({ where: { confirmedAt: { gte: todayStart } } }),
      prisma.actionLog.count({ where: { confirmedAt: { gte: weekStart } } }),
      prisma.actionLog.aggregate({
        _sum: { estSavingsBrl: true },
        where: { confirmedAt: { gte: weekStart } },
      }),
      prisma.actionLog.aggregate({
        _sum: { estMarginProtBrl: true },
        where: { confirmedAt: { gte: weekStart } },
      }),
    ]);

    const today = coo30d[coo30d.length - 1];
    const baselineAvg =
      coo30d.reduce((acc, d) => acc + d.shrinkagePct, 0) / Math.max(1, coo30d.length);
    const seedSavingsThisWeek = coo30d.slice(-7).reduce((acc, d) => acc + d.savingsBrl, 0);
    const liveSavingsThisWeek = liveSavingsAgg._sum.estSavingsBrl ?? 0;
    const liveMarginThisWeek  = liveMarginAgg._sum.estMarginProtBrl ?? 0;
    const savingsThisWeek = seedSavingsThisWeek + liveSavingsThisWeek;

    res.json({
      today,
      preAiBaselinePct: 6.03,   // brief: pre-AI baseline shrinkage rate
      baselineAvg,              // rolling 30-day average across the post-AI window
      savingsThisWeek,
      seedSavingsThisWeek,
      liveSavingsThisWeek,
      liveMarginThisWeek,
      todayActions,
      weekActions,
      coo30d,
      learning,
      stores,
    });
  } catch (e) { next(e); }
});
