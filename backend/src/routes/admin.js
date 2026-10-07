import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireStaff, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIGNATURE_DIR = path.resolve(
  process.env.UPLOAD_DIR ? path.resolve(process.cwd(), process.env.UPLOAD_DIR) : path.resolve(__dirname, '../../uploads'),
  'signatures',
);
if (!fs.existsSync(SIGNATURE_DIR)) fs.mkdirSync(SIGNATURE_DIR, { recursive: true });

const signatureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SIGNATURE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});
const signatureUpload = multer({
  storage: signatureStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('signature_must_be_image'));
  },
});

const ID_CARD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomBlock = (n) => Array.from({ length: n }, () =>
  ID_CARD_ALPHABET[Math.floor(Math.random() * ID_CARD_ALPHABET.length)]).join('');

const generateIdCard = async (role) => {
  const prefix = role === 'admin' ? 'AD' : role === 'medecin' ? 'MD' : 'EN';
  for (let i = 0; i < 8; i++) {
    const candidate = `${prefix}-${randomBlock(4)}-${randomBlock(4)}`;
    const exists = await prisma.user.findUnique({ where: { id_card: candidate } });
    if (!exists) return candidate;
  }
  throw new Error('could not generate unique id_card');
};

const requestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['encadreur', 'medecin']),
  message: z.string().max(2000).optional().nullable(),
});

const publicRequest = (r) => ({
  id: r.id,
  email: r.email,
  full_name: r.full_name,
  role: r.role,
  status: r.status,
  message: r.message,
  signature_url: r.signature_url,
  rejection_reason: r.rejection_reason,
  approved_at: r.approved_at,
  created_date: r.created_date,
});

// ─── Public route: anyone can submit a registration request ─────
export const publicRequestRouter = Router();

publicRequestRouter.post('/request-registration', signatureUpload.single('signature'), async (req, res, next) => {
  try {
    const data = requestSchema.parse({
      email: req.body.email,
      password: req.body.password,
      full_name: req.body.full_name,
      role: req.body.role,
      message: req.body.message || null,
    });

    if (data.role === 'medecin' && !req.file) {
      return res.status(400).json({ error: 'signature_required', message: 'Une signature numérique est obligatoire pour le rôle médecin' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) return res.status(409).json({ error: 'email_taken' });

    const existingReq = await prisma.registrationRequest.findUnique({ where: { email: data.email } });
    if (existingReq && existingReq.status === 'pending') {
      return res.status(409).json({ error: 'request_pending', message: 'Une demande est déjà en attente pour cet email' });
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    const signature_url = req.file ? `/uploads/signatures/${req.file.filename}` : null;
    const persistedFields = {
      email: data.email,
      password_hash,
      full_name: data.full_name,
      role: data.role,
      message: data.message,
      signature_url,
      status: 'pending',
      rejection_reason: null,
    };

    const request = existingReq
      ? await prisma.registrationRequest.update({ where: { id: existingReq.id }, data: persistedFields })
      : await prisma.registrationRequest.create({ data: persistedFields });

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: 'admin', status: 'active' }, select: { id: true } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          recipient_id: a.id,
          kind: 'registration_pending',
          title: 'Nouvelle demande d\'inscription',
          body: `${data.full_name} (${data.role}) a soumis une demande`,
          link: '/admin/requests',
          payload: JSON.stringify({ request_id: request.id }),
        })),
      });
    }

    res.status(201).json({ ok: true, request: publicRequest(request) });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    if (e.message === 'signature_must_be_image') return res.status(400).json({ error: 'signature_must_be_image' });
    next(e);
  }
});

// ─── Admin-only routes ───────────────────────────────────────
const adminRouter = Router();
adminRouter.use(requireStaff, requireRole('admin'));

adminRouter.get('/registration-requests', async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const requests = await prisma.registrationRequest.findMany({
      where: status === 'all' ? {} : { status },
      orderBy: { created_date: 'desc' },
    });
    res.json(requests.map(publicRequest));
  } catch (e) { next(e); }
});

adminRouter.post('/registration-requests/:id/approve', async (req, res, next) => {
  try {
    const request = await prisma.registrationRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: 'not_found' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'already_processed', status: request.status });
    if (request.role === 'medecin' && !request.signature_url) {
      return res.status(400).json({ error: 'signature_required' });
    }

    let id_card = req.body?.id_card?.trim();
    if (id_card) {
      const existingCard = await prisma.user.findUnique({ where: { id_card } });
      if (existingCard) return res.status(409).json({ error: 'id_card_taken', message: 'Cet ID de carte est déjà utilisé' });
    } else {
      id_card = await generateIdCard(request.role);
    }

    const user = await prisma.user.create({
      data: {
        email: request.email,
        id_card,
        password_hash: request.password_hash,
        full_name: request.full_name,
        role: request.role,
        status: 'active',
        signature_url: request.signature_url,
      },
    });

    await prisma.registrationRequest.update({
      where: { id: request.id },
      data: { status: 'approved', user_id: user.id, approver_id: req.user.id, approved_at: new Date() },
    });

    res.json({ ok: true, user: { id: user.id, email: user.email, id_card, role: user.role } });
  } catch (e) { next(e); }
});

adminRouter.post('/registration-requests/:id/reject', async (req, res, next) => {
  try {
    const reason = (req.body.reason || '').toString().slice(0, 1000) || null;
    const request = await prisma.registrationRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: 'not_found' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'already_processed' });

    await prisma.registrationRequest.update({
      where: { id: request.id },
      data: { status: 'rejected', rejection_reason: reason, approver_id: req.user.id, approved_at: new Date() },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin: list/manage users
adminRouter.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { created_date: 'desc' }],
      select: {
        id: true, email: true, id_card: true, full_name: true,
        role: true, status: true, signature_url: true, created_date: true,
      },
    });
    res.json(users);
  } catch (e) { next(e); }
});

// Admin: create a user directly (bypasses the request flow). Returns ID Card + password once.
const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'encadreur', 'medecin']),
  id_card: z.string().optional(), // if absent, auto-generate
  password: z.string().min(6).optional(), // if absent, generate one
});

const generatePassword = () => {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
};

adminRouter.post('/users', async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'email_taken' });

    const password = data.password || generatePassword();
    const password_hash = await bcrypt.hash(password, 10);
    let id_card = data.id_card;
    if (!id_card) {
      id_card = await generateIdCard(data.role);
    } else {
      const existingCard = await prisma.user.findUnique({ where: { id_card } });
      if (existingCard) return res.status(409).json({ error: 'id_card_taken', message: 'Cet ID de carte est déjà utilisé' });
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        id_card,
        password_hash,
        full_name: data.full_name,
        role: data.role,
        status: 'active',
      },
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, id_card: user.id_card, full_name: user.full_name, role: user.role, status: user.status },
      credentials: { password, id_card },
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

// Admin: update user fields (full_name, role, status).
const updateUserSchema = z.object({
  full_name: z.string().min(1).optional(),
  role: z.enum(['admin', 'encadreur', 'medecin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  id_card: z.string().optional(),
});

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id && req.body.status === 'suspended') {
      return res.status(400).json({ error: 'cannot_suspend_self' });
    }
    if (req.params.id === req.user.id && req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({ error: 'cannot_demote_self' });
    }
    const data = updateUserSchema.parse(req.body);
    if (data.id_card) {
      const existingCard = await prisma.user.findFirst({
        where: { id_card: data.id_card, id: { not: req.params.id } },
      });
      if (existingCard) return res.status(409).json({ error: 'id_card_taken', message: 'Cet ID de carte est déjà utilisé' });
    }
    const updated = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ id: updated.id, email: updated.email, id_card: updated.id_card,
      full_name: updated.full_name, role: updated.role, status: updated.status });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

// Admin: reset password — returns the new plaintext password once.
adminRouter.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'not_found' });

    const password = (req.body.password || '').trim() || generatePassword();
    if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password_hash } });
    res.json({ password });
  } catch (e) { next(e); }
});

// Admin: regenerate ID Card.
adminRouter.post('/users/:id/regenerate-id-card', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'not_found' });
    const id_card = await generateIdCard(user.role);
    await prisma.user.update({ where: { id: user.id }, data: { id_card } });
    res.json({ id_card });
  } catch (e) { next(e); }
});

// Admin: delete user.
adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'cannot_delete_self' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

// Admin: create doctor↔encadreur assignment
adminRouter.post('/assignments', async (req, res, next) => {
  try {
    const { doctor_id, encadreur_id } = req.body || {};
    if (!doctor_id || !encadreur_id) return res.status(400).json({ error: 'validation' });
    const [doctor, encadreur] = await Promise.all([
      prisma.user.findUnique({ where: { id: doctor_id } }),
      prisma.user.findUnique({ where: { id: encadreur_id } }),
    ]);
    if (!doctor || doctor.role !== 'medecin') return res.status(400).json({ error: 'doctor_invalid' });
    if (!encadreur || encadreur.role !== 'encadreur') return res.status(400).json({ error: 'encadreur_invalid' });

    const assignment = await prisma.doctorAssignment.upsert({
      where: { doctor_id_encadreur_id: { doctor_id, encadreur_id } },
      update: {},
      create: { doctor_id, encadreur_id },
    });

    // Notify both parties
    await prisma.notification.createMany({
      data: [
        { recipient_id: doctor_id, kind: 'assignment_created',
          title: 'Nouvelle famille assignée', body: encadreur.full_name || encadreur.email },
        { recipient_id: encadreur_id, kind: 'assignment_created',
          title: 'Médecin assigné', body: doctor.full_name || doctor.email },
      ],
    });

    res.json({ ok: true, assignment });
  } catch (e) { next(e); }
});

adminRouter.get('/assignments', async (req, res, next) => {
  try {
    const items = await prisma.doctorAssignment.findMany({
      include: {
        doctor: { select: { id: true, email: true, full_name: true, id_card: true } },
        encadreur: { select: { id: true, email: true, full_name: true, id_card: true } },
      },
      orderBy: { created_date: 'desc' },
    });
    res.json(items);
  } catch (e) { next(e); }
});

adminRouter.delete('/assignments/:id', async (req, res, next) => {
  try {
    await prisma.doctorAssignment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

// ─── Admin: pharmacopée traditionnelle (contributions + modération) ─────
const EVIDENCE_LEVELS = ['OMS', 'clinique', 'traditionnel_avéré', 'traditionnel_rapporté'];
// À la création, le contributeur ne peut pas s'attribuer `OMS`/`clinique` :
// ces niveaux supposent une source vérifiée par un modérateur (via PATCH).
const CREATE_EVIDENCE_LEVELS = ['traditionnel_rapporté', 'traditionnel_avéré'];
const SEVERITIES = ['faible', 'modere', 'eleve', 'critique'];
const TREATMENT_STATUSES = ['pending', 'approved', 'rejected'];

// '' du formulaire → valeur absente (le champ est facultatif côté serveur)
const optStr = (min = 1) => z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().trim().min(min).nullable().optional(),
);
const optEnum = (values, def) => z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.enum(values).optional().default(def),
);
const optEnumNd = (values) => z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.enum(values).optional(),
);

// DQ-01 : pas d'entrée sans source + URL ; DQ-04 : pas d'entrée sans contre-indications.
const treatmentCreateSchema = z.object({
  disease: z.string().trim().min(2, 'Maladie obligatoire'),
  plant_name_fr: z.string().trim().min(2, 'Plante obligatoire'),
  plant_name_local: optStr(),
  synonyms_locaux: optStr(),
  part_used: optStr(),
  preparation: z.string().trim().min(5, 'Préparation obligatoire'),
  dosage_adult: optStr(),
  dosage_child: optStr(),
  precautions: optStr(),
  contre_indications: z.string().trim().min(5, 'Contre-indications obligatoires (DQ-01)'),
  max_severity: optEnum(SEVERITIES, 'modere'),
  evidence_level: optEnum(CREATE_EVIDENCE_LEVELS, 'traditionnel_rapporté'),
  source: z.string().trim().min(3, 'Référence bibliographique obligatoire (DQ-01)'),
  source_url: z.string().trim().url('URL invalide')
    .refine((v) => /^https?:\/\//i.test(v), 'URL http(s) attendue'),
  culture: optStr(),
  country: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase() || undefined : v),
    z.string().regex(/^[A-Z]{2}$/, 'Code pays ISO sur 2 lettres').nullable().optional(),
  ),
  contributed_by: optStr(),
  // `status` est volontairement absent : toute création part en `pending`.
});

const treatmentUpdateSchema = treatmentCreateSchema.partial().extend({
  status: z.enum(TREATMENT_STATUSES).optional(),
  // Pas de valeur par défaut en modification : ne jamais réécrire par défaut.
  max_severity: optEnumNd(SEVERITIES),
  // Un modérateur peut promouvoir le niveau d'évidence en cours de vie.
  evidence_level: z.enum(EVIDENCE_LEVELS).optional(),
});

const zodErrorMessage = (e) => e.errors
  .map((err) => `${err.path.join('.') || 'body'} : ${err.message}`)
  .join(' | ');


// GET /admin/pharmacopee?culture=&status=&q= — liste les traitements
adminRouter.get('/pharmacopee', async (req, res, next) => {
  try {
    const { culture, status, q } = req.query;
    const where = {};
    if (culture) where.culture = { contains: culture, mode: 'insensitive' };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { disease: { contains: q, mode: 'insensitive' } },
        { plant_name_fr: { contains: q, mode: 'insensitive' } },
        { culture: { contains: q, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.traditionalTreatment.findMany({
      where,
      orderBy: [{ status: 'asc' }, { created_date: 'desc' }],
      take: 500,
    });
    res.json(items);
  } catch (e) { next(e); }
});

// GET /admin/pharmacopee/cultures — liste distincte des cultures
adminRouter.get('/pharmacopee/cultures', async (req, res, next) => {
  try {
    const items = await prisma.traditionalTreatment.findMany({
      select: { culture: true },
      where: { culture: { not: null } },
      distinct: ['culture'],
      orderBy: { culture: 'asc' },
    });
    res.json(items.map((i) => i.culture));
  } catch (e) { next(e); }
});

// POST /admin/pharmacopee — ajouter un traitement (contribution).
// La contribution part toujours en `pending` : elle n'apparaît en vue clinique
// qu'après modération (DQ-05). `status` dans le body est ignoré.
adminRouter.post('/pharmacopee', async (req, res, next) => {
  try {
    const data = treatmentCreateSchema.parse(req.body);

    const duplicate = await prisma.traditionalTreatment.findFirst({
      where: { disease: data.disease, plant_name_fr: data.plant_name_fr },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({
        error: 'duplicate',
        message: 'Ce traitement (maladie + plante) existe déjà dans la pharmacopée.',
      });
    }

    const treatment = await prisma.traditionalTreatment.create({
      data: {
        disease: data.disease,
        plant_name_fr: data.plant_name_fr,
        plant_name_local: data.plant_name_local || null,
        synonyms_locaux: data.synonyms_locaux || null,
        part_used: data.part_used || null,
        preparation: data.preparation,
        dosage_adult: data.dosage_adult || null,
        dosage_child: data.dosage_child || null,
        precautions: data.precautions || null,
        contre_indications: data.contre_indications,
        max_severity: data.max_severity || 'modere',
        evidence_level: data.evidence_level || 'traditionnel_rapporté',
        source: data.source,
        source_url: data.source_url,
        culture: data.culture || null,
        country: data.country || null,
        contributed_by: data.contributed_by || req.user.full_name || req.user.email || null,
        status: 'pending',
      },
    });
    res.status(201).json(treatment);
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'validation', message: zodErrorMessage(e), details: e.errors });
    }
    next(e);
  }
});

// PATCH /admin/pharmacopee/:id — modifier ou modérer un traitement.
// Passer à `approved` exige une source + URL exploitables (DQ-01).
adminRouter.patch('/pharmacopee/:id', async (req, res, next) => {
  try {
    const data = treatmentUpdateSchema.parse(req.body);

    if (data.status === 'approved') {
      const existing = await prisma.traditionalTreatment.findUnique({
        where: { id: req.params.id },
        select: { source: true, source_url: true },
      });
      if (!existing) return res.status(404).json({ error: 'not_found' });
      const source = data.source ?? existing.source;
      const sourceUrl = data.source_url ?? existing.source_url;
      if (!source || !sourceUrl) {
        return res.status(400).json({
          error: 'source_required',
          message: 'Approbation refusée : une référence bibliographique et une URL de source sont obligatoires (DQ-01).',
        });
      }
    }

    const treatment = await prisma.traditionalTreatment.update({
      where: { id: req.params.id },
      data,
    });
    res.json(treatment);
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'validation', message: zodErrorMessage(e), details: e.errors });
    }
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

// DELETE /admin/pharmacopee/:id — supprimer un traitement
adminRouter.delete('/pharmacopee/:id', async (req, res, next) => {
  try {
    await prisma.traditionalTreatment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

export default adminRouter;
