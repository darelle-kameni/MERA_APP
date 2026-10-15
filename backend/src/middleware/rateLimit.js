// Rate limiting en mémoire (suffisant pour une instance unique — Render free).
// Pour un déploiement multi-instances, brancher un store Redis (rate-limit-redis).
import rateLimit from 'express-rate-limit';

const jsonMessage = (obj) => ({ message: obj });

// Plafond global, large, pour amortir le scraping / floods basiques.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Connexion : très strict, par IP. Complète le verrouillage par compte.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage({
    error: 'too_many_attempts',
    message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
  }),
});

// Formulaires publics (/auth/request-registration) : anti-spam.
export const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage({
    error: 'too_many_requests',
    message: 'Trop de requêtes. Réessayez plus tard.',
  }),
});
