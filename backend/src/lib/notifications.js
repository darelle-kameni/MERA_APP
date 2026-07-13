import { prisma } from './prisma.js';

// Side effect: when a DiagnosticSession with CRITIQUE/ELEVE urgency is created,
// notify the guardian + every doctor assigned to that guardian.
export const notifyUrgentCase = async (sessionId) => {
  const session = await prisma.diagnosticSession.findUnique({
    where: { id: sessionId },
    include: { patient: true },
  });
  if (!session) return;
  if (!['CRITIQUE', 'ELEVE'].includes(session.urgency_level)) return;

  const recipients = new Set();
  if (session.patient.guardian_id) {
    recipients.add(session.patient.guardian_id);
    const assignments = await prisma.doctorAssignment.findMany({
      where: { encadreur_id: session.patient.guardian_id },
      select: { doctor_id: true },
    });
    assignments.forEach((a) => recipients.add(a.doctor_id));
  }

  if (recipients.size === 0) return;

  const title = session.urgency_level === 'CRITIQUE'
    ? 'Cas critique détecté'
    : 'Cas à surveiller';
  const body = `${session.patient.full_name || 'Patient anonyme'} (${session.patient.age} ans) — urgence ${session.urgency_level}`;

  await prisma.notification.createMany({
    data: Array.from(recipients).map((rid) => ({
      recipient_id: rid,
      kind: 'urgent_case',
      title,
      body,
      link: '/reviews',
      payload: JSON.stringify({ session_id: session.id, patient_id: session.patient.id }),
    })),
  });
};

// Side effect: when a MedicalReview is created/updated to valide|refere,
// notify the guardian that a diagnosis is available.
export const notifyDiagnosisPublished = async (reviewId) => {
  const review = await prisma.medicalReview.findUnique({
    where: { id: reviewId },
    include: { session: { include: { patient: true } } },
  });
  if (!review) return;
  if (!['valide', 'refere'].includes(review.status)) return;
  if (!review.session.patient.guardian_id) return;

  const refere = review.status === 'refere';
  await prisma.notification.create({
    data: {
      recipient_id: review.session.patient.guardian_id,
      kind: refere ? 'diagnosis_referral' : 'diagnosis_published',
      title: refere ? 'Référence médicale émise' : 'Nouveau diagnostic disponible',
      body: refere
        ? `${review.session.patient.full_name || 'Votre enfant'} a été référé(e) : ${review.referral_hospital || 'voir le détail'}`
        : `Le médecin a validé le diagnostic de ${review.session.patient.full_name || 'votre enfant'}`,
      link: '/patients',
      payload: JSON.stringify({
        session_id: review.session.id,
        review_id: review.id,
        pdf_url: review.pdf_url,
      }),
    },
  });
};
