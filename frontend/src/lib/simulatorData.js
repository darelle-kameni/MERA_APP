// Generates realistic simulated vital signs data
export function generateVitals(isChild = false) {
  const baseTemp = isChild ? 37.2 : 36.8;
  const baseSpo2 = isChild ? 97 : 98;
  const baseHR = isChild ? 110 : 75;
  const baseWeight = isChild ? 18 : 65;

  return {
    temperature: +(baseTemp + (Math.random() - 0.3) * 2.5).toFixed(1),
    spo2: Math.max(85, Math.min(100, Math.round(baseSpo2 + (Math.random() - 0.4) * 8))),
    heart_rate: Math.max(50, Math.min(180, Math.round(baseHR + (Math.random() - 0.5) * 40))),
    weight: +(baseWeight + (Math.random() - 0.5) * 6).toFixed(1),
  };
}

// Simulated systemic predictions
export const SIMULATED_SYSTEMIC = [
  { disease: "Paludisme grave", probability: 78, severity: "eleve", trigger_factors: "Fièvre élevée, zone endémique, SpO2 basse" },
  { disease: "Anémie", probability: 65, severity: "modere", trigger_factors: "Pâleur conjonctivale, fatigue chronique" },
  { disease: "Typhoïde", probability: 42, severity: "modere", trigger_factors: "Fièvre prolongée, douleurs abdominales" },
  { disease: "Tuberculose", probability: 15, severity: "faible", trigger_factors: "Toux persistante" },
  { disease: "Insuffisance respiratoire", probability: 12, severity: "faible", trigger_factors: "SpO2 légèrement basse" },
  { disease: "Malnutrition sévère", probability: 55, severity: "eleve", trigger_factors: "IMC faible, âge pédiatrique" },
];

// Simulated eye results
export const SIMULATED_CONTAGIOUS_EYE = {
  conjunctivitis_bacterial: 72,
  conjunctivitis_viral: 18,
  trachoma: 45,
  blepharitis_infectious: 8,
  contagion_alert: true,
};

export const SIMULATED_NON_CONTAGIOUS_EYE = {
  cataract: 5,
  pterygion: 12,
  uveitis: 3,
  jaundice: 38,
  myopia: 22,
  glaucoma: 4,
  diabetic_retinopathy: 2,
};

// Eye test images (public domain medical images)
export const TEST_EYE_IMAGES = [
  "https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1559076294-ad5d5e2a8291?w=400&h=300&fit=crop",
];

// Simulated vocal exchanges
export const SIMULATED_CONVERSATION = [
  { speaker: "robot", text: "Bonjour ! Je suis MERA, votre assistant médical. Comment vous sentez-vous aujourd'hui ?" },
  { speaker: "patient", text: "Je ne me sens pas bien, j'ai de la fièvre depuis 3 jours." },
  { speaker: "robot", text: "Je comprends. Depuis combien de temps avez-vous cette fièvre ? Avez-vous d'autres symptômes ?" },
  { speaker: "patient", text: "Oui, j'ai aussi des maux de tête et des douleurs dans tout le corps." },
  { speaker: "robot", text: "Merci. Avez-vous des nausées ou des vomissements ?" },
  { speaker: "patient", text: "Oui, un peu de nausées le matin." },
  { speaker: "robot", text: "D'accord. Je vais maintenant mesurer vos signes vitaux. Restez immobile s'il vous plaît..." },
  { speaker: "robot", text: "Mesures terminées. Votre température est de 39.2°C, SpO2 à 95%, fréquence cardiaque à 98 bpm. Je détecte des signes compatibles avec le paludisme. Je recommande une consultation médicale urgente." },
];

export const TRADITIONAL_TREATMENTS_DATA = [
  {
    disease: "Paludisme grave",
    plant_name_fr: "Artemisia annua (Armoise annuelle)",
    plant_name_local: "Njangsang ya malariya",
    part_used: "Feuilles séchées",
    preparation: "Infusion : faire bouillir 5g de feuilles séchées dans 1 litre d'eau pendant 15 minutes. Filtrer et laisser refroidir.",
    dosage_adult: "1 verre (250ml) 3 fois par jour pendant 7 jours",
    dosage_child: "1/2 verre (125ml) 2 fois par jour pendant 5 jours (enfants > 5 ans)",
    precautions: "Ne pas utiliser chez la femme enceinte. Ne pas dépasser la dose recommandée. Consulter un médecin si les symptômes persistent après 48h.",
    max_severity: "modere",
  },
  {
    disease: "Insuffisance respiratoire",
    plant_name_fr: "Eucalyptus (Eucalyptus globulus)",
    plant_name_local: "Mbongo moto",
    part_used: "Feuilles fraîches",
    preparation: "Inhalation : faire bouillir une poignée de feuilles dans 2L d'eau. Inhaler la vapeur pendant 10 minutes, tête couverte d'un linge.",
    dosage_adult: "2 à 3 inhalations par jour",
    dosage_child: "1 inhalation par jour sous surveillance d'un adulte (enfants > 6 ans)",
    precautions: "Éviter le contact direct de la vapeur trop chaude avec le visage. Ne pas utiliser chez les asthmatiques sans avis médical.",
    max_severity: "modere",
  },
  {
    disease: "Anémie",
    plant_name_fr: "Moringa oleifera (Moringa)",
    plant_name_local: "Gawayi / Zogalé",
    part_used: "Feuilles fraîches ou poudre de feuilles",
    preparation: "Ajouter 2 cuillères à soupe de poudre de feuilles de Moringa dans la bouillie, la sauce ou le jus. Peut aussi être consommé en salade.",
    dosage_adult: "2 cuillères à soupe par jour dans l'alimentation",
    dosage_child: "1 cuillère à café par jour mélangée dans la bouillie",
    precautions: "Commencer par de petites doses pour éviter les troubles digestifs. Complément alimentaire, ne remplace pas un traitement médical en cas d'anémie sévère.",
    max_severity: "modere",
  },
  {
    disease: "Conjonctivite bactérienne",
    plant_name_fr: "Aloe vera (Aloès)",
    plant_name_local: "Tandalé / Aloe",
    part_used: "Gel des feuilles",
    preparation: "Extraire le gel transparent de la feuille d'Aloe vera. Diluer dans de l'eau stérile bouillie et refroidie (1 part gel pour 3 parts eau). Filtrer soigneusement.",
    dosage_adult: "2-3 gouttes dans chaque œil, 3 fois par jour pendant 5 jours",
    dosage_child: "1-2 gouttes dans chaque œil, 2 fois par jour",
    precautions: "Utiliser uniquement de l'eau bouillie et refroidie. S'assurer qu'aucune impureté ne reste. Arrêter en cas d'irritation. Consulter si pas d'amélioration en 48h.",
    max_severity: "faible",
  },
  {
    disease: "Typhoïde",
    plant_name_fr: "Neem (Azadirachta indica)",
    plant_name_local: "Dongoyaro / Nim",
    part_used: "Feuilles et écorce",
    preparation: "Décoction : faire bouillir 10g de feuilles et 5g d'écorce dans 1.5L d'eau pendant 20 minutes. Filtrer.",
    dosage_adult: "1 verre (200ml) 2 fois par jour pendant 7 jours",
    dosage_child: "1/2 verre 1 fois par jour (enfants > 8 ans uniquement)",
    precautions: "Goût très amer. Ne pas utiliser chez la femme enceinte ou allaitante. Peut provoquer des nausées. Ne remplace pas les antibiotiques en cas de typhoïde confirmée.",
    max_severity: "modere",
  },
  {
    disease: "Fièvre",
    plant_name_fr: "Gingembre + Citron",
    plant_name_local: "Njinja / Citroné",
    part_used: "Racine de gingembre + fruit du citron",
    preparation: "Râper un morceau de gingembre (3cm) dans 500ml d'eau chaude. Ajouter le jus d'un citron et une cuillère de miel. Laisser infuser 10 minutes.",
    dosage_adult: "1 tasse 3 fois par jour",
    dosage_child: "1/2 tasse 2 fois par jour (enfants > 3 ans)",
    precautions: "Éviter si ulcère gastrique. Le miel est déconseillé aux enfants de moins de 1 an.",
    max_severity: "faible",
  },
];