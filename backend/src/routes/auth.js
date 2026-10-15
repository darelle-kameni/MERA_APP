import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken, COOKIE_NAME, cookieOptions } from '../lib/jwt.js';
import { requireStaff } from '../middleware/auth.js';
import {
  isLocked, lockResponse, recordFailure, recordSuccess, logFailedLogin, DUMMY_HASH,
} from '../lib/loginGuard.js';

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

    // Compte déjà verrouillé → on refuse sans même comparer le mot de passe.
    if (isLocked(user)) return res.status(429).json(lockResponse(user));

    // Comparaison en temps constant : même coût que le compte existe ou non.
    const ok = await bcrypt.compare(data.password, user?.password_hash || DUMMY_HASH);
    if (!user || !ok) {
      if (user) await recordFailure(prisma.user, user.id, user.failed_login_attempts);
      logFailedLogin(req, 'staff', id);
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'account_inactive',
        status: user.status,
        message: user.status === 'pending'
          ? 'Votre demande est en attente de validation par un administrateur'
          : 'Votre compte est suspendu',
      });
    }

    await recordSuccess(prisma.user, user.id);

    const token = signToken({ userId: user.id });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    // Le JWT n'est PAS renvoyé dans le corps : uniquement via cookie httpOnly.
    res.json({ user: publicUser(user) });
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
