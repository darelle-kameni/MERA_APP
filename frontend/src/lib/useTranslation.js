import { useState, useEffect } from "react";
import { MESSAGES } from "./lang/index.js";
import { getLanguage } from "./lang/languages.js";

const DEFAULT_LANG = "fr";

const getInitialLang = () => {
  const stored = localStorage.getItem("mera_lang");
  if (stored && (MESSAGES[stored] || getLanguage(stored))) return stored;
  return DEFAULT_LANG;
};

function resolve(messages, path) {
  if (!messages) return undefined;
  const keys = path.split(".");
  let val = messages;
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) val = val[k];
    else return undefined;
  }
  return typeof val === "string" ? val : undefined;
}

export function setLanguage(code) {
  localStorage.setItem("mera_lang", code);
  window.dispatchEvent(new Event("mera:langchange"));
}

// Version hors-hook (pour modules utilitaires : PDF, exports, etc.).
// Lit la langue courante dans localStorage et applique le même repli que t().
export function translate(path, fallback) {
  const lang = getInitialLang();
  const value = resolve(MESSAGES[lang], path);
  if (value !== undefined) return value;
  const frValue = resolve(MESSAGES[DEFAULT_LANG], path);
  if (frValue !== undefined) return frValue;
  return fallback !== undefined ? fallback : path;
}

export function useTranslation() {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    const handler = () => setLang(getInitialLang());
    window.addEventListener("mera:langchange", handler);
    return () => window.removeEventListener("mera:langchange", handler);
  }, []);

  const messages = MESSAGES[lang] || {};

  // t(path, fallback) : cherché dans la langue courante, puis en français,
  // puis renvoie `fallback` (ou le chemin lui-même en dernier recours).
  const t = (path, fallback) => {
    const value = resolve(messages, path);
    if (value !== undefined) return value;
    const frValue = resolve(MESSAGES[DEFAULT_LANG], path);
    if (frValue !== undefined) return frValue;
    return fallback !== undefined ? fallback : path;
  };

  return { t, lang };
}
