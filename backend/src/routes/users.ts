import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('ADMIN'));

usersRouter.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, storeId: true, createdAt: true, store: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (e) { next(e); }
});

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'COO', 'STORE_MANAGER', 'SUPERVISOR']),
  storeId: z.string().optional().nullable(),
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        storeId: data.storeId ?? null,
      },
      select: { id: true, email: true, name: true, role: true, storeId: true },
    });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

const updateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'COO', 'STORE_MANAGER', 'SUPERVISOR']).optional(),
  storeId: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
});

usersRouter.put('/:id', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.role !== undefined) update.role = data.role;
    if (data.storeId !== undefined) update.storeId = data.storeId;
    if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: update,
      select: { id: true, email: true, name: true, role: true, storeId: true },
    });
    res.json(user);
  } catch (e) { next(e); }
});

usersRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});
