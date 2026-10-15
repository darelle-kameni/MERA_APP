// Sert les fichiers uploadés (signatures, PDF, photos) DERRIÈRE authentification.
// Remplace l'ancien `express.static` public qui exposait signatures et images
// médicales à quiconque connaissait l'URL.
import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { requireAnyAuth } from '../middleware/auth.js';
import { UPLOAD_DIR } from './upload.js';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

const router = Router();
router.use(requireAnyAuth);

router.get('*', (req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(req.params[0] || '');
  } catch {
    return res.status(400).json({ error: 'invalid_path' });
  }

  const abs = path.resolve(UPLOAD_DIR, '.' + path.sep + rel);
  // Anti path-traversal : le fichier résolu doit rester dans UPLOAD_DIR.
  if (abs !== UPLOAD_DIR && !abs.startsWith(UPLOAD_DIR + path.sep)) {
    return res.status(400).json({ error: 'invalid_path' });
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return res.status(404).json({ error: 'not_found' });
  }

  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext];
  const safeType = type || 'application/octet-stream';
  res.set('Content-Type', safeType);
  res.set('X-Content-Type-Options', 'nosniff');
  // Inline uniquement pour les types sûrs : un fichier non reconnu est téléchargé.
  res.set(
    'Content-Disposition',
    `${type ? 'inline' : 'attachment'}; filename="${path.basename(abs)}"`,
  );
  res.sendFile(abs);
});

export default router;
