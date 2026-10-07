import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireStaff } from '../middleware/auth.js';

const router = Router();
router.use(requireStaff);

const searchSchema = z.object({
  diseases: z.array(z.string().min(1)).min(1).max(20),
});

const MIN_PREFIX_LENGTH = 4;

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalize(value)
    .split(' ')
    .filter(Boolean)
    .map((word) =>
      word.length > MIN_PREFIX_LENGTH && word.endsWith('s') && !word.endsWith('ss')
        ? word.slice(0, -1)
        : word
    );
}

function tokensMatch(keywordToken, diseaseToken) {
  if (keywordToken === diseaseToken) return true;
  if (keywordToken.length < MIN_PREFIX_LENGTH || diseaseToken.length < MIN_PREFIX_LENGTH) return false;
  return keywordToken.startsWith(diseaseToken) || diseaseToken.startsWith(keywordToken);
}

function diseaseMatches(diseaseTokens, keywordTokens) {
  if (!keywordTokens.length) return false;
  return keywordTokens.every((keywordToken) =>
    diseaseTokens.some((diseaseToken) => tokensMatch(keywordToken, diseaseToken))
  );
}

// POST /treatments/search : renvoie les traitements dont la maladie correspond
// aux mots-clés fournis, sans tenir compte de la casse, des accents, du pluriel
// ni des qualificatifs ("Diabète" trouve "Rétinopathie diabétique").
// Seuls les traitements `approved` (modérés) sont proposés au personnel soignant :
// une contribution `pending` ne doit jamais atteindre une décision clinique (DQ-05).
router.post('/search', async (req, res, next) => {
  try {
    const { diseases } = searchSchema.parse(req.body);
    const keywords = diseases.map(tokenize).filter((tokens) => tokens.length);
    if (!keywords.length) return res.json({ treatments: [], matched: diseases });

    const candidates = await prisma.traditionalTreatment.findMany({
      where: { status: 'approved' },
      orderBy: { disease: 'asc' },
    });

    const treatments = candidates.filter((candidate) => {
      const diseaseTokens = tokenize(candidate.disease);
      return keywords.some((keywordTokens) => diseaseMatches(diseaseTokens, keywordTokens));
    });

    res.json({ treatments, matched: diseases });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

export default router;
