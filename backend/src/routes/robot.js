// Routes appelées par l'ESP32 (robot MERA) lui-même.
// Authentification : Authorization: Bearer <MeraDevice.api_token>
// Pattern inspiré de l'ancienne app robot-medical/backend/api_arduino.php :
//   - measurements : envoyer toutes les mesures d'une session en un seul POST
//   - heartbeat : signaler que l'ESP32 est actif
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireDevice } from '../middleware/device.js';
import { notifyUrgentCase } from '../lib/notifications.js';

const router = Router();
router.use(requireDevice);

// ─── POST /robot/measurements : envoie toutes les mesures d'une session ─
// Crée DiagnosticSession + VitalSigns + EyeResult (contagieux ou non) atomiquement.
const measurementsSchema = z.object({
  patient_id: z.string().optional(),
  card_id: z.string().optional(),
  // Vitales (toutes optionnelles, au moins une ou un eye result requis)
  temperature: z.number().optional().nullable(),
  spo2: z.number().optional().nullable(),
  heart_rate: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  bmi: z.number().optional().nullable(),
  // Oculaire — diagnostic textuel + probabilités
  eye_left: z.object({
    diagnosis: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
  }).optional(),
  eye_right: z.object({
    diagnosis: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
  }).optional(),
  // % spécifiques (optionnels) — l'IA peut renvoyer un breakdown détaillé
  contagious: z.object({
    conjunctivitis_bacterial: z.number().optional(),
    conjunctivitis_viral: z.number().optional(),
    trachoma: z.number().optional(),
    blepharitis_infectious: z.number().optional(),
    contagion_alert: z.boolean().optional(),
  }).optional(),
  non_contagious: z.object({
    cataract: z.number().optional(),
    pterygion: z.number().optional(),
    uveitis: z.number().optional(),
    jaundice: z.number().optional(),
    myopia: z.number().optional(),
    glaucoma: z.number().optional(),
    diabetic_retinopathy: z.number().optional(),
  }).optional(),
  // Métadonnées session
  urgency_level: z.enum(['CRITIQUE', 'ELEVE', 'MODERE', 'NORMAL']).optional(),
  recommendations: z.string().optional(),
  vocal_transcript: z.string().optional(),
  alerte: z.boolean().optional(),
});

const computeUrgency = ({ temperature, spo2, heart_rate, contagious, non_contagious, alerte }) => {
  if (temperature != null && temperature > 40) return 'CRITIQUE';
  if (spo2 != null && spo2 < 90) return 'CRITIQUE';
  if (heart_rate != null && heart_rate > 120) return 'CRITIQUE';
  if (alerte || contagious?.contagion_alert) return 'ELEVE';
  if (temperature != null && temperature >= 38) return 'ELEVE';
  if (spo2 != null && spo2 < 95) return 'ELEVE';
  if (contagious && Object.values(contagious).some((v) => typeof v === 'number' && v > 50)) return 'MODERE';
  if (non_contagious && Object.values(non_contagious).some((v) => typeof v === 'number' && v > 50)) return 'MODERE';
  return 'NORMAL';
};

router.post('/measurements', async (req, res, next) => {
  try {
    const data = measurementsSchema.parse(req.body);

    if (!data.patient_id && !data.card_id) {
      return res.status(400).json({ success: false, message: 'patient_id or card_id is required' });
    }

    let patient;
    if (data.patient_id) {
      patient = await prisma.patient.findUnique({
        where: { id: data.patient_id },
        select: { id: true, full_name: true, age: true, sex: true, guardian_id: true },
      });
    } else {
      patient = await prisma.patient.findUnique({
        where: { card_id: data.card_id },
        select: { id: true, full_name: true, age: true, sex: true, guardian_id: true },
      });
    }
    if (!patient) return res.status(404).json({ success: false, message: 'patient_not_found' });

    const urgency = data.urgency_level || computeUrgency(data);

    // Transaction : tout ou rien
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.diagnosticSession.create({
        data: {
          patient_id: patient.id,
          agent_id: patient.guardian_id || null,
          device_id: req.device.id,
          health_center_id: req.device.health_center_id,
          urgency_level: urgency,
          status: 'en_attente_revue',
          sync_status: 'synced',
          patient_name: patient.full_name,
          patient_age: patient.age,
          patient_sex: patient.sex,
          recommendations: data.recommendations || null,
          vocal_transcript: data.vocal_transcript || null,
          eye_left_diagnosis: data.eye_left?.diagnosis || null,
          eye_left_confidence: data.eye_left?.confidence ?? null,
          eye_right_diagnosis: data.eye_right?.diagnosis || null,
          eye_right_confidence: data.eye_right?.confidence ?? null,
          alerte: data.alerte ?? false,
        },
      });

      const hasVitals = ['temperature', 'spo2', 'heart_rate', 'weight', 'bmi']
        .some((k) => data[k] != null);
      if (hasVitals) {
        await tx.vitalSigns.create({
          data: {
            session_id: session.id,
            temperature: data.temperature ?? null,
            spo2: data.spo2 ?? null,
            heart_rate: data.heart_rate ?? null,
            weight: data.weight ?? null,
            bmi: data.bmi ?? null,
          },
        });
      }

      if (data.contagious) {
        await tx.contagiousEyeResult.create({
          data: {
            session_id: session.id,
            conjunctivitis_bacterial: data.contagious.conjunctivitis_bacterial ?? null,
            conjunctivitis_viral:     data.contagious.conjunctivitis_viral ?? null,
            trachoma:                 data.contagious.trachoma ?? null,
            blepharitis_infectious:   data.contagious.blepharitis_infectious ?? null,
            contagion_alert:          data.contagious.contagion_alert ?? false,
          },
        });
      }

      if (data.non_contagious) {
        await tx.nonContagiousEyeResult.create({
          data: {
            session_id: session.id,
            cataract:              data.non_contagious.cataract ?? null,
            pterygion:             data.non_contagious.pterygion ?? null,
            uveitis:               data.non_contagious.uveitis ?? null,
            jaundice:              data.non_contagious.jaundice ?? null,
            myopia:                data.non_contagious.myopia ?? null,
            glaucoma:              data.non_contagious.glaucoma ?? null,
            diabetic_retinopathy:  data.non_contagious.diabetic_retinopathy ?? null,
          },
        });
      }

      return session;
    });

    // Update device heartbeat
    await prisma.meraDevice.update({
      where: { id: req.device.id },
      data: { last_sync: new Date(), status: 'en_ligne' },
    });

    // Trigger notifications (urgent case → encadreur + médecins assignés)
    notifyUrgentCase(result.id).catch((err) => console.error('notifyUrgentCase failed', err));

    res.status(201).json({
      success: true,
      session_id: result.id,
      urgency_level: result.urgency_level,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ success: false, error: 'validation', details: e.errors });
    next(e);
  }
});

// ─── POST /robot/heartbeat : l'ESP32 signale qu'il est actif (OBLIGATOIRE) ─
// Permet de garder le robot marqué comme "en_ligne" même sans mesure.
// L'ESP32 doit envoyer un heartbeat toutes les 30 secondes.
router.post('/heartbeat', async (req, res, next) => {
  try {
    const { battery_pct, firmware, free_memory_kb } = req.body || {};
    await prisma.meraDevice.update({
      where: { id: req.device.id },
      data: {
        last_sync: new Date(),
        status: 'en_ligne',
        battery_level: typeof battery_pct === 'number' ? battery_pct : undefined,
        firmware_version: typeof firmware === 'string' ? firmware : undefined,
      },
    });
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (e) { next(e); }
});

// ─── POST /robot/attendance : enregistre un badge RFID (présence) ─
// L'ESP32 appelle cet endpoint à chaque badge pour enregistrer le pointage.
router.post('/attendance', async (req, res, next) => {
  try {
    const { card_id, patient_id, patient_name, role } = req.body || {};
    if (!card_id) return res.status(400).json({ success: false, message: 'card_id is required' });

    // Chercher le patient si card_id fourni sans patient_id
    let pid = patient_id;
    let pname = patient_name;
    let prole = role || 'patient';
    if (!pid) {
      const patient = await prisma.patient.findUnique({
        where: { card_id },
        select: { id: true, full_name: true },
      });
      if (patient) {
        pid = patient.id;
        pname = patient.full_name;
      } else {
        // Chercher dans User (staff)
        const user = await prisma.user.findUnique({
          where: { id_card: card_id },
          select: { id: true, full_name: true, role: true },
        });
        if (user) {
          pid = user.id;
          pname = user.full_name;
          prole = user.role;
        }
      }
    }

    const record = await prisma.attendance.create({
      data: {
        patient_id: pid,
        card_id,
        patient_name: pname || 'Inconnu',
        role: prole,
        device_id: req.device.id,
        health_center_id: req.device.health_center_id,
      },
    });

    // Update device heartbeat
    await prisma.meraDevice.update({
      where: { id: req.device.id },
      data: { last_sync: new Date(), status: 'en_ligne' },
    });

    res.status(201).json({
      success: true,
      id: record.id,
      badged_at: record.badged_at,
      patient_name: record.patient_name,
    });
  } catch (e) { next(e); }
});

// ─── POST /robot/lookup : cherche un patient (card_id) OU un encadreur (id_card) par RFID ─
// Retourne les infos pour affichage sur l'écran de l'ESP32.
router.post('/lookup', async (req, res, next) => {
  try {
    const { card_id } = req.body || {};
    if (!card_id) return res.status(400).json({ success: false, message: 'card_id is required' });

    // Chercher d'abord dans Patient (enfant)
    const patient = await prisma.patient.findUnique({
      where: { card_id },
      select: { id: true, full_name: true, age: true, sex: true, village: true },
    });
    if (patient) {
      return res.json({
        success: true,
        role: 'patient',
        patient: {
          id: patient.id,
          full_name: patient.full_name || 'Patient',
          age: patient.age,
          sex: patient.sex,
          village: patient.village || '',
          card_id,
        },
      });
    }

    // Chercher ensuite dans User (encadreur/medecin/admin)
    const user = await prisma.user.findUnique({
      where: { id_card: card_id },
      select: { id: true, full_name: true, role: true },
    });
    if (user && (user.role === 'encadreur' || user.role === 'medecin' || user.role === 'admin')) {
      return res.json({
        success: true,
        role: user.role,
        patient: {
          id: user.id,
          full_name: user.full_name || 'Encadreur',
          card_id,
        },
      });
    }

    return res.status(404).json({ success: false, message: 'card_not_registered' });
  } catch (e) { next(e); }
});

export default router;
