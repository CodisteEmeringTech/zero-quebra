import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, 'Credenciais inválidas');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Credenciais inválidas');
    const payload = { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.storeId };
    const token = signToken(payload);
    res.json({ token, user: payload });
  } catch (e) { next(e); }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'COO', 'STORE_MANAGER', 'SUPERVISOR']).default('STORE_MANAGER'),
  storeId: z.string().optional(),
});

authRouter.post('/signup', async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new HttpError(409, 'Email já cadastrado');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        storeId: data.storeId ?? null,
      },
    });
    const payload = { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.storeId };
    res.status(201).json({ token: signToken(payload), user: payload });
  } catch (e) { next(e); }
});
