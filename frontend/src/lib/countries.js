// Utilitaires pour afficher les pays d'origine des traitements traditionnels.
// Mappage : code pays ISO 2 lettres → emoji drapeau + nom français.

export const COUNTRY_FLAGS = {
  // Afrique
  DZ: '🇩🇿', AO: '🇦🇴', BJ: '🇧🇯', BW: '🇧🇼', BF: '🇧🇫', BI: '🇧🇮', CM: '🇨🇲',
  CV: '🇨🇻', CF: '🇨🇫', TD: '🇹🇩', KM: '🇰🇲', CG: '🇨🇬', CD: '🇨🇩', CI: '🇨🇮',
  DJ: '🇩🇯', EG: '🇪🇬', GQ: '🇬🇶', ER: '🇪🇷', SZ: '🇸🇿', ET: '🇪🇹', GA: '🇬🇦',
  GM: '🇬🇲', GH: '🇬🇭', GN: '🇬🇳', GW: '🇬🇼', KE: '🇰🇪', LS: '🇱🇸', LR: '🇱🇷',
  LY: '🇱🇾', MG: '🇲🇬', MW: '🇲🇼', ML: '🇲🇱', MR: '🇲🇷', MU: '🇲🇺', MA: '🇲🇦',
  MZ: '🇲🇿', NA: '🇳🇦', NE: '🇳🇪', NG: '🇳🇬', RW: '🇷🇼', ST: '🇸🇹', SN: '🇸🇳',
  SC: '🇸🇨', SL: '🇸🇱', SO: '🇸🇴', ZA: '🇿🇦', SS: '🇸🇸', SD: '🇸🇩', TZ: '🇹🇿',
  TG: '🇹🇬', TN: '🇹🇳', UG: '🇺🇬', ZM: '🇿🇲', ZW: '🇿🇼',
  // Amériques
  AG: '🇦🇬', AR: '🇦🇷', BS: '🇧🇸', BB: '🇧🇧', BZ: '🇧🇿', BO: '🇧🇴', BR: '🇧🇷',
  CA: '🇨🇦', CL: '🇨🇱', CO: '🇨🇴', CR: '🇨🇷', CU: '🇨🇺', DM: '🇩🇲', DO: '🇩🇴',
  EC: '🇪🇨', SV: '🇸🇻', GD: '🇬🇩', GT: '🇬🇹', GY: '🇬🇾', HT: '🇭🇹', HN: '🇭🇳',
  JM: '🇯🇲', MX: '🇲🇽', NI: '🇳🇮', PA: '🇵🇦', PY: '🇵🇾', PE: '🇵🇪', KN: '🇰🇳',
  LC: '🇱🇨', VC: '🇻🇨', TT: '🇹🇹', US: '🇺🇸', UY: '🇺🇾', VE: '🇻🇪',
  // Asie
  AF: '🇦🇫', AM: '🇦🇲', AZ: '🇦🇿', BH: '🇧🇭', BD: '🇧🇩', BT: '🇧🇹', BN: '🇧🇳',
  KH: '🇰🇭', CN: '🇨🇳', CY: '🇨🇾', GE: '🇬🇪', IN: '🇮🇳', ID: '🇮🇩', IR: '🇮🇷',
  IQ: '🇮🇶', IL: '🇮🇱', JP: '🇯🇵', JO: '🇯🇴', KZ: '🇰🇿', KW: '🇰🇼', KG: '🇰🇬',
  LA: '🇱🇦', LB: '🇱🇧', MY: '🇲🇾', MV: '🇲🇻', MN: '🇲🇳', MM: '🇲🇲', NP: '🇳🇵',
  KP: '🇰🇵', OM: '🇴🇲', PK: '🇵🇰', PS: '🇵🇸', PH: '🇵🇭', QA: '🇶🇦', SA: '🇸🇦',
  SG: '🇸🇬', KR: '🇰🇷', LK: '🇱🇰', SY: '🇸🇾', TW: '🇹🇼', TJ: '🇹🇯', TH: '🇹🇭',
  TR: '🇹🇷', TM: '🇹🇲', AE: '🇦🇪', UZ: '🇺🇿', VN: '🇻🇳', YE: '🇾🇪',
  // Europe
  AL: '🇦🇱', AD: '🇦🇩', AT: '🇦🇹', BY: '🇧🇾', BE: '🇧🇪', BA: '🇧🇦', BG: '🇧🇬',
  HR: '🇭🇷', CZ: '🇨🇿', DK: '🇩🇰', EE: '🇪🇪', FI: '🇫🇮', FR: '🇫🇷', DE: '🇩🇪',
  GR: '🇬🇷', HU: '🇭🇺', IS: '🇮🇸', IE: '🇮🇪', IT: '🇮🇹', LV: '🇱🇻', LI: '🇱🇮',
  LT: '🇱🇹', LU: '🇱🇺', MT: '🇲🇹', MD: '🇲🇩', MC: '🇲🇨', ME: '🇲🇪', NL: '🇳🇱',
  MK: '🇲🇰', NO: '🇳🇴', PL: '🇵🇱', PT: '🇵🇹', RO: '🇷🇴', RU: '🇷🇺', SM: '🇸🇲',
  RS: '🇷🇸', SK: '🇸🇰', SI: '🇸🇮', ES: '🇪🇸', SE: '🇸🇪', CH: '🇨🇭', UA: '🇺🇦',
  GB: '🇬🇧', VA: '🇻🇦',
  // Océanie
  AU: '🇦🇺', FJ: '🇫🇯', NZ: '🇳🇿', PG: '🇵🇬', SB: '🇸🇧', VU: '🇻🇺', WS: '🇼🇸',
};

export const COUNTRY_NAMES = {
  // Afrique
  DZ: 'Algérie', AO: 'Angola', BJ: 'Bénin', BW: 'Botswana', BF: 'Burkina Faso',
  BI: 'Burundi', CM: 'Cameroun', CV: 'Cap-Vert', CF: 'République centrafricaine',
  TD: 'Tchad', KM: 'Comores', CG: 'Congo', CD: 'RD Congo', CI: 'Côte d\'Ivoire',
  DJ: 'Djibouti', EG: 'Égypte', GQ: 'Guinée équatoriale', ER: 'Érythrée',
  SZ: 'Eswatini', ET: 'Éthiopie', GA: 'Gabon', GM: 'Gambie', GH: 'Ghana',
  GN: 'Guinée', GW: 'Guinée-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia',
  LY: 'Libye', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritanie',
  MU: 'Maurice', MA: 'Maroc', MZ: 'Mozambique', NA: 'Namibie', NE: 'Niger',
  NG: 'Nigéria', RW: 'Rwanda', ST: 'Sao Tomé', SN: 'Sénégal', SC: 'Seychelles',
  SL: 'Sierra Leone', SO: 'Somalie', ZA: 'Afrique du Sud', SS: 'Soudan du Sud',
  SD: 'Soudan', TZ: 'Tanzanie', TG: 'Togo', TN: 'Tunisie', UG: 'Ouganda',
  ZM: 'Zambie', ZW: 'Zimbabwe',
  // Amériques
  AG: 'Antigua', AR: 'Argentine', BS: 'Bahamas', BB: 'Barbade', BZ: 'Belize',
  BO: 'Bolivie', BR: 'Brésil', CA: 'Canada', CL: 'Chili', CO: 'Colombie',
  CR: 'Costa Rica', CU: 'Cuba', DM: 'Dominique', DO: 'République dominicaine',
  EC: 'Équateur', SV: 'Salvador', GD: 'Grenade', GT: 'Guatemala', GY: 'Guyana',
  HT: 'Haïti', HN: 'Honduras', JM: 'Jamaïque', MX: 'Mexique', NI: 'Nicaragua',
  PA: 'Panama', PY: 'Paraguay', PE: 'Pérou', KN: 'Saint-Kitts', LC: 'Sainte-Lucie',
  VC: 'Saint-Vincent', TT: 'Trinité-et-Tobago', US: 'États-Unis', UY: 'Uruguay',
  VE: 'Venezuela',
  // Asie
  AF: 'Afghanistan', AM: 'Arménie', AZ: 'Azerbaïdjan', BH: 'Bahreïn',
  BD: 'Bangladesh', BT: 'Bhoutan', BN: 'Brunei', KH: 'Cambodge', CN: 'Chine',
  CY: 'Chypre', GE: 'Géorgie', IN: 'Inde', ID: 'Indonésie', IR: 'Iran',
  IQ: 'Irak', IL: 'Israël', JP: 'Japon', JO: 'Jordanie', KZ: 'Kazakhstan',
  KW: 'Koweït', KG: 'Kirghizistan', LA: 'Laos', LB: 'Liban', MY: 'Malaisie',
  MV: 'Maldives', MN: 'Mongolie', MM: 'Myanmar', NP: 'Népal', KP: 'Corée du Nord',
  OM: 'Oman', PK: 'Pakistan', PS: 'Palestine', PH: 'Philippines', QA: 'Qatar',
  SA: 'Arabie saoudite', SG: 'Singapour', KR: 'Corée du Sud', LK: 'Sri Lanka',
  SY: 'Syrie', TW: 'Taïwan', TJ: 'Tadjikistan', TH: 'Thaïlande', TR: 'Turquie',
  TM: 'Turkménistan', AE: 'Émirats arabes unis', UZ: 'Ouzbékistan', VN: 'Vietnam',
  YE: 'Yémen',
  // Europe
  AL: 'Albanie', AD: 'Andorre', AT: 'Autriche', BY: 'Biélorussie',
  BE: 'Belgique', BA: 'Bosnie-Herzégovine', BG: 'Bulgarie', HR: 'Croatie',
  CZ: 'Tchéquie', DK: 'Danemark', EE: 'Estonie', FI: 'Finlande', FR: 'France',
  DE: 'Allemagne', GR: 'Grèce', HU: 'Hongrie', IS: 'Islande', IE: 'Irlande',
  IT: 'Italie', LV: 'Lettonie', LI: 'Liechtenstein', LT: 'Lituanie',
  LU: 'Luxembourg', MT: 'Malte', MD: 'Moldavie', MC: 'Monaco', ME: 'Monténégro',
  NL: 'Pays-Bas', MK: 'Macédoine du Nord', NO: 'Norvège', PL: 'Pologne',
  PT: 'Portugal', RO: 'Roumanie', RU: 'Russie', SM: 'Saint-Marin', RS: 'Serbie',
  SK: 'Slovaquie', SI: 'Slovénie', ES: 'Espagne', SE: 'Suède', CH: 'Suisse',
  UA: 'Ukraine', GB: 'Royaume-Uni', VA: 'Vatican',
  // Océanie
  AU: 'Australie', FJ: 'Fidji', NZ: 'Nouvelle-Zélande', PG: 'Papouasie-Nlle-Guinée',
  SB: 'Îles Salomon', VU: 'Vanuatu', WS: 'Samoa',
};

// Retourne l'emoji drapeau ou null si le code est inconnu.
export const flagFor = (countryCode) => {
  if (!countryCode) return null;
  const code = countryCode.trim().toUpperCase();
  return COUNTRY_FLAGS[code] || null;
};

// Retourne le drapeau + nom ex: "🇰🇪 Kenya", ou juste le pays si inconnu.
export const formatCountry = (countryCode) => {
  if (!countryCode) return '';
  const code = countryCode.trim().toUpperCase();
  const flag = COUNTRY_FLAGS[code];
  const name = COUNTRY_NAMES[code];
  if (flag) return `${flag} ${name || code}`;
  return name || code;
};
