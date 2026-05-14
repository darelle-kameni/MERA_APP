import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireStaff } from '../middleware/auth.js';

const router = Router();
router.use(requireStaff);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const onlyUnread = req.query.unread === '1';
    const items = await prisma.notification.findMany({
      where: { recipient_id: req.user.id, ...(onlyUnread ? { read_at: null } : {}) },
      orderBy: { created_date: 'desc' },
      take: limit,
    });
    const unreadCount = await prisma.notification.count({
      where: { recipient_id: req.user.id, read_at: null },
    });
    res.json({ items, unread_count: unreadCount });
  } catch (e) { next(e); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, recipient_id: req.user.id },
    });
    if (!n) return res.status(404).json({ error: 'not_found' });
    if (!n.read_at) {
      await prisma.notification.update({ where: { id: n.id }, data: { read_at: new Date() } });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { recipient_id: req.user.id, read_at: null },
      data: { read_at: new Date() },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
