import fr from "./fr.js";
import en from "./en.js";
import ff from "./ff.js";
import ew from "./ew.js";

// Pour ajouter une langue : créer lib/lang/<code>.js (mêmes clés que fr.js),
// l'importer ici, puis passer `available: true` dans languages.js.
export const MESSAGES = { fr, en, ff, ew };

export default MESSAGES;
