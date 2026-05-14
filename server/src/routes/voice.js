// Pipeline vocal interactif MERA :
//   - POST /llm/transcribe : reçoit un blob audio (multipart), l'envoie à Groq Whisper, retourne le texte
//   - POST /llm/speak      : reçoit du texte, retourne un MP3 généré par Microsoft Edge TTS (msedge-tts)
//
// STT : Groq Whisper Large v3 (free tier, ~300ms, excellent français)
// TTS : msedge-tts (gratuit illimité, voix Microsoft Neural — qualité Azure-grade, sans clé)
import { Router } from 'express';
import multer from 'multer';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { requireAnyAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAnyAuth);

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max (Whisper limit)
});

// ─── STT : POST /llm/transcribe ─────────────────────────────────────
router.post('/transcribe', audioUpload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no_audio' });
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: 'stt_unavailable', message: 'GROQ_API_KEY non configurée' });
    }

    const language = (req.body.language || 'fr').toLowerCase().slice(0, 5);
    const model = req.body.model || 'whisper-large-v3';

    // FormData natif Node 18+ — on rebuild un multipart pour forward vers Groq
    const fd = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    fd.append('file', blob, req.file.originalname || 'audio.webm');
    fd.append('model', model);
    fd.append('language', language);
    fd.append('response_format', 'verbose_json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: fd,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '');
      return res.status(502).json({ error: 'stt_failed', detail: errText.slice(0, 300) });
    }

    const data = await groqRes.json();
    res.json({
      text: data.text || '',
      language: data.language,
      duration: data.duration,
    });
  } catch (e) { next(e); }
});

// ─── TTS : POST /llm/speak ──────────────────────────────────────────
// Voix françaises Microsoft Neural recommandées :
//   - fr-FR-DeniseNeural   (femme, claire, posée — défaut)
//   - fr-FR-HenriNeural    (homme, professionnel)
//   - fr-FR-VivienneMultilingualNeural (femme, multilingue)
//   - fr-FR-AlainNeural    (homme, dynamique)
//   - fr-CA-SylvieNeural   (femme, accent canadien)
//   - fr-FR-EloiseNeural   (femme, enfant — pour mode pédiatrique)
// La liste complète : https://learn.microsoft.com/azure/ai-services/speech-service/language-support
const DEFAULT_VOICE = 'fr-FR-DeniseNeural';

router.post('/speak', async (req, res, next) => {
  try {
    const text = (req.body.text || '').toString().trim();
    if (!text) return res.status(400).json({ error: 'no_text' });
    if (text.length > 4000) return res.status(400).json({ error: 'text_too_long' });

    const voice = (req.body.voice || DEFAULT_VOICE).toString();
    const rate = req.body.rate;     // ex: "+0%" ou "+10%"
    const pitch = req.body.pitch;   // ex: "+0Hz"
    const volume = req.body.volume; // ex: "+0%"

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const prosody = {};
    if (rate)   prosody.rate   = rate;
    if (pitch)  prosody.pitch  = pitch;
    if (volume) prosody.volume = volume;

    const { audioStream } = tts.toStream(text, Object.keys(prosody).length ? prosody : undefined);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    audioStream.on('error', (err) => {
      console.error('[tts] stream error', err);
      if (!res.headersSent) res.status(500).json({ error: 'tts_stream_error' });
      try { tts.close(); } catch { /* noop */ }
    });
    audioStream.on('end', () => { try { tts.close(); } catch { /* noop */ } });
    audioStream.pipe(res);
  } catch (e) { next(e); }
});

// Diagnostic : liste les capacités vocales activées
router.get('/voice/status', (req, res) => {
  res.json({
    stt: { available: !!process.env.GROQ_API_KEY, provider: 'groq', model: 'whisper-large-v3' },
    tts: { available: true, provider: 'msedge-tts', default_voice: DEFAULT_VOICE },
  });
});

export default router;
