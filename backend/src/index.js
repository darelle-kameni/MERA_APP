import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFileSync, existsSync } from 'node:fs';
import authRouter from './routes/auth.js';
import patientAuthRouter from './routes/patient-auth.js';
import patientDataRouter from './routes/patient-data.js';
import entitiesRouter from './routes/entities.js';
import uploadRouter from './routes/upload.js';
import filesRouter from './routes/files.js';
import llmRouter from './routes/llm.js';
import llmPredictRouter from './routes/llm-predict.js';
import voiceRouter from './routes/voice.js';
import adminRouter, { publicRequestRouter } from './routes/admin.js';
import notificationsRouter from './routes/notifications.js';
import robotRouter from './routes/robot.js';
import treatmentsRouter from './routes/treatments.js';
import devicesRouter from './routes/devices.js';
import attendanceRouter from './routes/attendance.js';
import { globalLimiter, loginLimiter, publicWriteLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();

// Derrière le proxy Render : indispensable pour que req.ip / rate limiting
// voient la vraie IP client au lieu de celle du proxy.
app.set('trust proxy', 1);

// En-têtes de sécurité HTTP. CSP adaptée : Google Fonts + styles inline (React).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      // Désactivé pour ne pas casser le dev en HTTP local.
      upgradeInsecureRequests: null,
    },
  },
}));

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin.split(',').map((s) => s.trim()),
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use(globalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// Fichiers uploadés : servis derrière authentification (plus de static public).
app.use('/api/uploads', filesRouter);

// Rate limiting ciblé AVANT les routeurs concernés.
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/patient/login', loginLimiter);
app.use('/api/auth/request-registration', publicWriteLimiter);

app.use('/api/auth', authRouter);
app.use('/api/auth', publicRequestRouter);  // POST /api/auth/request-registration
app.use('/api/auth/patient', patientAuthRouter);
app.use('/api/patient', patientDataRouter);
app.use('/api/admin', adminRouter);
app.use('/api/me/notifications', notificationsRouter);
app.use('/api/robot', robotRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/llm', llmRouter);
app.use('/api/llm', llmPredictRouter);  // monte /api/llm/predict-diagnosis
app.use('/api/llm', voiceRouter);        // monte /api/llm/transcribe et /api/llm/speak
app.use('/api/treatments', treatmentsRouter);
app.use('/api/attendance', attendanceRouter);

const DIST_DIR = path.resolve(ROOT_DIR, '..', 'frontend', 'dist');
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  const indexHtml = readFileSync(path.resolve(DIST_DIR, 'index.html'), 'utf-8');
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.set('Content-Type', 'text/html').send(indexHtml);
    }
  });
} else {
  console.warn('⚠ dist/ directory not found at', DIST_DIR, '— frontend will not be served');
}

app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MERA backend listening on http://localhost:${PORT}`);
});
