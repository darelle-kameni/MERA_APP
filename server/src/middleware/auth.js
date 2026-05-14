import { verifyToken, COOKIE_NAME } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

const extractToken = (req) =>
  req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

const decode = (req) => {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
};

const loadStaff = async (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, id_card: true, full_name: true,
      role: true, status: true, signature_url: true, health_center_id: true,
    },
  });

const loadPatient = async (patientId) =>
  prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true, card_id: true, full_name: true, age: true, sex: true,
      village: true, phone: true, health_center_id: true, is_pediatric: true,
      last_login: true,
    },
  });

export const requireStaff = async (req, res, next) => {
  const decoded = decode(req);
  if (!decoded?.userId) return res.status(401).json({ error: 'unauthorized' });
  const user = await loadStaff(decoded.userId);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (user.status !== 'active') return res.status(403).json({ error: 'account_inactive', status: user.status });
  req.user = user;
  req.authKind = 'staff';
  next();
};

export const requirePatient = async (req, res, next) => {
  const decoded = decode(req);
  if (!decoded?.patientId || decoded.kind !== 'patient') return res.status(401).json({ error: 'unauthorized' });
  const patient = await loadPatient(decoded.patientId);
  if (!patient) return res.status(401).json({ error: 'unauthorized' });
  req.patient = patient;
  req.authKind = 'patient';
  next();
};

export const requireAnyAuth = async (req, res, next) => {
  const decoded = decode(req);
  if (!decoded) return res.status(401).json({ error: 'unauthorized' });
  if (decoded.userId) {
    const user = await loadStaff(decoded.userId);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (user.status !== 'active') return res.status(403).json({ error: 'account_inactive', status: user.status });
    req.user = user;
    req.authKind = 'staff';
    return next();
  }
  if (decoded.patientId && decoded.kind === 'patient') {
    const patient = await loadPatient(decoded.patientId);
    if (!patient) return res.status(401).json({ error: 'unauthorized' });
    req.patient = patient;
    req.authKind = 'patient';
    return next();
  }
  return res.status(401).json({ error: 'unauthorized' });
};

export const requireRole = (...roles) => (req, res, next) => {
  if (req.authKind !== 'staff' || !roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
};

// Backwards compat
export const requireAuth = requireStaff;
