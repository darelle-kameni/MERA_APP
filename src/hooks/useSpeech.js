/**
 * Utilitaire Text-to-Speech — Web Speech API
 * Gère le chargement asynchrone des voix.
 */

let voicesLoaded = false;

function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve(voices);
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        voicesLoaded = true;
        resolve(window.speechSynthesis.getVoices());
      }, { once: true });
    }
  });
}

export async function speak(text, options = {}) {
  if (!window.speechSynthesis) {
    console.warn("SpeechSynthesis non supporté sur ce navigateur.");
    return;
  }

  window.speechSynthesis.cancel();

  const voices = await loadVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang || "fr-FR";
  utterance.rate = options.rate || 0.9;
  utterance.pitch = options.pitch || 1.0;
  utterance.volume = options.volume || 1.0;

  // Chercher une voix française, sinon prendre la première dispo
  const frVoice = voices.find(v => v.lang === "fr-FR")
    || voices.find(v => v.lang.startsWith("fr"))
    || voices[0];
  if (frVoice) utterance.voice = frVoice;

  return new Promise((resolve) => {
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}