// Computes the set of patient/session IDs a staff user is allowed to read.
// Encadreur → only his own children (Patient.guardian_id = self).
// Médecin   → children of every encadreur assigned to him (DoctorAssignment).
// Admin     → no restriction.
import { prisma } from './prisma.js';

const SHARED_READ_ADMIN_WRITE = new Set(['HealthCenter', 'MeraDevice', 'TraditionalTreatment']);
const VIA_SESSION = new Set([
  'VitalSigns', 'EyePhoto', 'ContagiousEyeResult', 'NonContagiousEyeResult',
  'SystemicPrediction', 'VocalExchange', 'MedicalReview',
]);

export const isSharedEntity = (entity) => SHARED_READ_ADMIN_WRITE.has(entity);
export const isSessionScoped = (entity) => VIA_SESSION.has(entity);

export const buildScope = async (user) => {
  if (user.role === 'admin') return { unrestricted: true, role: 'admin', userId: user.id };

  let encadreurIds = [];
  if (user.role === 'encadreur') {
    encadreurIds = [user.id];
  } else if (user.role === 'medecin') {
    const assignments = await prisma.doctorAssignment.findMany({
      where: { doctor_id: user.id },
      select: { encadreur_id: true },
    });
    encadreurIds = assignments.map((a) => a.encadreur_id);
  }

  if (encadreurIds.length === 0) {
    return { unrestricted: false, role: user.role, userId: user.id, encadreurIds: [], patientIds: [], sessionIds: [] };
  }

  const patients = await prisma.patient.findMany({
    where: { guardian_id: { in: encadreurIds } },
    select: { id: true },
  });
  const patientIds = patients.map((p) => p.id);

  if (patientIds.length === 0) {
    return { unrestricted: false, role: user.role, userId: user.id, encadreurIds, patientIds: [], sessionIds: [] };
  }

  const sessions = await prisma.diagnosticSession.findMany({
    where: { patient_id: { in: patientIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  return { unrestricted: false, role: user.role, userId: user.id, encadreurIds, patientIds, sessionIds };
};

// Returns the prisma `where` clause for reads, or `null` if the user has no access.
export const scopedWhere = (entity, scope, baseWhere) => {
  if (scope.unrestricted) return baseWhere || undefined;
  if (isSharedEntity(entity)) return baseWhere || undefined;

  let clause = null;
  if (entity === 'Patient') {
    if (scope.patientIds.length === 0) return null;
    clause = { id: { in: scope.patientIds } };
  } else if (entity === 'DiagnosticSession') {
    if (scope.patientIds.length === 0) return null;
    clause = { patient_id: { in: scope.patientIds } };
  } else if (isSessionScoped(entity)) {
    if (scope.sessionIds.length === 0) return null;
    clause = { session_id: { in: scope.sessionIds } };
  } else {
    return null; // unknown entity → deny
  }

  return baseWhere ? { AND: [baseWhere, clause] } : clause;
};

// Returns true if the user may CREATE this entity with the given body.
export const canCreateInScope = (entity, body, scope) => {
  if (scope.unrestricted) return true;
  if (isSharedEntity(entity)) return false;          // shared = admin write only
  if (entity === 'Patient') return scope.role !== 'pending'; // encadreur/medecin peuvent créer
  if (entity === 'DiagnosticSession') return scope.patientIds.includes(body.patient_id);
  if (isSessionScoped(entity))     return scope.sessionIds.includes(body.session_id);
  return false;
};

// Returns true if the user may MODIFY this existing entity row.
export const canModifyExisting = (entity, existing, scope) => {
  if (scope.unrestricted) return true;
  if (isSharedEntity(entity)) return false;
  if (entity === 'Patient') return scope.patientIds.includes(existing.id);
  if (entity === 'DiagnosticSession') return scope.patientIds.includes(existing.patient_id);
  if (isSessionScoped(entity)) return scope.sessionIds.includes(existing.session_id);
  return false;
};
