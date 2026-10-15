import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// En production, refuser de démarrer avec un secret absent ou faible :
// un secret deviné = forge de tokens = accès total aux dossiers médicaux.
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /change[-_]?me|secret|dev/i.test(process.env.JWT_SECRET))
) {
  console.error('FATAL: JWT_SECRET doit être défini à une valeur forte (≥ 32 car.) en production.');
  process.exit(1);
}

export const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
};

export const COOKIE_NAME = 'mera_token';

export const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    // En production le cookie est TOUJOURS Secure (HTTPS obligatoire) ; on ne
    // laisse pas COOKIE_SECURE=false désactiver cette protection.
    secure: isProd || process.env.COOKIE_SECURE === 'true',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
};
