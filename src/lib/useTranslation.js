import { useState, useEffect } from "react";
import fr from "./lang/fr.js";
import en from "./lang/en.js";
import ff from "./lang/ff.js";
import ew from "./lang/ew.js";

const all = { fr, en, ff, ew };

const getInitialLang = () => localStorage.getItem("mera_lang") || "fr";

export function useTranslation() {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    const handler = () => {
      setLang(getInitialLang());
    };
    window.addEventListener("mera:langchange", handler);
    return () => window.removeEventListener("mera:langchange", handler);
  }, []);

  const messages = all[lang] || all.fr;

  const t = (path, fallback) => {
    const keys = path.split(".");
    let val = messages;
    for (const k of keys) {
      if (val && typeof val === "object" && k in val) val = val[k];
      else return fallback || path;
    }
    return typeof val === "string" ? val : fallback || path;
  };

  return { t, lang };
}
