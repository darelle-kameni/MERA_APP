import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken, COOKIE_NAME, cookieOptions } from '../lib/jwt.js';
import { requireStaff, requirePatient } from '../middleware/auth.js';

const router = Router();

const generatePin = () =>
  String(Math.floor(1000 + Math.random() * 9000));

const publicPatient = (p) => ({
  id: p.id, card_id: p.card_id, full_name: p.full_name, age: p.age, sex: p.sex,
  village: p.village, phone: p.phone, health_center_id: p.health_center_id,
  is_pediatric: p.is_pediatric, last_login: p.last_login,
});

const registerSchema = z.object({
  full_name: z.string().optional().nullable(),
  age: z.number().int().min(0).max(120),
  sex: z.enum(['M', 'F']),
  card_id: z.string().min(1, 'card_id is required'),
  village: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  health_center_id: z.string().optional().nullable(),
});

const loginSchema = z.object({
  card_id: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/, 'pin must be 4 digits'),
});

const updateSchema = z.object({
  village: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

// Encadreur or admin: create a patient + auto-generate PIN. Returns plaintext PIN ONCE.
// Medecin is explicitly forbidden (per workflow: "Aucune capacité d'ajout").
router.post('/register', requireStaff, async (req, res, next) => {
  try {
    if (req.user.role === 'medecin') {
      return res.status(403).json({ error: 'medecin_cannot_register_patient' });
    }

    const data = registerSchema.parse(req.body);

    // Check card_id uniqueness
    const existing = await prisma.patient.findUnique({ where: { card_id: data.card_id } });
    if (existing) return res.status(409).json({ error: 'card_id_taken', message: 'Cet ID de carte est déjà utilisé' });

    const pin = generatePin();
    const pin_hash = await bcrypt.hash(pin, 10);

    // Encadreur: guardian forced to self. Admin: accepts explicit guardian_id (optional).
    let guardian_id = null;
    if (req.user.role === 'encadreur') {
      guardian_id = req.user.id;
    } else if (req.user.role === 'admin' && req.body.guardian_id) {
      const g = await prisma.user.findUnique({ where: { id: req.body.guardian_id } });
      if (!g || g.role !== 'encadreur') {
        return res.status(400).json({ error: 'invalid_guardian' });
      }
      guardian_id = g.id;
    }

    const { card_id, health_center_id, ...rest } = data;
    const patient = await prisma.patient.create({
      data: {
        ...rest,
        card_id,
        pin_hash,
        guardian_id,
        is_pediatric: data.age < 15,
        health_center_id: health_center_id || null,
      },
    });

    // Per workflow doc: notify admins of every child created.
    const admins = await prisma.user.findMany({
      where: { role: 'admin', status: 'active' },
      select: { id: true },
    });
    if (admins.length > 0) {
      const creatorLabel = req.user.full_name || req.user.email || req.user.id_card;
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          recipient_id: a.id,
          kind: 'child_created',
          title: 'Nouvel enfant enregistré',
          body: `${data.full_name || 'Patient anonyme'} (${data.age} ans) inscrit par ${creatorLabel}`,
          link: '/patients',
          payload: JSON.stringify({ patient_id: patient.id, guardian_id }),
        })),
      });
    }

    res.status(201).json({ patient: publicPatient(patient), credentials: { card_id, pin } });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

// Staff-only: set or regenerate PIN.
router.post('/regenerate-pin/:id', requireStaff, async (req, res, next) => {
  try {
    let pin = req.body?.pin?.trim();
    if (pin) {
      if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'pin_must_be_4_digits' });
    } else {
      pin = generatePin();
    }
    const pin_hash = await bcrypt.hash(pin, 10);
    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: { pin_hash },
    });
    res.json({ patient: publicPatient(patient), credentials: { card_id: patient.card_id, pin } });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

// Public: patient login with QR + PIN.
router.post('/login', async (req, res, next) => {
  try {
    const { card_id, pin } = loginSchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { card_id } });
    if (!patient || !patient.pin_hash) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(pin, patient.pin_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    await prisma.patient.update({ where: { id: patient.id }, data: { last_login: new Date() } });

    const token = signToken({ patientId: patient.id, kind: 'patient' });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ patient: publicPatient(patient), token });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

// Patient: read self.
router.get('/me', requirePatient, (req, res) => {
  res.json(req.patient);
});

// Patient: update limited fields.
router.patch('/me', requirePatient, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const patient = await prisma.patient.update({
      where: { id: req.patient.id },
      data,
    });
    res.json(publicPatient(patient));
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

export default router;
