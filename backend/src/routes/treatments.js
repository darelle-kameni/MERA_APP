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

    const orFilters = diseases.map((d) => ({
      disease: { contains: d, mode: 'insensitive' },
    }));
    const treatments = await prisma.traditionalTreatment.findMany({
      where: { OR: orFilters },
      orderBy: { disease: 'asc' },
    });

    res.json({ treatments, matched: diseases });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    next(e);
  }
});

export default router;
