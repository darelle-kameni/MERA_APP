// Authentifie une requête venue d'un appareil MERA (ESP32) via Bearer token.
// Le token est `MeraDevice.api_token` — généré à la création de l'appareil et
// flashé dans le firmware ESP32 lors de la configuration.
import { prisma } from '../lib/prisma.js';

export const requireDevice = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'missing_token' });

  const device = await prisma.meraDevice.findUnique({
    where: { api_token: token },
    select: {
      id: true, serial_number: true, status: true,
      health_center_id: true, health_center_name: true,
    },
  });
  if (!device) return res.status(401).json({ error: 'invalid_token' });

  req.device = device;
  next();
};
