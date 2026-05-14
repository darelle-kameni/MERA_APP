import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken, COOKIE_NAME, cookieOptions } from '../lib/jwt.js';
import { requireStaff } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().email().optional(),  // legacy alias
  id_card: z.string().optional(),         // legacy alias
  password: z.string().min(1),
}).refine((d) => d.identifier || d.email || d.id_card, {
  message: 'identifier required',
  path: ['identifier'],
});

const publicUser = (u) => ({
  id: u.id, email: u.email, id_card: u.id_card,
  full_name: u.full_name, role: u.role, status: u.status,
  signature_url: u.signature_url, health_center_id: u.health_center_id,
});

// POST /auth/login — accepts identifier=email|id_card
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const id = (data.identifier || data.email || data.id_card || '').trim();

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: id }, { id_card: id.toUpperCase() }] },
    });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'account_inactive',
        status: user.status,
        message: user.status === 'pending'
          ? 'Votre demande est en attente de validation par un administrateur'
          : 'Votre compte est suspendu',
      });
    }

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signToken({ userId: user.id });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ user: publicUser(user), token });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireStaff, (req, res) => {
  res.json(req.user);
});

export default router;
