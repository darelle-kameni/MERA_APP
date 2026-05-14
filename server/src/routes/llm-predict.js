// POST /llm/predict-diagnosis : prend le contexte d'une session (vitales, résultats
// oculaires, transcript, démographie) et appelle le LLM pour générer :
//   - Une liste de maladies systémiques probables (3-5) avec probabilité + sévérité
//   - Un niveau d'urgence global
//   - Des recommandations cliniques
// Persiste les SystemicPrediction et met à jour DiagnosticSession.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireStaff } from '../middleware/auth.js';
import { buildScope, canModifyExisting } from '../lib/scope.js';
import { llmInvokeJSON } from '../lib/llm.js';
import { notifyUrgentCase } from '../lib/notifications.js';

const router = Router();
router.use(requireStaff);

// session_id : si fourni → persiste les prédictions dans la BD + déclenche notifs.
// context    : si fourni sans session_id → mode "preview" (calcul IA sans persistance).
// Au moins un des deux doit être présent.
const schema = z.object({
  session_id: z.string().optional(),
  context: z.object({
    patient_age: z.number().optional().nullable(),
    patient_sex: z.string().optional().nullable(),
    patient_name: z.string().optional().nullable(),
    vitals: z.object({
      temperature: z.number().optional().nullable(),
      spo2: z.number().optional().nullable(),
      heart_rate: z.number().optional().nullable(),
      weight: z.number().optional().nullable(),
      bmi: z.number().optional().nullable(),
    }).optional(),
    eye_results: z.any().optional(),
    vocal_transcript: z.string().optional().nullable(),
    additional_notes: z.string().optional().nullable(),
  }).optional(),
}).refine((d) => d.session_id || d.context, {
  message: 'session_id or context required',
});

const SYSTEM_PROMPT = `Tu es un assistant médical clinique pour un système de dépistage pédiatrique au Cameroun.
Tu analyses des données collectées par un robot médical (signes vitaux + résultats d'analyse oculaire embarquée + dialogue patient) et tu génères :
1. Une évaluation des maladies systémiques probables (3 à 5 maladies max, avec probabilité 0-100 et sévérité : critique/eleve/modere/faible).
2. Un niveau d'urgence global : CRITIQUE | ELEVE | MODERE | NORMAL.
3. Des recommandations cliniques concises (max 3 phrases) pour le soignant.

Tu réponds STRICTEMENT en JSON valide selon ce schéma :
{
  "urgency_level": "CRITIQUE|ELEVE|MODERE|NORMAL",
  "systemic_predictions": [
    { "disease": "string", "probability": number, "severity": "critique|eleve|modere|faible", "trigger_factors": "string" }
  ],
  "recommendations": "string"
}

Critères d'urgence (à appliquer rigoureusement) :
- CRITIQUE : T° > 40°C OU SpO2 < 90% OU FC > 130 OU signes de détresse vitale
- ELEVE : T° 38.5-40°C OU SpO2 90-94% OU contagion alerte = oui OU déshydratation sévère
- MODERE : symptômes présents non vitaux, à surveiller
- NORMAL : pas d'anomalie significative

Pas de markdown, pas de texte hors JSON.`;

const buildPrompt = (patient, vitals, eyeResults, transcript, additionalNotes) => {
  const lines = [
    `Patient : ${patient?.patient_age || '?'} ans, sexe ${patient?.patient_sex || '?'}, ${patient?.patient_name || 'anonyme'}.`,
  ];

  if (vitals) {
    const v = vitals;
    const vstr = [
      v.temperature != null && `T° ${v.temperature}°C`,
      v.spo2 != null && `SpO2 ${v.spo2}%`,
      v.heart_rate != null && `FC ${v.heart_rate} bpm`,
      v.weight != null && `${v.weight}kg`,
      v.bmi != null && `IMC ${v.bmi}`,
    ].filter(Boolean).join(', ');
    if (vstr) lines.push(`Signes vitaux : ${vstr}.`);
  }

  if (eyeResults?.contagious) {
    const c = eyeResults.contagious;
    const items = [];
    if (c.conjunctivitis_bacterial != null) items.push(`conjonctivite bactérienne ${c.conjunctivitis_bacterial}%`);
    if (c.conjunctivitis_viral != null) items.push(`conjonctivite virale ${c.conjunctivitis_viral}%`);
    if (c.trachoma != null) items.push(`trachome ${c.trachoma}%`);
    if (c.blepharitis_infectious != null) items.push(`blépharite infectieuse ${c.blepharitis_infectious}%`);
    if (items.length) lines.push(`Analyse oculaire contagieuse : ${items.join(', ')}.`);
    if (c.contagion_alert) lines.push(`⚠️ Alerte contagion ACTIVE.`);
  }

  if (eyeResults?.non_contagious) {
    const n = eyeResults.non_contagious;
    const items = [];
    if (n.cataract != null) items.push(`cataracte ${n.cataract}%`);
    if (n.glaucoma != null) items.push(`glaucome ${n.glaucoma}%`);
    if (n.myopia != null) items.push(`myopie ${n.myopia}%`);
    if (n.diabetic_retinopathy != null) items.push(`rétinopathie diabétique ${n.diabetic_retinopathy}%`);
    if (n.jaundice != null) items.push(`jaunisse ${n.jaundice}%`);
    if (items.length) lines.push(`Analyse oculaire non-contagieuse : ${items.join(', ')}.`);
  }

  if (transcript) lines.push(`Dialogue patient (transcription) : "${transcript}".`);
  if (additionalNotes) lines.push(`Notes additionnelles : ${additionalNotes}.`);

  lines.push('\nGénère l\'évaluation systémique et les recommandations cliniques en JSON.');
  return lines.join('\n');
};

const URGENCY_VALUES = new Set(['CRITIQUE', 'ELEVE', 'MODERE', 'NORMAL']);
const SEVERITY_VALUES = new Set(['critique', 'eleve', 'modere', 'faible']);

router.post('/predict-diagnosis', async (req, res, next) => {
  try {
    const data = schema.parse(req.body);

    let session = null;
    let vitals, eyeResults, transcript, additionalNotes;
    let patientSnapshot;

    if (data.session_id) {
      // Mode persistance : charge la session + scope check
      session = await prisma.diagnosticSession.findUnique({
        where: { id: data.session_id },
        include: {
          vital_signs:           { orderBy: { timestamp: 'desc' }, take: 1 },
          contagious_result:     true,
          non_contagious_result: true,
        },
      });
      if (!session) return res.status(404).json({ error: 'session_not_found' });

      const scope = await buildScope(req.user);
      if (!canModifyExisting('DiagnosticSession', session, scope)) {
        return res.status(403).json({ error: 'out_of_scope' });
      }

      vitals          = data.context?.vitals || session.vital_signs[0] || null;
      eyeResults      = data.context?.eye_results || {
        contagious:     session.contagious_result,
        non_contagious: session.non_contagious_result,
      };
      transcript      = data.context?.vocal_transcript ?? session.vocal_transcript ?? null;
      additionalNotes = data.context?.additional_notes;
      patientSnapshot = {
        patient_age:  session.patient_age,
        patient_sex:  session.patient_sex,
        patient_name: session.patient_name,
      };
    } else {
      // Mode preview : pas de session → pas de persistance
      const c = data.context;
      vitals          = c.vitals;
      eyeResults      = c.eye_results;
      transcript      = c.vocal_transcript;
      additionalNotes = c.additional_notes;
      patientSnapshot = {
        patient_age:  c.patient_age,
        patient_sex:  c.patient_sex,
        patient_name: c.patient_name,
      };
    }

    const prompt = buildPrompt(patientSnapshot, vitals, eyeResults, transcript, additionalNotes);
    const { data: parsed, provider, model } = await llmInvokeJSON({
      system: SYSTEM_PROMPT,
      prompt,
      max_tokens: 1024,
    });

    // Validation soft du JSON retourné
    if (!URGENCY_VALUES.has(parsed.urgency_level)) parsed.urgency_level = 'MODERE';
    if (!Array.isArray(parsed.systemic_predictions)) parsed.systemic_predictions = [];
    parsed.systemic_predictions = parsed.systemic_predictions.slice(0, 5).map((p) => ({
      disease:         String(p.disease || 'Inconnu').slice(0, 200),
      probability:     Math.max(0, Math.min(100, Number(p.probability) || 0)),
      severity:        SEVERITY_VALUES.has(p.severity) ? p.severity : 'modere',
      trigger_factors: p.trigger_factors ? String(p.trigger_factors).slice(0, 500) : null,
    }));
    parsed.recommendations = parsed.recommendations
      ? String(parsed.recommendations).slice(0, 2000)
      : null;

    // Persistence atomique (uniquement si session fournie)
    if (session) {
      await prisma.$transaction(async (tx) => {
        await tx.systemicPrediction.deleteMany({ where: { session_id: session.id } });
        if (parsed.systemic_predictions.length > 0) {
          await tx.systemicPrediction.createMany({
            data: parsed.systemic_predictions.map((p) => ({
              session_id: session.id,
              disease: p.disease,
              probability: p.probability,
              severity: p.severity,
              trigger_factors: p.trigger_factors,
            })),
          });
        }
        await tx.diagnosticSession.update({
          where: { id: session.id },
          data: {
            urgency_level: parsed.urgency_level,
            recommendations: parsed.recommendations || session.recommendations,
          },
        });
      });
      notifyUrgentCase(session.id).catch((err) => console.error('notifyUrgentCase failed', err));
    }

    res.json({
      ok: true,
      persisted: !!session,
      urgency_level: parsed.urgency_level,
      systemic_predictions: parsed.systemic_predictions,
      recommendations: parsed.recommendations,
      llm: { provider, model },
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    if (e.message === 'no_llm_provider_available') {
      return res.status(503).json({ error: 'llm_unavailable' });
    }
    if (e.message?.startsWith('json_parse_failed')) {
      return res.status(502).json({ error: 'llm_invalid_response', detail: e.message });
    }
    next(e);
  }
});

export default router;
