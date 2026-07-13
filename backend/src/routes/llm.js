import { Router } from 'express';
import { z } from 'zod';
import { requireAnyAuth } from '../middleware/auth.js';
import { llmInvoke, availableProviders } from '../lib/llm.js';

const router = Router();
router.use(requireAnyAuth);

const PATIENT_DISCLAIMER = `Tu parles directement à un patient (pas à un soignant). Donne des conseils prudents, généraux, et insiste pour qu'il consulte un médecin pour tout symptôme inquiétant. N'établis JAMAIS de diagnostic définitif.`;

const invokeSchema = z.object({
  prompt: z.string().min(1),
  system: z.string().optional(),
  max_tokens: z.number().int().min(1).max(8192).optional(),
});

router.post('/invoke', async (req, res, next) => {
  try {
    const data = invokeSchema.parse(req.body);

    const systemParts = [];
    if (data.system) systemParts.push(data.system);
    if (req.authKind === 'patient') systemParts.push(PATIENT_DISCLAIMER);
    const system = systemParts.join('\n\n');

    const result = await llmInvoke({
      system: system || undefined,
      prompt: data.prompt,
      max_tokens: data.max_tokens ?? 1024,
    });

    res.json({ response: result.text, provider: result.provider, model: result.model });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'validation', details: e.errors });
    if (e.message === 'no_llm_provider_available') {
      return res.status(503).json({ error: 'llm_unavailable', message: 'Aucun provider IA configuré' });
    }
    next(e);
  }
});

// Diagnostique des providers disponibles (debug, admin)
router.get('/providers', (req, res) => {
  res.json({ providers: availableProviders(), preferred: process.env.LLM_PROVIDER || 'auto' });
});

export default router;
