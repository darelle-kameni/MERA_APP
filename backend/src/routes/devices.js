// Routes admin pour la gestion des appareils ESP32 :
//   - POST /devices/:id/ping  : envoie une requête GET /health vers l'ESP32, met à jour le statut
//   - POST /devices/:id/regenerate-token : génère un nouveau api_token pour l'appareil
// La création/édition d'appareils reste via /entities/MeraDevice (admin only).
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireStaff, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireStaff);

const generateToken = () => {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';
  return 'dev_' + Array.from({ length: 32 }, () =>
    charset[Math.floor(Math.random() * charset.length)]).join('');
};

const fetchWithTimeout = async (url, ms = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  } finally {
    clearTimeout(timer);
  }
};

// POST /devices/:id/ping — pingue l'ESP32 et met à jour le statut
router.post('/:id/ping', async (req, res, next) => {
  try {
    const device = await prisma.meraDevice.findUnique({ where: { id: req.params.id } });
    if (!device) return res.status(404).json({ error: 'not_found' });

    if (!device.ip_address) {
      return res.status(400).json({ error: 'no_address', message: "Cet appareil n'a pas d'adresse IP configurée" });
    }

    const port = device.port || 80;
    const url = `http://${device.ip_address}:${port}/health`;

    let probe = null;
    let reachable = false;
    let errorMessage = null;
    try {
      probe = await fetchWithTimeout(url, 3000);
      reachable = probe.ok && probe.body && probe.body.ok !== false;
    } catch (err) {
      errorMessage = err.name === 'AbortError' ? 'timeout' : err.message || 'unreachable';
    }

    const update = { last_sync: new Date() };
    if (reachable) {
      update.status = 'en_ligne';
      if (probe.body) {
        if (typeof probe.body.battery_pct === 'number') update.battery_level = probe.body.battery_pct;
        if (typeof probe.body.firmware === 'string') update.firmware_version = probe.body.firmware;
      }
    } else {
      update.status = 'hors_ligne';
    }

    const updated = await prisma.meraDevice.update({
      where: { id: device.id },
      data: update,
    });

    res.json({
      reachable,
      url,
      health: reachable ? probe.body : null,
      error: errorMessage,
      device: {
        id: updated.id,
        status: updated.status,
        battery_level: updated.battery_level,
        firmware_version: updated.firmware_version,
        last_sync: updated.last_sync,
      },
    });
  } catch (e) { next(e); }
});

// POST /devices/:id/regenerate-token — admin only
router.post('/:id/regenerate-token', requireRole('admin'), async (req, res, next) => {
  try {
    let token, attempts = 0;
    while (attempts++ < 6) {
      token = generateToken();
      const conflict = await prisma.meraDevice.findUnique({ where: { api_token: token } });
      if (!conflict) break;
    }
    const updated = await prisma.meraDevice.update({
      where: { id: req.params.id },
      data: { api_token: token },
    });
    res.json({ api_token: updated.api_token });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

// GET /devices/:id/token — admin only, reveal the current token
router.get('/:id/token', requireRole('admin'), async (req, res, next) => {
  try {
    const d = await prisma.meraDevice.findUnique({
      where: { id: req.params.id },
      select: { id: true, serial_number: true, api_token: true },
    });
    if (!d) return res.status(404).json({ error: 'not_found' });
    res.json(d);
  } catch (e) { next(e); }
});

export default router;
