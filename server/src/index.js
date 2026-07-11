import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFileSync, existsSync } from 'node:fs';
import authRouter from './routes/auth.js';
import patientAuthRouter from './routes/patient-auth.js';
import patientDataRouter from './routes/patient-data.js';
import entitiesRouter from './routes/entities.js';
import uploadRouter, { UPLOAD_DIR } from './routes/upload.js';
import llmRouter from './routes/llm.js';
import llmPredictRouter from './routes/llm-predict.js';
import voiceRouter from './routes/voice.js';
import adminRouter, { publicRequestRouter } from './routes/admin.js';
import notificationsRouter from './routes/notifications.js';
import robotRouter from './routes/robot.js';
import treatmentsRouter from './routes/treatments.js';
import devicesRouter from './routes/devices.js';
import attendanceRouter from './routes/attendance.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin.split(',').map((s) => s.trim()),
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/auth', authRouter);
app.use('/auth', publicRequestRouter);  // POST /auth/request-registration
app.use('/auth/patient', patientAuthRouter);
app.use('/patient', patientDataRouter);
app.use('/admin', adminRouter);
app.use('/me/notifications', notificationsRouter);
app.use('/robot', robotRouter);
app.use('/devices', devicesRouter);
app.use('/entities', entitiesRouter);
app.use('/upload', uploadRouter);
app.use('/llm', llmRouter);
app.use('/llm', llmPredictRouter);  // monte /llm/predict-diagnosis
app.use('/llm', voiceRouter);        // monte /llm/transcribe et /llm/speak
app.use('/treatments', treatmentsRouter);
app.use('/attendance', attendanceRouter);

const DIST_DIR = path.resolve(ROOT_DIR, '..', 'dist');
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  const indexHtml = readFileSync(path.resolve(DIST_DIR, 'index.html'), 'utf-8');
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.set('Content-Type', 'text/html').send(indexHtml);
    }
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MERA backend listening on http://localhost:${PORT}`);
});
