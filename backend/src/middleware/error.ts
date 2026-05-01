import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: err.issues });
  }
  if (err && typeof err === 'object' && 'status' in err) {
    const e = err as { status: number; message?: string };
    return res.status(e.status).json({ error: e.message || 'Error' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
