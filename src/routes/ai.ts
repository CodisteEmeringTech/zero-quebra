import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { scannerState } from '../scanner.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

// "AI engine" status. The brief specifies a deterministic rule-based engine,
// not ML — so this is metadata about the running decision-engine process.
aiRouter.get('/status', (_req, res) => {
  res.json({
    engine: 'zero-quebra · decision engine',
    type: 'deterministic-rule-based',  // per brief: not ML
    variables: 6,                       // Scenario A core
    scanIntervalMs: scannerState.intervalMs,
    lastRunAt: scannerState.lastRunAt,
    lastRunMs: scannerState.lastRunMs,
    lastScanned: scannerState.lastScanned,
    lastRaised: scannerState.lastRaised,
    totalRuns: scannerState.totalRuns,
  });
});
