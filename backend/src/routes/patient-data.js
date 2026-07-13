import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requirePatient } from '../middleware/auth.js';

const router = Router();
router.use(requirePatient);

// Patient: list own diagnostic sessions with full nested data.
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.diagnosticSession.findMany({
      where: { patient_id: req.patient.id },
      orderBy: { created_date: 'desc' },
      include: {
        vital_signs: { orderBy: { timestamp: 'desc' } },
        eye_photos: { orderBy: { timestamp: 'desc' } },
        contagious_result: true,
        non_contagious_result: true,
        systemic_predictions: true,
        vocal_exchanges: { orderBy: { timestamp: 'asc' } },
        medical_reviews: { orderBy: { created_date: 'desc' } },
      },
    });
    res.json(sessions);
  } catch (e) { next(e); }
});

// Patient: one session detail.
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await prisma.diagnosticSession.findFirst({
      where: { id: req.params.id, patient_id: req.patient.id },
      include: {
        vital_signs: { orderBy: { timestamp: 'desc' } },
        eye_photos: { orderBy: { timestamp: 'desc' } },
        contagious_result: true,
        non_contagious_result: true,
        systemic_predictions: true,
        vocal_exchanges: { orderBy: { timestamp: 'asc' } },
        medical_reviews: { orderBy: { created_date: 'desc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'not_found' });
    res.json(session);
  } catch (e) { next(e); }
});

// Patient: list traditional treatments (read-only reference, useful for display).
router.get('/treatments', async (req, res, next) => {
  try {
    const treatments = await prisma.traditionalTreatment.findMany({
      orderBy: { disease: 'asc' },
    });
    res.json(treatments);
  } catch (e) { next(e); }
});

export default router;
