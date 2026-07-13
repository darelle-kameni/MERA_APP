import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireStaff } from '../middleware/auth.js';

const router = Router();
router.use(requireStaff);

const searchSchema = z.object({
  diseases: z.array(z.string().min(1)).min(1).max(20),
});

// POST /treatments/search : cherche dans la table TraditionalTreatment
// les entrées dont la maladie contient (insensible à la casse) au moins un
// des mots-clés fournis.  Retourne les entrées dédoublonnées par maladie.
router.post('/search', async (req, res, next) => {
  try {
    const { diseases } = searchSchema.parse(req.body);

    // Requête raw SQL car le client Prisma généré est antérieur aux colonnes
    // evidence_level, source, synonyms_locaux, contre_indications
    const conditions = diseases.map(() => `disease LIKE ?`).join(' OR ');
    const params = diseases.map((d) => `%${d}%`);
    const treatments = await prisma.$queryRawUnsafe(
      `SELECT * FROM TraditionalTreatment WHERE ${conditions} ORDER BY disease ASC`,
      ...params
    );

    res.json({ treatments, matched: diseases });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

export default router;
