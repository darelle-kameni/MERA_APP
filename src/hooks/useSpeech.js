// Pipeline vocal MERA — STT via Groq Whisper (backend) + TTS via msedge-tts (backend),
// avec fallback Web Speech API si le backend est indisponible ou si la fonctionnalité
// du navigateur est plus pratique pour l'usage (ex : commande vocale rapide hors session).

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ─── État partagé ───────────────────────────────────────────
let voicesLoaded = false;
let recognitionInstance = null;
let currentAudio = null;       // Audio HTMLElement (TTS backend)
let currentRecorder = null;    // MediaRecorder (STT backend)
let currentStream = null;      // MediaStream

// ─── Helpers Web Speech API ─────────────────────────────────
function loadVoices() {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve([]);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve(voices);
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        voicesLoaded = true;
        resolve(window.speechSynthesis.getVoices());
      }, { once: true });
    }
  });
}

function findBestVoice(voices, lang) {
  const langPrefix = lang.split('-')[0];
  const googleVoice = voices.find((v) => v.lang.startsWith(langPrefix) && v.name.includes('Google'));
  if (googleVoice) return googleVoice;
  const exactLang = voices.find((v) => v.lang === lang);
  if (exactLang) return exactLang;
  const anyLang = voices.find((v) => v.lang.startsWith(langPrefix));
  return anyLang || voices[0];
}

async function speakBrowser(text, options = {}) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const voices = await loadVoices();
  const lang = options.lang || 'fr-FR';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = options.rate ?? 0.95;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;
  utterance.voice = findBestVoice(voices, lang);
  return new Promise((resolve) => {
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

// ─── TTS via backend (msedge-tts) avec fallback ─────────────
// Voix recommandées : fr-FR-DeniseNeural (défaut), fr-FR-HenriNeural, fr-FR-EloiseNeural (enfant)
export async function speak(text, options = {}) {
  if (!text) return;
  if (options.useBrowser) return speakBrowser(text, options);

  try {
    stopSpeaking(); // coupe toute lecture précédente
    const res = await fetch(`${API_BASE}/llm/speak`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: options.voice || (options.lang === 'fr-CA' ? 'fr-CA-SylvieNeural' : 'fr-FR-DeniseNeural'),
        rate: options.rate,
        pitch: options.pitch,
      }),
    });
    if (!res.ok) throw new Error('tts_backend_failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      currentAudio = new Audio(url);
      currentAudio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      currentAudio.onerror  = () => { URL.revokeObjectURL(url); resolve(); };
      currentAudio.play().catch(() => resolve());
    });
  } catch {
    // Fallback Web Speech API si le backend ne répond pas
    return speakBrowser(text, options);
  }
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.src = ''; } catch { /* noop */ }
    currentAudio = null;
  }
  if (recognitionInstance) {
    try { recognitionInstance.abort(); } catch { /* noop */ }
    recognitionInstance = null;
  }
}

// ─── STT via backend (Groq Whisper) ─────────────────────────
// Enregistre via MediaRecorder, envoie le blob audio au backend, retourne le texte transcrit.
export async function startRecording() {
  if (currentRecorder) return; // déjà en cours
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('MIC_NOT_SUPPORTED');
  currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Choisir le meilleur format dispo (webm/opus partout, mp4/aac en fallback Safari)
  let mimeType = 'audio/webm;codecs=opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
  }

  const chunks = [];
  currentRecorder = new MediaRecorder(currentStream, mimeType ? { mimeType } : undefined);
  currentRecorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
  currentRecorder._chunksRef = chunks;
  currentRecorder._mimeRef  = mimeType;
  currentRecorder.start();
}

export async function stopRecordingAndTranscribe(options = {}) {
  if (!currentRecorder) return '';
  const recorder = currentRecorder;
  const chunks = recorder._chunksRef;
  const mimeType = recorder._mimeRef;

  await new Promise((resolve) => {
    recorder.onstop = resolve;
    recorder.stop();
  });
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
  currentRecorder = null;

  if (chunks.length === 0) return '';
  const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
  const ext  = mimeType?.includes('mp4') ? 'm4a' : 'webm';

  const fd = new FormData();
  fd.append('audio', blob, `recording.${ext}`);
  if (options.language) fd.append('language', options.language);

  try {
    const res = await fetch(`${API_BASE}/llm/transcribe`, {
      method: 'POST', credentials: 'include', body: fd,
    });
    if (!res.ok) {
      // Fallback Web Speech API si backend KO (mode dégradé)
      console.warn('[stt] backend failed, falling back to Web Speech API');
      return listen({ lang: options.language || 'fr-FR' });
    }
    const data = await res.json();
    return (data.text || '').trim();
  } catch (err) {
    console.error('[stt] transcribe error', err);
    return '';
  }
}

export function cancelRecording() {
  if (currentRecorder) {
    try { currentRecorder.stop(); } catch { /* noop */ }
    currentRecorder = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
}

export function isRecording() {
  return !!currentRecorder;
}

// ─── Fallback Web Speech API (utilisé si backend indispo) ───
export function listen(options = {}) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('SPEECH_NOT_SUPPORTED'));
      return;
    }
    const lang = options.lang || 'fr-FR';
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionInstance = recognition;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      recognitionInstance = null;
      resolve(transcript);
    };
    recognition.onerror = (event) => {
      recognitionInstance = null;
      if (event.error === 'no-speech' || event.error === 'aborted') resolve('');
      else reject(new Error(event.error));
    };
    recognition.onend = () => { recognitionInstance = null; };
    recognition.start();
  });
}

export function isSpeechSupported() {
  return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}
