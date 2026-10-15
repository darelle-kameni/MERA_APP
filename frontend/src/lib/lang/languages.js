// Registre des langues de l'application.
//
// `available: true` => un fichier de traduction existe dans lib/lang/ et est
// chargé par index.js. Toutes les autres langues sont répertoriées pour la
// feuille de route de traduction : il suffit de créer le fichier correspondant
// (même clés que fr.js) puis de passer `available` à true et de l'importer dans
// index.js. Tant qu'une clé est absente, l'application retombe sur le français.
//
// Le `code` est l'identifiant interne utilisé par localStorage ("mera_lang").
// `iso` est le code ISO 639-3 de référence (indicatif).
export const LANGUAGES = [
  { code: "fr", name: "Français", native: "Français", iso: "fra", region: "Officiel", available: true },
  { code: "en", name: "Anglais", native: "English", iso: "eng", region: "Officiel", available: true },

  // Langues nationales / véhiculaires les plus répandues
  { code: "ff", name: "Fulfulde", native: "Fulfulde", iso: "fub", region: "Nord / Adamaoua / Extrême-Nord", available: true },
  { code: "ew", name: "Ewondo", native: "Ewondo", iso: "ewo", region: "Centre / Sud / Est", available: true },

  { code: "dua", name: "Douala", native: "Duálá", iso: "dua", region: "Littoral", available: false },
  { code: "bas", name: "Basaa", native: "Basaa", iso: "bas", region: "Centre / Littoral", available: false },
  { code: "byv", name: "Medumba", native: "Mədʉmba", iso: "byv", region: "Ouest (Bangangté)", available: false },
  { code: "bax", name: "Bamoun", native: "Shüpamom", iso: "bax", region: "Ouest (Foumban)", available: false },
  { code: "bbj", name: "Ghomala'", native: "Ghomálá'", iso: "bbj", region: "Ouest (Bafoussam)", available: false },
  { code: "ybb", name: "Yemba", native: "Yemba", iso: "ybb", region: "Ouest (Dschang)", available: false },
  { code: "fek", name: "Fe'fe'", native: "Fe'éfe'é", iso: "fek", region: "Ouest (Bafang)", available: false },
  { code: "nnh", name: "Ngiemboon", native: "Ngiembɔɔn", iso: "nnh", region: "Ouest (Bangangté)", available: false },
  { code: "jgo", name: "Ngomba", native: "Ngomba", iso: "jgo", region: "Ouest", available: false },
  { code: "mgo", name: "Meta'", native: "Meta'", iso: "mgo", region: "Nord-Ouest", available: false },
  { code: "bfd", name: "Bafut", native: "Befang", iso: "bfd", region: "Nord-Ouest", available: false },
  { code: "mhk", name: "Mungaka", native: "Mungaka", iso: "mhk", region: "Nord-Ouest (Bali)", available: false },
  { code: "eto", name: "Eton", native: "Eton", iso: "eto", region: "Centre", available: false },
  { code: "mkk", name: "Maka", native: "Maka", iso: "mkk", region: "Est", available: false },
  { code: "mcp", name: "Makaa", native: "Məkaa", iso: "mcp", region: "Est", available: false },
  { code: "nmg", name: "Kwasio", native: "Kwasio", iso: "nmg", region: "Sud", available: false },
  { code: "kkj", name: "Kako", native: "Kako", iso: "kkj", region: "Est", available: false },
  { code: "tui", name: "Tupuri", native: "Tupuri", iso: "tui", region: "Extrême-Nord", available: false },
  { code: "mua", name: "Mundang", native: "Mundang", iso: "mua", region: "Extrême-Nord", available: false },
  { code: "maf", name: "Mafa", native: "Mafa", iso: "maf", region: "Extrême-Nord", available: false },
  { code: "mcn", name: "Massa", native: "Massa", iso: "mcn", region: "Extrême-Nord", available: false },
  { code: "kau", name: "Kanuri", native: "Kanuri", iso: "kau", region: "Extrême-Nord", available: false },
  { code: "shu", name: "Arabe choad", native: "العربية", iso: "shu", region: "Extrême-Nord", available: false },
  { code: "wes", name: "Pidgin (Kamtok)", native: "Pidgin", iso: "wes", region: "Nord-Ouest / Sud-Ouest", available: false },
  { code: "bkc", name: "Baka", native: "Baka", iso: "bkc", region: "Sud / Est", available: false },
];

export const getLanguage = (code) => LANGUAGES.find((l) => l.code === code) || null;

export const availableLanguages = () => LANGUAGES.filter((l) => l.available);

export default LANGUAGES;
