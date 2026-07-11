import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireStaff } from '../middleware/auth.js';
import { parseListQuery } from '../utils/parseQuery.js';
import {
  buildScope, scopedWhere, canCreateInScope, canModifyExisting, isSharedEntity,
} from '../lib/scope.js';
import { notifyUrgentCase, notifyDiagnosisPublished } from '../lib/notifications.js';

// Map of Base44-style entity names → Prisma delegate keys.
const ENTITY_MAP = {
  Patient: 'patient',
  HealthCenter: 'healthCenter',
  MeraDevice: 'meraDevice',
  DiagnosticSession: 'diagnosticSession',
  VitalSigns: 'vitalSigns',
  EyePhoto: 'eyePhoto',
  ContagiousEyeResult: 'contagiousEyeResult',
  NonContagiousEyeResult: 'nonContagiousEyeResult',
  SystemicPrediction: 'systemicPrediction',
  TraditionalTreatment: 'traditionalTreatment',
  VocalExchange: 'vocalExchange',
  MedicalReview: 'medicalReview',
  Attendance: 'attendance',
};

const router = Router();
router.use(requireStaff);

const getDelegate = (entity) => {
  const key = ENTITY_MAP[entity];
  if (!key || !prisma[key]) {
    const err = new Error(`Unknown entity: ${entity}`);
    err.status = 404;
    throw err;
  }
  return prisma[key];
};

// LIST: GET /entities/:entity
router.get('/:entity', async (req, res, next) => {
  try {
    const delegate = getDelegate(req.params.entity);
    const opts = parseListQuery(req);
    const scope = await buildScope(req.user);
    const where = scopedWhere(req.params.entity, scope, opts.where);
    if (where === null) return res.json([]); // no access → empty list
    const items = await delegate.findMany({ ...opts, where });
    res.json(items);
  } catch (e) { next(e); }
});

// GET ONE: GET /entities/:entity/:id
router.get('/:entity/:id', async (req, res, next) => {
  try {
    const delegate = getDelegate(req.params.entity);
    const scope = await buildScope(req.user);
    const where = scopedWhere(req.params.entity, scope, { id: req.params.id });
    if (where === null) return res.status(404).json({ error: 'not_found' });
    const item = await delegate.findFirst({ where });
    if (!item) return res.status(404).json({ error: 'not_found' });
    res.json(item);
  } catch (e) { next(e); }
});

// CREATE: POST /entities/:entity
router.post('/:entity', async (req, res, next) => {
  try {
    const entity = req.params.entity;
    const delegate = getDelegate(entity);
    const data = { ...req.body };
    delete data.id; delete data.created_date; delete data.updated_date;

    const scope = await buildScope(req.user);

    // Shared reference entities: admin-write-only (and not via this generic route).
    if (isSharedEntity(entity) && !scope.unrestricted) {
      return res.status(403).json({ error: 'forbidden_shared_entity' });
    }
    if (!canCreateInScope(entity, data, scope)) {
      return res.status(403).json({ error: 'out_of_scope' });
    }

    // Stamp the creator automatically for sessions, reviews, and patient (encadreur).
    if (entity === 'DiagnosticSession' && !data.agent_id) data.agent_id = req.user.id;
    if (entity === 'MedicalReview' && !data.doctor_id && req.user.role === 'medecin') data.doctor_id = req.user.id;
    if (entity === 'Patient' && !data.guardian_id && ['encadreur', 'medecin'].includes(req.user.role)) {
      data.guardian_id = req.user.id;
    }

    const created = await delegate.create({ data });

    // Side effects: notifications (fire-and-forget; failures are logged but don't fail the request).
    if (entity === 'DiagnosticSession') {
      notifyUrgentCase(created.id).catch((err) => console.error('notifyUrgentCase failed', err));
    } else if (entity === 'MedicalReview') {
      notifyDiagnosisPublished(created.id).catch((err) => console.error('notifyDiagnosisPublished failed', err));
    }

    res.status(201).json(created);
  } catch (e) { next(e); }
});

// UPDATE: PATCH /entities/:entity/:id
router.patch('/:entity/:id', async (req, res, next) => {
  try {
    const entity = req.params.entity;
    const delegate = getDelegate(entity);
    const data = { ...req.body };
    delete data.id; delete data.created_date; delete data.updated_date;

    const scope = await buildScope(req.user);

    if (isSharedEntity(entity) && !scope.unrestricted) {
      return res.status(403).json({ error: 'forbidden_shared_entity' });
    }

    const existing = await delegate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'not_found' });
    if (!canModifyExisting(entity, existing, scope)) {
      return res.status(403).json({ error: 'out_of_scope' });
    }

    // Encadreur can't reassign a child to another guardian.
    if (entity === 'Patient' && scope.role === 'encadreur' && 'guardian_id' in data) {
      delete data.guardian_id;
    }

    const updated = await delegate.update({ where: { id: req.params.id }, data });

    // Same notification triggers when an existing entity transitions into a notifiable state.
    if (entity === 'DiagnosticSession' && 'urgency_level' in data) {
      notifyUrgentCase(updated.id).catch((err) => console.error('notifyUrgentCase failed', err));
    } else if (entity === 'MedicalReview' && 'status' in data) {
      notifyDiagnosisPublished(updated.id).catch((err) => console.error('notifyDiagnosisPublished failed', err));
    }

    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

// DELETE: DELETE /entities/:entity/:id — admin only, except encadreur can delete own patients.
router.delete('/:entity/:id', async (req, res, next) => {
  try {
    const entity = req.params.entity;
    const delegate = getDelegate(entity);

    if (entity === 'Patient' && req.user.role === 'encadreur') {
      const scope = await buildScope(req.user);
      if (!scope.patientIds.includes(req.params.id)) {
        return res.status(403).json({ error: 'out_of_scope' });
      }
      await delegate.delete({ where: { id: req.params.id } });
      return res.json({ ok: true });
    }

    if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin_only' });
    await delegate.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    next(e);
  }
});

export default router;
