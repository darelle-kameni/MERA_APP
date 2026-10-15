// Protection anti-brute-force au niveau du compte (en plus du rate limiting IP).
// Après MAX_ATTEMPTS échecs, le compte est verrouillé LOCK_MINUTES.
// Le compteur est persisté en base : il survit aux redémarrages du serveur.
import bcrypt from 'bcryptjs';

export const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Hash factice pour comparer en temps constant quand l'identifiant n'existe pas
// (évite de révéler l'existence d'un compte par le timing de la réponse).
export const DUMMY_HASH = bcrypt.hashSync('mera-dummy-password', 10);

export const isLocked = (record) =>
  !!record?.locked_until && new Date(record.locked_until).getTime() > Date.now();

export const lockResponse = (record) => ({
  error: 'account_locked',
  message: 'Compte temporairement verrouillé suite à trop de tentatives échouées.',
  retry_after_seconds: Math.max(
    1,
    Math.ceil((new Date(record.locked_until).getTime() - Date.now()) / 1000),
  ),
});

export async function recordFailure(delegate, id, attempts = 0) {
  const n = (attempts || 0) + 1;
  await delegate.update({
    where: { id },
    data: n >= MAX_ATTEMPTS
      ? { failed_login_attempts: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60_000) }
      : { failed_login_attempts: n },
  });
}

export const recordSuccess = (delegate, id) =>
  delegate.update({
    where: { id },
    data: { failed_login_attempts: 0, locked_until: null },
  });

export const logFailedLogin = (req, kind, identifier) =>
  console.warn('[auth] échec de connexion', {
    kind,
    identifier,
    ip: req.ip,
    at: new Date().toISOString(),
  });
