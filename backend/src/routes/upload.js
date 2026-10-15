import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

// Whitelist stricte mimetype ↔ extension. Pas de `image/*` générique :
// cela laisserait passer du SVG (XSS stocké potentiel). L'extension doit
// correspondre au type déclaré.
const ALLOWED_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const exts = ALLOWED_TYPES[file.mimetype];
    if (exts && exts.includes(ext)) return cb(null, true);
    const err = new Error('unsupported_type');
    err.status = 400;
    cb(err);
  },
});

const router = Router();
router.use(requireAuth);

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const file_url = `/uploads/${req.file.filename}`;
  res.json({ file_url, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
});

export default router;
export { UPLOAD_DIR };
