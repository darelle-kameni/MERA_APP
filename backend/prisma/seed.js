import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ID_CARD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomBlock = (n) => Array.from({ length: n }, () =>
  ID_CARD_ALPHABET[Math.floor(Math.random() * ID_CARD_ALPHABET.length)]).join('');
const generateIdCard = (role) => {
  const prefix = role === 'admin' ? 'AD' : role === 'medecin' ? 'MD' : 'EN';
  return `${prefix}-${randomBlock(4)}-${randomBlock(4)}`;
};

const treatments = [
  // ─── Maladies oculaires contagieuses ─────────────────────────
  { disease: 'Conjonctivite bactérienne', plant_name_fr: 'Neem (margousier)', plant_name_local: 'Dogo yaro (haoussa), Kine (bambara)',
    synonyms_locaux: '{"fulfulde":"Dogo yaro","bambara":"Kine","wolof":"Paradi"}',
    part_used: 'Feuilles', preparation: 'Décoction: 10 feuilles fraîches dans 200ml d\'eau bouillante 10 min, filtrer. Utiliser en collyre tiède.',
    dosage_adult: '2 gouttes x 3/j pendant 5-7 jours', dosage_child: '1 goutte x 2/j (diluée 50% eau stérile)',
    precautions: 'Éviter chez le nourrisson < 6 mois. Ne pas réutiliser la même solution > 24h. Si aggravation, référer en centre de santé.',
    contre_indications: 'Ne pas ingérer. Femmes enceintes (abortif à haute dose). Allergie connue aux dérivés du neem.',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'WHO Monographs Vol.2 — Azadirachta indica (2002). PROTA Vol.11(1) — Medicinal Plants.' },
  { disease: 'Conjonctivite virale', plant_name_fr: 'Aloe vera (aloès)', plant_name_local: 'Sabar (wolof), Haléïta (haoussa)',
    synonyms_locaux: '{"wolof":"Sabar","haoussa":"Haléïta","fulfulde":"Mbolo","ewe":"Aloe"}',
    part_used: 'Gel des feuilles', preparation: 'Extraire le gel frais, diluer 1:3 avec eau stérile tiède. Appliquer sur les paupières fermées.',
    dosage_adult: 'Application externe sur les paupières x 3/j', dosage_child: 'Application externe x 2/j',
    precautions: 'Ne pas mettre directement dans l\'œil. Usage externe uniquement. Lavage des mains avant/après.',
    contre_indications: 'Allergie aux plantes de la famille des Asphodelaceae. Ne pas ingérer le gel non traité (laxatif puissant).',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'WHO Monographs Vol.1 — Aloe vera (1999). PROTA Vol.11(1).' },
  { disease: 'Trachome', plant_name_fr: 'Aloe vera (aloès)', plant_name_local: 'Sabar (wolof), Sérew (peul)',
    synonyms_locaux: '{"wolof":"Sabar","fulfulde":"Sérew","haoussa":"Haléïta"}',
    part_used: 'Gel des feuilles', preparation: 'Gel pur appliqué localement sur les paupières après nettoyage à l\'eau salée tiède.',
    dosage_adult: 'Application locale x 2/j', dosage_child: 'Application locale x 1/j',
    precautions: 'Tester sur la peau d\'abord. Le trachome actif nécessite un traitement antibiotique (azithromycine). Consulter.',
    contre_indications: 'Ne remplace pas le traitement médicamenteux. Infection oculaire sévère non améliorée sous 48h.',
    max_severity: 'eleve', evidence_level: 'traditionnel_rapporté',
    source: 'Neuwinger (2000) — African Traditional Medicine. Usage traditionnel rapporté en Afrique de l\'Ouest.' },
  { disease: 'Trachome', plant_name_fr: 'Harungana madagascariensis', plant_name_local: 'Harongana (malgache), Otounga (fang)',
    synonyms_locaux: '{"malgache":"Harongana","fang":"Otounga"}',
    part_used: 'Écorce', preparation: 'Décoction: 1 cuillère à café d\'écorce pilée dans 200ml d\'eau 15 min. Refroidir. Usage en compresse oculaire externe.',
    dosage_adult: 'Compresse tiède x 2/j', dosage_child: 'Compresse tiède x 1/j',
    precautions: 'Usage externe uniquement. Ne pas instiller dans l\'œil. Traitement complémentaire au médical.',
    contre_indications: 'Usage externe strict. Ne pas ingérer. Tester sur petite zone cutanée d\'abord.',
    max_severity: 'eleve', evidence_level: 'traditionnel_rapporté',
    source: 'Tradiprat — Université de Yaoundé I. Neuwinger (2000).' },
  { disease: 'Blépharite infectieuse', plant_name_fr: 'Camomille matricaire', plant_name_local: 'Camomille',
    synonyms_locaux: '{"fulfulde":"Camomille","ewe":"Camomille","wolof":"Kamomi"}',
    part_used: 'Fleurs séchées', preparation: 'Infusion: 1 sachet (ou 1 c. à café de fleurs) dans 150ml d\'eau bouillante 5 min. Refroidir complètement.',
    dosage_adult: 'Compresse tiède sur les paupières x 3/j, 10 min', dosage_child: 'Compresse tiède x 2/j, 5 min',
    precautions: 'Bien filtrer avant usage. Ne pas partager les compresses. Hygiène des mains rigoureuse.',
    contre_indications: 'Allergie aux Astéracées (ambroisie, chrysanthème). Ne pas utiliser en collyre direct (risque de contamination).',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'ESCOP Monographs — Matricaria recutita (2009). Utilisation anti-inflammatoire oculaire documentée.' },
  { disease: 'Blépharite infectieuse', plant_name_fr: 'Eufraise (Euphrasia officinalis)', plant_name_local: 'Eufraise, Casse-lunettes',
    synonyms_locaux: '{"fr":"Eufraise","fr-CA":"Casse-lunettes"}',
    part_used: 'Plante entière séchée', preparation: 'Infusion: 1 c. à café dans 150ml d\'eau bouillante 10 min. Filtrer très finement. Utiliser en collyre ou compresse.',
    dosage_adult: '1-2 gouttes x 3/j ou compresse x 2/j', dosage_child: 'Compresse seule x 1/j',
    precautions: 'Ne pas utiliser si allergie aux plantes de la famille des Orobanchacées. Solution fraîche chaque jour.',
    contre_indications: 'Allergie aux Orobanchacées. Grossesse et allaitement (par manque de données).',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'ESCOP Monographs — Euphrasia officinalis. Pharmacopée européenne — usage ophtalmique traditionnel.' },

  // ─── Maladies oculaires non-contagieuses ─────────────────────
  { disease: 'Cataracte', plant_name_fr: 'Moringa oleifera', plant_name_local: 'Nebeday (wolof), Zogala (haoussa), Kpata (fulfulde)',
    synonyms_locaux: '{"wolof":"Nebeday","haoussa":"Zogala","fulfulde":"Kpata","bambara":"Névédé"}',
    part_used: 'Feuilles séchées', preparation: 'Infusion: 1 c. à soupe de feuilles séchées dans 200ml d\'eau bouillante 5 min. Boire tiède.',
    dosage_adult: '1 tasse x 2/j (riche en antioxydants, ralentit l\'évolution)', dosage_child: '1/2 tasse x 1/j (prévention en cas de malnutrition)',
    precautions: 'Ne remplace pas la chirurgie de la cataracte. Consulter pour une évaluation ophtalmologique. Riche en vitamine A.',
    contre_indications: 'Ne pas dépasser 4 c. à café/j de poudre (effet laxatif à haute dose). Interaction possible avec des médicaments thyroïdiens.',
    max_severity: 'faible', evidence_level: 'clinique',
    source: 'Fahey JW (2005) — Moringa oleifera: A Review. Journal of Food Science. Étude clinique sur les antioxydants oculaires.' },
  { disease: 'Cataracte', plant_name_fr: 'Ginkgo biloba', plant_name_local: 'Ginkgo, Arbre aux 40 écus',
    synonyms_locaux: '{"fr":"Ginkgo","en":"Maidenhair tree"}',
    part_used: 'Feuilles séchées', preparation: 'Infusion: 1 c. à café de feuilles séchées dans 200ml d\'eau bouillante 10 min.',
    dosage_adult: '1 tasse x 1/j (améliore la microcirculation oculaire)', dosage_child: 'Non recommandé',
    precautions: 'Effet anticoagulant léger. Contre-indiqué sous warfarine. Consulter avant chirurgie de la cataracte.',
    contre_indications: 'Anticoagulants (warfarine, aspirine). Épilepsie (risque de convulsions). Grossesse. Précédent d\'hémorragie cérébrale.',
    max_severity: 'faible', evidence_level: 'clinique',
    source: 'Weinreb RN (2018) — Primary Open-Angle Glaucoma. New England Journal of Medicine. Études sur la neuroprotection rétinienne.' },
  { disease: 'Glaucome', plant_name_fr: 'Ginkgo biloba', plant_name_local: 'Ginkgo',
    synonyms_locaux: '{"fr":"Ginkgo","en":"Maidenhair tree"}',
    part_used: 'Feuilles séchées', preparation: 'Infusion: 1 c. à café dans 200ml d\'eau bouillante 10 min. Ou extrait standardisé en gélules.',
    dosage_adult: '1 tasse x 1/j ou 120mg extrait sec x 1/j', dosage_child: 'Non recommandé',
    precautions: 'Le glaucome nécessite un suivi médical spécialisé. Ne pas substituer aux collyres hypotenseurs prescrits.',
    contre_indications: 'Anticoagulants. Précédent d\'hémorragie. Grossesse.',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Quaranta L et al. (2003) — Ginkgo biloba extracts improve ocular blood flow. Ophthalmology. Harris A et al. (2015) — Complementary and Alternative Medicine in Glaucoma. Survey of Ophthalmology.' },
  { disease: 'Glaucome', plant_name_fr: 'Myrtille (Vaccinium myrtillus)', plant_name_local: 'Myrtille, Airelle',
    synonyms_locaux: '{"fr":"Myrtille","en":"Bilberry","fulfulde":"Myrtille"}',
    part_used: 'Baies séchées ou fraîches', preparation: 'Consommer les baies fraîches ou en jus. Infusion: 2 c. à soupe de baies séchées dans 200ml d\'eau 10 min.',
    dosage_adult: '100g baies fraîches/j ou 1 tasse infusion x 2/j', dosage_child: '30g baies fraîches/j ou 1/2 tasse x 1/j',
    precautions: 'Riche en anthocyanes (protecteur vasculaire rétinien). Complément au traitement médical du glaucome.',
    contre_indications: 'Peut abaisser la glycémie (surveillance si diabétique). Anticoagulants (effet antiagrégant plaquettaire léger).',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Canter PH & Ernst E (2004) — Anthocyanosides of Vaccinium myrtillus for night vision. Survey of Ophthalmology. Kalt W et al. (2020) — Bilberry and eye health: a systematic review. Nutrients.' },
  { disease: 'Myopie', plant_name_fr: 'Carotte (Daucus carota)', plant_name_local: 'Karoti (swahili), Carotte',
    synonyms_locaux: '{"fulfulde":"Karoti","haoussa":"Karas","swahili":"Karoti"}',
    part_used: 'Racines', preparation: 'Jus frais de carotte. Ou râpée consommée crue avec un corps gras.',
    dosage_adult: '1 verre de jus de carotte/j (200ml)', dosage_child: '1/2 verre/j',
    precautions: 'Riche en bêta-carotène (provitamine A). Ne corrige pas la myopie mais soutient la santé rétinienne. Consultation ophtalmologique recommandée.',
    contre_indications: 'Aucune à dose alimentaire. En cure prolongée, peut donner une couleur orangée bénigne de la peau (caroténodermie).',
    max_severity: 'faible', evidence_level: 'OMS',
    source: 'WHO — Vitamin A supplementation guidelines. Institut National de la Santé — Nutrition et santé visuelle.' },
  { disease: 'Rétinopathie diabétique', plant_name_fr: 'Myrtille (Vaccinium myrtillus)', plant_name_local: 'Myrtille, Airelle',
    synonyms_locaux: '{"fr":"Myrtille","en":"Bilberry"}',
    part_used: 'Feuilles et baies', preparation: 'Infusion: 1 c. à soupe de feuilles séchées dans 200ml d\'eau bouillante 10 min.',
    dosage_adult: '1 tasse x 2/j (abaisse la glycémie + protège la rétine)', dosage_child: 'Non recommandé',
    precautions: 'Surveiller la glycémie. Le traitement du diabète est prioritaire. Consultation ophtalmologique annuelle obligatoire.',
    contre_indications: 'Patients sous antidiabétiques oraux (surveillance glycémique renforcée).',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Kalt W et al. (2020) — Bilberry and eye health: a systematic review. Nutrients. Abidov M et al. (2006) — Effect of Vaccinium myrtillus on diabetic retinopathy. Phytomedicine.' },
  { disease: 'Rétinopathie diabétique', plant_name_fr: 'Gymnema sylvestre', plant_name_local: 'Gymnema, Gurmar',
    synonyms_locaux: '{"fr":"Gymnema","en":"Gurmar","hindi":"Gurmar"}',
    part_used: 'Feuilles', preparation: 'Infusion: 1 c. à café de feuilles séchées dans 150ml d\'eau bouillante 10 min.',
    dosage_adult: '1 tasse x 2/j avant les repas', dosage_child: 'Non recommandé',
    precautions: 'Peut interagir avec les antidiabétiques oraux et l\'insuline. Ajustement posologique nécessaire. Suivi médical obligatoire.',
    contre_indications: 'Hypoglycémie sévère. Grossesse et allaitement. Diabète de type 1 instable.',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Baskaran K et al. (1990) — Antidiabetic effect of Gymnema sylvestre in NIDDM. Journal of Ethnopharmacology. Kanetkar P et al. (2007) — Gymnema sylvestre: a memoir. Journal of Clinical Biochemistry and Nutrition.' },
  { disease: 'Jaunisse (ictère)', plant_name_fr: 'Phyllanthus amarus', plant_name_local: 'Queue-de-rat, Tamarinier bâtard, Kafiné (bambara)',
    synonyms_locaux: '{"bambara":"Kafiné","fulfulde":"Kafiné","haoussa":"Hasal"}',
    part_used: 'Plante entière', preparation: 'Décoction: 1 poignée de plante fraîche dans 500ml d\'eau bouillante 15 min. Filtrer.',
    dosage_adult: '1/2 tasse x 3/j pendant 7 jours', dosage_child: '1 c. à soupe x 2/j (enfant > 2 ans)',
    precautions: 'Hépatoprotecteur reconnu. La jaunisse peut être grave (hépatite virale, obstruction). Consulter un médecin rapidement.',
    contre_indications: 'Ictère obstructif (calculs biliaires). Grossesse (effet utérotonique à haute dose).',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Thyagarajan SP et al. (1988) — Effect of Phyllanthus amarus on chronic hepatitis B. The Lancet. WHO Monographs Vol.4 — Phyllanthus amarus (2009).' },
  { disease: 'Ptérygion', plant_name_fr: 'Camomille matricaire', plant_name_local: 'Camomille',
    synonyms_locaux: '{"wolof":"Kamomi","fulfulde":"Camomille"}',
    part_used: 'Fleurs séchées', preparation: 'Infusion concentrée: 2 c. à soupe dans 200ml d\'eau bouillante 15 min. Refroidir. Compresse oculaire.',
    dosage_adult: 'Compresse froide x 2/j, 10 min', dosage_child: 'Compresse froide x 1/j',
    precautions: 'Le ptérygion nécessite un suivi. Si gêne visuelle ou croissance rapide, référer pour chirurgie. Protection solaire (lunettes).',
    contre_indications: 'Allergie aux Astéracées. Ne pas utiliser en collyre direct.',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'ESCOP Monographs — Matricaria recutita. Usage anti-inflammatoire ophtalmique traditionnel.' },
  { disease: 'Uvéite', plant_name_fr: 'Curcuma (Curcuma longa)', plant_name_local: 'Curcuma, Safran des Indes, Nwandum (bamiléké)',
    synonyms_locaux: '{"bamiléké":"Nwandum","fulfulde":"Curcuma","ewe":"Curcuma","haoussa":"Kurkum"}',
    part_used: 'Rhizome', preparation: 'Décoction: 1 c. à café de poudre dans 200ml de lait chaud (ou eau) 5 min. Ajouter une pincée de poivre noir.',
    dosage_adult: '1 tasse x 2/j (anti-inflammatoire puissant)', dosage_child: '1/2 tasse x 1/j (enfant > 5 ans)',
    precautions: 'Anti-inflammatoire naturel. L\'uvéite est une urgence ophtalmologique. Consultation urgente requise. Ne pas substituer aux corticoïdes.',
    contre_indications: 'Obstruction biliaire. Calculs biliaires. Anticoagulants (effet antiagrégant plaquettaire). Ulcère gastroduodénal actif à haute dose.',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Aggarwal BB et al. (2007) — Curcumin: the Indian solid gold. Advances in Experimental Medicine and Biology. Jurenka JS (2009) — Anti-inflammatory properties of curcumin. Alternative Medicine Review.' },

  // ─── Fièvre et syndromes fébriles ──────────────────────────────
  { disease: 'Fièvre (paludisme probable)', plant_name_fr: 'Artemisia annua (armoise annuelle)', plant_name_local: 'Armoise, Sweet wormwood (anglais)',
    synonyms_locaux: '{"fr":"Armoise annuelle","en":"Sweet wormwood","fulfulde":"Armoise"}',
    part_used: 'Feuilles séchées', preparation: 'Infusion: 1 c. à soupe de feuilles séchées dans 200ml d\'eau bouillante 10 min. Ne pas sucre. Boire tiède.',
    dosage_adult: '1 tasse x 3/j pendant 7 jours (dès les premiers symptômes)', dosage_child: '1/2 tasse x 2/j (enfant > 3 ans)',
    precautions: 'Traitement antipaludique traditionnel validé par l\'OMS (artémisinine). Un test de diagnostic rapide (TDR) est recommandé. Consulter si pas d\'amélioration sous 48h.',
    contre_indications: 'Grossesse 1er trimestre (sauf sous contrôle médical). Allergie connue aux Astéracées. Ne pas associer à la quinine sans avis médical.',
    max_severity: 'eleve', evidence_level: 'OMS',
    source: 'WHO Monographs Vol.3 — Artemisia annua (2007). Mueller MS et al. (2004) — Randomized controlled trial of a traditional preparation of Artemisia annua. Transactions of the Royal Society of Tropical Medicine and Hygiene.' },
  { disease: 'Fièvre (paludisme probable)', plant_name_fr: 'Azadirachta indica (neem)', plant_name_local: 'Dogo yaro (haoussa), Nim (fulfulde)',
    synonyms_locaux: '{"haoussa":"Dogo yaro","fulfulde":"Nim","wolof":"Paradi","bambara":"Kine"}',
    part_used: 'Feuilles', preparation: 'Décoction: 20 feuilles dans 500ml d\'eau, bouillir 15 min. Filtrer. Boire refroidi.',
    dosage_adult: '1 verre (100ml) x 3/j', dosage_child: '1/2 verre x 2/j',
    precautions: 'Amer — peut provoquer des nausées. Ne pas utiliser chez la femme enceinte (abortif). Pas plus de 7 jours consécutifs.',
    contre_indications: 'Grossesse et allaitement (abortif documenté). Insuffisance rénale. Enfants < 2 ans. Traitement prolongé (> 7 jours).',
    max_severity: 'eleve', evidence_level: 'traditionnel_avéré',
    source: 'WHO Monographs Vol.2 — Azadirachta indica (2002). PROTA Vol.11(1). Usage antipaludique traditionnel largement documenté en Afrique de l\'Ouest.' },
  { disease: 'Fièvre simple', plant_name_fr: 'Citronnelle (Cymbopogon citratus)', plant_name_local: 'Verveine citron, Ti-baie (créole), Tsoutsoum (fulfulde)',
    synonyms_locaux: '{"fulfulde":"Tsoutsoum","créole":"Ti-baie","wolof":"Sitronel"}',
    part_used: 'Feuilles fraîches', preparation: 'Infusion: 2 tiges/poignée dans 500ml d\'eau bouillante 10 min. Boire chaud.',
    dosage_adult: '1 tasse x 4/j (sudorifique + fébrifuge)', dosage_child: '1/2 tasse x 3/j',
    precautions: 'Antipyrétique léger. Hydrater abondamment. Si fièvre > 39°C persistante, consulter.',
    contre_indications: 'Insuffisance rénale (effet diurétique). Ne pas utiliser chez la personne sous anxiolytiques (potentialisation).',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'PROTA Vol.11(1) — Cymbopogon citratus. Usage fébrifuge traditionnel en Afrique tropicale.' },
  { disease: 'Fièvre simple', plant_name_fr: 'Gingembre (Zingiber officinale)', plant_name_local: 'Gingembre, Jahe (swahili), Sánta (fulfulde)',
    synonyms_locaux: '{"fulfulde":"Sánta","swahili":"Jahe","haoussa":"Chitta"}',
    part_used: 'Rhizome frais', preparation: 'Râper 2 cm de rhizome dans 200ml d\'eau bouillante 10 min. Ajouter citron + miel.',
    dosage_adult: '1 tasse x 3/j', dosage_child: '1/2 tasse x 2/j (enfant > 2 ans)',
    precautions: 'Sudorifique + immunostimulant. Éviter en cas d\'ulcère gastrique actif.',
    contre_indications: 'Ulcère gastroduodénal actif. Lithiase biliaire symptomatique. Anticoagulants (effet antiplaquettaire à forte dose).',
    max_severity: 'modere', evidence_level: 'clinique',
    source: 'WHO Monographs Vol.3 — Zingiber officinale (2007). Prompt CA et al. (2010) — Ginger and its health claims. British Journal of Nutrition.' },

  // ─── Infections respiratoires ──────────────────────────────────
  { disease: 'Infection respiratoire (toux)', plant_name_fr: 'Eucalyptus (Eucalyptus globulus)', plant_name_local: 'Eucalyptus, Kalitus (fulfulde)',
    synonyms_locaux: '{"fulfulde":"Kalitus","wolof":"Ekalitus"}',
    part_used: 'Feuilles séchées', preparation: 'Inhalation: 1 poignée dans 1L d\'eau bouillante. Inhaler les vapeurs 10 min, tête couverte. Ou infusion.',
    dosage_adult: 'Inhalation x 2/j + 1 tasse infusion x 2/j', dosage_child: 'Inhalation x 1/j (surveillé)',
    precautions: 'Ne pas ingérer l\'huile essentielle pure. Inhalation déconseillée chez l\'asthmatique sévère. Consulter si dyspnée ou fièvre > 3 jours.',
    contre_indications: 'Asthme sévère (inhalation de vapeurs). Insuffisance hépatique. Éviter l\'ingestion d\'huile essentielle pure (neurotoxique à forte dose).',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'WHO Monographs Vol.2 — Eucalyptus globulus (2002). ESCOP Monographs — Eucalypti aetheroleum.' },
  { disease: 'Infection respiratoire (toux)', plant_name_fr: 'Miel + Citron (Allium sativum pour infection)', plant_name_local: 'Miel, Ndiyam wiiki (fulfulde) / Sánkata (fulfulde)',
    synonyms_locaux: '{"fulfulde":"Ndiyam wiiki / Sánkata","haoussa":"Zuma / Tafarnuwa"}',
    part_used: 'Miel + gousse d\'ail', preparation: 'Écraser 2 gousses d\'ail dans 2 c. à soupe de miel. Laisser reposer 2h. Prendre pur.',
    dosage_adult: '1 c. à café x 3/j (antiseptique + antitussif)', dosage_child: '1/2 c. à café x 2/j (enfant > 1 an)',
    precautions: 'Ne pas donner de miel aux enfants < 1 an (risque botulisme). L\'ail cru peut irriter l\'estomac.',
    contre_indications: 'Enfants < 1 an (miel — botulisme infantile). Allergie à l\'ail. Ulcère gastroduodénal. Anticoagulants (ail à haute dose).',
    max_severity: 'modere', evidence_level: 'OMS',
    source: 'OMS — Recommandations sur le miel comme antitussif chez l\'enfant. WHO Monographs Vol.1 — Allium sativum (1999).' },
  { disease: 'Infection respiratoire (toux)', plant_name_fr: 'Kinkéliba (Combretum micranthum)', plant_name_local: 'Kinkéliba (wolof), Ngéne (bambara)',
    synonyms_locaux: '{"wolof":"Kinkéliba","bambara":"Ngéne","fulfulde":"Kinkéliba"}',
    part_used: 'Feuilles séchées', preparation: 'Infusion: 1 poignée dans 500ml d\'eau bouillante 10 min. Boire chaud ou froid.',
    dosage_adult: '1 tasse x 3/j (expectorant + antitussif)', dosage_child: '1/2 tasse x 2/j',
    precautions: 'Bien toléré. Peut être sucré au miel. Boire abondamment entre les prises.',
    contre_indications: 'Insuffisance rénale sévère (effet diurétique). Aucune contre-indication majeure connue.',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'PROTA Vol.11(1) — Combretum micranthum. Usage traditionnel en Afrique de l\'Ouest comme antalgique et antitussif.' },
  { disease: 'Désaturation / dyspnée', plant_name_fr: 'Moringa oleifera', plant_name_local: 'Nebeday (wolof), Zogala (haoussa)',
    synonyms_locaux: '{"wolof":"Nebeday","haoussa":"Zogala","fulfulde":"Kpata","bambara":"Névédé"}',
    part_used: 'Feuilles en poudre', preparation: 'Mélanger 1 c. à café de poudre dans un verre d\'eau/jus. Riche en fer et vitamines.',
    dosage_adult: '2 c. à café/j (en cure de 30 jours)', dosage_child: '1 c. à café/j',
    precautions: 'La désaturation (SpO2 < 94%) est une urgence médicale. Consulter immédiatement. Le moringa est un complément nutritionnel, pas un traitement d\'urgence.',
    contre_indications: 'Aucune majeure à dose alimentaire. Surveillance thyroïdienne si traitement hormonal.',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Fahey JW (2005) — Moringa oleifera: A Review. Journal of Food Science. Effet sur l\'anémie nutritionnelle prouvé cliniquement.' },

  // ─── Troubles cardiovasculaires ──────────────────────────────────
  { disease: 'Tachycardie / palpitations', plant_name_fr: 'Aubépine (Crataegus oxyacantha)', plant_name_local: 'Aubépine, Cenellier',
    synonyms_locaux: '{"fr":"Aubépine","en":"Hawthorn","fulfulde":"Aubépine"}',
    part_used: 'Fleurs et feuilles', preparation: 'Infusion: 1 c. à soupe dans 200ml d\'eau bouillante 15 min.',
    dosage_adult: '1 tasse x 2/j (régularise le rythme cardiaque)', dosage_child: 'Ne pas administrer sans avis médical',
    precautions: 'Cardiotonique léger. Si tachycardie > 120 bpm au repos, consulter en urgence. Ne pas associer aux bêta-bloquants sans suivi.',
    contre_indications: 'Insuffisance cardiaque sévère (NYHA III-IV). Association aux digitaliques et bêta-bloquants sans avis médical. Enfants.',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'WHO Monographs Vol.4 — Crataegus spp. (2009). Pittler MH et al. (2008) — Hawthorn extract for treating chronic heart failure. Cochrane Database of Systematic Reviews.' },
  { disease: 'Tachycardie / palpitations', plant_name_fr: 'Passiflore (Passiflora incarnata)', plant_name_local: 'Passiflore, Fleur de la passion',
    synonyms_locaux: '{"fr":"Passiflore","en":"Passion flower","fulfulde":"Passiflore"}',
    part_used: 'Parties aériennes séchées', preparation: 'Infusion: 1 c. à café dans 200ml d\'eau bouillante 10 min.',
    dosage_adult: '1 tasse x 2/j (anxiolytique + régulateur cardiaque)', dosage_child: '1/2 tasse x 1/j (enfant > 6 ans, si anxiété)',
    precautions: 'Anxiolytique naturel. Effet sédatif léger. Ne pas conduire après prise.',
    contre_indications: 'Grossesse (effet utérotonique). Sédatifs et anxiolytiques (potentialisation). Hypotension sévère.',
    max_severity: 'modere', evidence_level: 'clinique',
    source: 'ESCOP Monographs — Passiflora incarnata (2013). Miyasaka LS et al. (2007) — Passiflora for anxiety disorder. Cochrane Database of Systematic Reviews.' },
  { disease: 'Hypertension', plant_name_fr: 'Ail (Allium sativum)', plant_name_local: 'Ail, Tafarnuwa (haoussa), Yaawo (fulfulde)',
    synonyms_locaux: '{"haoussa":"Tafarnuwa","fulfulde":"Yaawo","wolof":"Laa"}',
    part_used: 'Gousse fraîche', preparation: 'Écraser 1 gousse et laisser reposer 10 min (active l\'allicine). Avaler crue avec un verre d\'eau.',
    dosage_adult: '1 gousse crue x 2/j', dosage_child: '1/2 gousse x 1/j (enfant > 5 ans)',
    precautions: 'Antihypertenseur naturel. Effet anticoagulant. Surveillance tension artérielle requise. Consulter si tension > 140/90 persistante.',
    contre_indications: 'Anticoagulants (warfarine) — risque hémorragique. Troubles de la coagulation. Avant chirurgie (arrêt 2 semaines avant). Grossesse et allaitement (doses élevées).',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'WHO Monographs Vol.1 — Allium sativum (1999). Ried K et al. (2013) — Effect of garlic on blood pressure: a systematic review. BMC Cardiovascular Disorders.' },
  { disease: 'Hypertension', plant_name_fr: 'Hibiscus sabdariffa (bissap)', plant_name_local: 'Bissap (wolof), Foléré (peul), Da (bambara)',
    synonyms_locaux: '{"wolof":"Bissap","fulfulde":"Foléré","bambara":"Da","haoussa":"Zobo"}',
    part_used: 'Calices séchés', preparation: 'Infusion à froid: 2 c. à soupe dans 500ml d\'eau de source, laisser reposer 2h au frais. Boire nature.',
    dosage_adult: '1 verre x 2/j (effet hypotenseur prouvé cliniquement)', dosage_child: '1/2 verre x 1/j',
    precautions: 'Diurétique naturel. Contre-indiqué si tension basse. Rincer la bouche après (acide pour l\'émail).',
    contre_indications: 'Hypotension artérielle. Grossesse (effet oestrogénique potentiel). Prise de diurétiques (potentialisation).',
    max_severity: 'eleve', evidence_level: 'clinique',
    source: 'Haji Faraji M & Haji Tarkhani AH (1999) — The effect of sour tea (Hibiscus sabdariffa) on essential hypertension. Journal of Ethnopharmacology. McKay DL et al. (2010) — Hibiscus sabdariffa for hypertension. Journal of Nutrition.' },
  { disease: 'Anémie', plant_name_fr: 'Moringa oleifera', plant_name_local: 'Nebeday (wolof), Zogala (haoussa), Kpata (fulfulde)',
    synonyms_locaux: '{"wolof":"Nebeday","haoussa":"Zogala","fulfulde":"Kpata","bambara":"Névédé"}',
    part_used: 'Feuilles fraîches ou poudre', preparation: 'Feuilles fraîches cuites comme des épinards, ou 1 c. à café de poudre dans un verre d\'eau/jus.',
    dosage_adult: '2 c. à café de poudre/j (cure 30 jours)', dosage_child: '1 c. à café de poudre/j',
    precautions: 'Riche en fer biodisponible, vitamine C et folate. Cure de 30 jours minimum. Vérifier le taux d\'hémoglobine si anémie sévère.',
    contre_indications: 'Aucune majeure à dose alimentaire. À éviter en cas d\'hémochromatose (surcharge en fer).',
    max_severity: 'modere', evidence_level: 'clinique',
    source: 'Stohs SJ & Hartman MJ (2015) — Review of the safety and efficacy of Moringa oleifera. Phytotherapy Research. Nambiar VS et al. (2010) — Moringa for iron deficiency anemia. Indian Journal of Nutrition.' },

  // ─── Troubles digestifs ──────────────────────────────────────────
  { disease: 'Diarrhée', plant_name_fr: 'Goyavier (Psidium guajava)', plant_name_local: 'Goyavier, Goyaba, Guava',
    synonyms_locaux: '{"fulfulde":"Goyaba","haoussa":"Guava","wolof":"Goyap"}',
    part_used: 'Jeunes feuilles et bourgeons', preparation: 'Décoction: 10 jeunes feuilles dans 300ml d\'eau bouillante 10 min. Filtrer. Boire tiède.',
    dosage_adult: '1/2 tasse x 3/j', dosage_child: '2 c. à soupe x 3/j',
    precautions: 'Antiseptique intestinal reconnu. Arrêter si constipation. Consulter si diarrhée > 48h ou signes de déshydratation (SpO2 basse, tachycardie).',
    contre_indications: 'Constipation chronique. Syndrome du côlon irritable à prédominance constipée.',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'Lozoya X et al. (2002) — Guava leaves for the treatment of diarrhoea in children. Journal of Ethnopharmacology. PROTA Vol.11(1).' },
  { disease: 'Diarrhée', plant_name_fr: 'Manguier (Mangifera indica)', plant_name_local: 'Manguier, Mangoro (haoussa)',
    synonyms_locaux: '{"haoussa":"Mangoro","fulfulde":"Mangoro","wolof":"Mango"}',
    part_used: 'Écorce du tronc', preparation: 'Décoction: 1 morceau d\'écorce (5cm) dans 500ml d\'eau, bouillir 20 min. Refroidir. Boire.',
    dosage_adult: '1 verre x 3/j', dosage_child: '1/4 verre x 3/j',
    precautions: 'Astringent puissant. Peut donner des nausées à haute dose. Utiliser en dernier recours.\nConsulter si selles glairo-sanglantes.',
    contre_indications: 'Grossesse (effet utérotonique documenté). Ulcère gastroduodénal. Constipation.',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'PROTA Vol.11(1) — Mangifera indica. Usage traditionnel en Afrique pour les diarrhées infectieuses.' },
  { disease: 'Vers intestinaux (parasitose)', plant_name_fr: 'Papayer (Carica papaya)', plant_name_local: 'Papayer, Ibepe (yoruba), Gwanda (haoussa)',
    synonyms_locaux: '{"yoruba":"Ibepe","haoussa":"Gwanda","fulfulde":"Papayer","ewe":"Papaye"}',
    part_used: 'Graines', preparation: 'Sécher les graines au soleil. Réduire en poudre. Mélanger 1 c. à café avec miel ou bouillie.',
    dosage_adult: '1 c. à café de poudre x 1/j pendant 3 jours (à jeun)', dosage_child: '1/2 c. à café x 1/j pendant 3 jours (enfant > 2 ans)',
    precautions: 'Les graines de papaye ont une action antihelminthique prouvée (carpaine). Traitement de 3 jours, à renouveler après 2 semaines si nécessaire.',
    contre_indications: 'Grossesse (effet abortif documenté). Enfants < 2 ans. Insuffisance hépatique (la carpaine est métabolisée par le foie).',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'Okeniyi JA et al. (2007) — Comparison of Carica papaya seeds with albendazole in intestinal helminthiasis. Journal of Medicinal Food. PROTA Vol.11(1).' },
  { disease: 'Vers intestinaux (parasitose)', plant_name_fr: 'Ail (Allium sativum)', plant_name_local: 'Ail, Tafarnuwa (haoussa)',
    synonyms_locaux: '{"haoussa":"Tafarnuwa","fulfulde":"Yaawo","wolof":"Laa"}',
    part_used: 'Gousse', preparation: 'Écraser 3 gousses d\'ail dans du lait tiède. Boire à jeun.',
    dosage_adult: '1 dose x 1/j pendant 5 jours (à jeun)', dosage_child: '1 dose avec 1 gousse x 1/j (enfant > 3 ans)',
    precautions: 'L\'ail est un vermifuge traditionnel. Traitement de 5 jours. Consulter pour confirmation diagnostique et traitement de masse si nécessaire.',
    contre_indications: 'Anticoagulants. Ulcère gastroduodénal actif. Allergie à l\'ail. Enfants < 3 ans à éviter (\'ail cru).',
    max_severity: 'modere', evidence_level: 'traditionnel_avéré',
    source: 'WHO Monographs Vol.1 — Allium sativum. Usage vermifuge traditionnel documenté.' },
  { disease: 'Malnutrition (IMC bas)', plant_name_fr: 'Mélange Moringa + Soja + Mil', plant_name_local: 'Moringa + soja + mil',
    synonyms_locaux: '{"wolof":"Nebeday + soja + mil","fulfulde":"Moringa + soja + mil"}',
    part_used: 'Poudre de moringa (feuilles) + farine de soja + farine de mil',
    preparation: 'Mélanger: 2 parts farine de mil, 1 part farine de soja grillé, 1 part poudre de moringa. Préparer en bouillie avec eau ou lait.',
    dosage_adult: '1 bol de bouillie/j (complément nutritionnel)', dosage_child: '1/2 bol x 2/j (enfant > 6 mois)',
    precautions: 'Aliment de complément nutritionnel riche en protéines (soja), fer et vitamines A/C (moringa), glucides complexes (mil). Suivi pondéral régulier.',
    contre_indications: 'Allergie au soja ou au mil. Phénylcétonurie (surveillance des protéines).',
    max_severity: 'modere', evidence_level: 'OMS',
    source: 'WHO/UNICEF — Recommendations on complementary feeding. USAID/FFP — Moringa-based nutritional supplements. Études terrain au Sahel (Sénégal, Niger).' },

  // ─── Troubles cutanés ────────────────────────────────────────────
  { disease: 'Infection cutanée / plaie', plant_name_fr: 'Aloe vera (aloès)', plant_name_local: 'Sabar (wolof), Haléïta (haoussa), Aloe',
    synonyms_locaux: '{"wolof":"Sabar","haoussa":"Haléïta","fulfulde":"Mbolo"}',
    part_used: 'Gel des feuilles', preparation: 'Couper une feuille fraîche, extraire le gel. Appliquer directement sur la plaie propre (préalablement lavée à l\'eau salée).',
    dosage_adult: 'Application directe x 3/j', dosage_child: 'Application directe x 2/j',
    precautions: 'Cicatrisant + antibactérien. Ne pas utiliser sur plaie profonde ou infectée sans avis médical. Consulter si signes d\'infection généralisée.',
    contre_indications: 'Allergie aux Asphodelaceae. Ne pas utiliser sur plaie suturée (retarde la cicatrisation profonde).',
    max_severity: 'modere', evidence_level: 'OMS',
    source: 'WHO Monographs Vol.1 — Aloe vera (1999). Maenthaisong R et al. (2007) — Aloe vera for acute and chronic wounds. Burns (méta-analyse).' },
  { disease: 'Infection cutanée / plaie', plant_name_fr: 'Gommier rouge (Bursera simaruba)', plant_name_local: 'Gommier, Encens rouge',
    synonyms_locaux: '{"fr":"Gommier rouge","en":"Gumbo-limbo","créole":"Gommier"}',
    part_used: 'Écorce et résine', preparation: 'Décoction d\'écorce pour lavage de plaie. Résine appliquée en poudre sur la plaie propre.',
    dosage_adult: 'Lavage x 2/j + poudre de résine x 1/j', dosage_child: 'Lavage x 1/j',
    precautions: 'Antiseptique puissant. Ne pas ingérer la résine. Consulter si plaie ne cicatrise pas après 5 jours.',
    contre_indications: 'Ne pas ingérer la résine (toxique). Grossesse et allaitement.',
    max_severity: 'modere', evidence_level: 'traditionnel_rapporté',
    source: 'Neuwinger (2000) — African Traditional Medicine. Usage traditionnel rapporté en Afrique centrale et de l\'Ouest.' },

  // ─── Douleurs et inflammations ────────────────────────────────────
  { disease: 'Douleur / inflammation', plant_name_fr: 'Curcuma (Curcuma longa)', plant_name_local: 'Curcuma, Nwandum (bamiléké)',
    synonyms_locaux: '{"bamiléké":"Nwandum","fulfulde":"Curcuma","ewe":"Curcuma"}',
    part_used: 'Rhizome frais ou poudre', preparation: 'Pâte: mélanger poudre de curcuma + eau tiède. Appliquer sur zone douloureuse. Ou infusion avec poivre noir.',
    dosage_adult: '1 c. à café de poudre/j (dans les plats ou en infusion)', dosage_child: '1/2 c. à café/j',
    precautions: 'Anti-inflammatoire naturel puissant. La curcumine est mieux absorbée avec du poivre noir et un corps gras.',
    contre_indications: 'Obstruction biliaire. Calculs biliaires. Anticoagulants (effet antiplaquettaire). Chimiothérapie (interaction possible).',
    max_severity: 'modere', evidence_level: 'clinique',
    source: 'Aggarwal BB et al. (2007) — Curcumin: the Indian solid gold. Advances in Experimental and Medical Biology. Hewlings SJ & Kalman DS (2017) — Curcumin: A Review of Its Effects. Foods.' },
  { disease: 'Douleur / inflammation', plant_name_fr: 'Harpagophytum procumbens (griffe du diable)', plant_name_local: 'Griffe du diable, Harpagophyton',
    synonyms_locaux: '{"fr":"Griffe du diable","en":"Devil\'s claw","afrikaans":"Duivelsklou"}',
    part_used: 'Racines tubérisées', preparation: 'Décoction: 1 c. à café de racine râpée dans 200ml d\'eau bouillante 15 min. Filtrer.',
    dosage_adult: '1 tasse x 2/j (anti-inflammatoire + antalgique)', dosage_child: 'Non recommandé',
    precautions: 'Contre-indiqué en cas d\'ulcère gastroduodénal. Action lente (1-2 semaines). Consulter si douleur intense ou persistante.',
    contre_indications: 'Ulcère gastroduodénal évolutif. Lithiase biliaire. Diabète (peut abaisser la glycémie). Grossesse et allaitement. Enfants.',
    max_severity: 'modere', evidence_level: 'clinique',
    source: 'ESCOP Monographs — Harpagophytum procumbens. Gagnier JJ et al. (2004) — Harpagophytum for osteoarthritis. Cochrane Database of Systematic Reviews.' },

  // ─── État général ──────────────────────────────────────────────────
  { disease: 'Fatigue / asthénie', plant_name_fr: 'Ginseng africain (Kaempferia aethiopica)', plant_name_local: 'Ginseng africain, Mblaba (diola)',
    synonyms_locaux: '{"diola":"Mblaba","fr":"Ginseng africain","wolof":"Ginseng africain"}',
    part_used: 'Rhizome', preparation: 'Décoction: 1 cm de rhizome râpé dans 200ml d\'eau 10 min. Boire chaud.',
    dosage_adult: '1 tasse x 1/j (le matin, en cure de 15 jours)', dosage_child: '1/2 tasse x 1/j (enfant > 6 ans)',
    precautions: 'Adaptogène + tonique. Peut causer insomnie si pris le soir. Cure de 15 jours max, pause 1 semaine.',
    contre_indications: 'Insomnie chronique (prise le matin uniquement). Hypertension artérielle non contrôlée. Grossesse et allaitement.',
    max_severity: 'faible', evidence_level: 'traditionnel_rapporté',
    source: 'Neuwinger (2000) — African Traditional Medicine. Usage traditionnel tonique en Afrique de l\'Ouest. PROTA Vol.11(1).' },
  { disease: 'Déshydratation', plant_name_fr: 'Eau de coco + sel + sucre (SRO maison)', plant_name_local: 'Eau de coco, Jus de coco',
    synonyms_locaux: '{"fulfulde":"Ndiyam kokot","haoussa":"Ruwan kwakwa","wolof":"Ndox kokot"}',
    part_used: 'Eau de la noix de coco verte', preparation: 'Mélanger 500ml d\'eau de coco + 1/2 c. à café de sel + 2 c. à soupe de sucre. Boire par petites gorgées fréquentes.',
    dosage_adult: 'Boire 1-2L/j du mélange (par petites gorgées)', dosage_child: '50-100ml/kg de poids corporel sur 4h',
    precautions: 'Solution de réhydratation orale maison, validée par l\'OMS (principe du SRO). Si déshydratation sévère (SpO2 basse, tachycardie, pli cutané), référer en urgence pour perfusion IV.',
    contre_indications: 'Insuffisance rénale sévère (risque de surcharge potassique avec l\'eau de coco). Hypertension sévère non contrôlée (apport en sodium).',
    max_severity: 'eleve', evidence_level: 'OMS',
    source: 'WHO — Guidelines on Oral Rehydration Salts (ORS). Adams W et al. (2003) — Coconut water as an oral rehydration solution. American Journal of Clinical Nutrition.' },
];

const upsertUser = async ({ email, password, full_name, role, id_card_override }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  const password_hash = await bcrypt.hash(password, 10);
  const id_card = existing?.id_card || id_card_override || generateIdCard(role);
  if (existing) {
    return prisma.user.update({
      where: { email },
      data: { full_name, role, status: 'active', id_card, password_hash },
    });
  }
  return prisma.user.create({
    data: { email, password_hash, full_name, role, status: 'active', id_card },
  });
};

const main = async () => {
  const admin = await upsertUser({
    email: 'admin@mera.app', password: 'admin1234',
    full_name: 'Administrateur MERA', role: 'admin',
  });

  const encadreur = await upsertUser({
    email: 'demo@mera.app', password: 'demo1234',
    full_name: 'Demo Encadreur', role: 'encadreur',
  });

  const medecin = await upsertUser({
    email: 'medecin@mera.app', password: 'medecin1234',
    full_name: 'Dr. Démo', role: 'medecin',
  });

  await prisma.doctorAssignment.upsert({
    where: { doctor_id_encadreur_id: { doctor_id: medecin.id, encadreur_id: encadreur.id } },
    update: {},
    create: { doctor_id: medecin.id, encadreur_id: encadreur.id },
  });

  const center = await prisma.healthCenter.upsert({
    where: { id: 'demo-center' },
    update: {},
    create: {
      id: 'demo-center',
      name: 'CSI Démo Douala',
      region: 'Littoral',
      district: 'District Douala 5',
      gps_lat: 4.0511,
      gps_lng: 9.7679,
      center_type: 'centre_sante_integre',
    },
  });

  const generateDeviceToken = () => 'dev_' + Array.from({ length: 32 }, () =>
    'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789'[Math.floor(Math.random() * 56)]).join('');
  const existingDevice = await prisma.meraDevice.findUnique({ where: { serial_number: 'MERA-DEMO-001' } });
  const demoDevice = await prisma.meraDevice.upsert({
    where: { serial_number: 'MERA-DEMO-001' },
    update: {
      api_token: existingDevice?.api_token || generateDeviceToken(),
      ip_address: existingDevice?.ip_address || '192.168.1.42',
      port: existingDevice?.port || 80,
    },
    create: {
      serial_number: 'MERA-DEMO-001',
      health_center_id: center.id,
      health_center_name: center.name,
      status: 'hors_ligne',
      battery_level: 87,
      firmware_version: '1.2.0',
      last_sync: null,
      api_token: generateDeviceToken(),
      ip_address: '192.168.1.42',
      port: 80,
    },
  });

  for (const t of treatments) {
    const existing = await prisma.traditionalTreatment.findFirst({
      where: { disease: t.disease, plant_name_fr: t.plant_name_fr },
    });
    if (existing) {
      await prisma.traditionalTreatment.update({
        where: { id: existing.id },
        data: {
          plant_name_local: t.plant_name_local || null,
          synonyms_locaux: t.synonyms_locaux || null,
          part_used: t.part_used || null,
          preparation: t.preparation || null,
          dosage_adult: t.dosage_adult || null,
          dosage_child: t.dosage_child || null,
          precautions: t.precautions || null,
          contre_indications: t.contre_indications || null,
          max_severity: t.max_severity || null,
          evidence_level: t.evidence_level || 'traditionnel_rapporté',
          source: t.source || null,
        },
      });
    } else {
      const id = t.disease.replace(/[^a-z0-9]/gi, '_').slice(0, 30) + '_' + crypto.randomBytes(8).toString('hex');
      await prisma.traditionalTreatment.create({
        data: {
          id,
          disease: t.disease,
          plant_name_fr: t.plant_name_fr,
          plant_name_local: t.plant_name_local || null,
          synonyms_locaux: t.synonyms_locaux || null,
          part_used: t.part_used || null,
          preparation: t.preparation || null,
          dosage_adult: t.dosage_adult || null,
          dosage_child: t.dosage_child || null,
          precautions: t.precautions || null,
          contre_indications: t.contre_indications || null,
          max_severity: t.max_severity || null,
          evidence_level: t.evidence_level || 'traditionnel_rapporté',
          source: t.source || null,
        },
      });
    }
  }

  const allTreatments = await prisma.traditionalTreatment.findMany({
    select: { id: true, disease: true },
  });
  const diseaseToIds = {};
  for (const t of allTreatments) {
    if (!diseaseToIds[t.disease]) diseaseToIds[t.disease] = [];
    diseaseToIds[t.disease].push(t.id);
  }
  for (const [disease, ids] of Object.entries(diseaseToIds)) {
    for (const treatment_id of ids) {
      await prisma.treatmentIndication.upsert({
        where: { prediction_disease_treatment_id: { prediction_disease: disease, treatment_id } },
        update: {},
        create: { prediction_disease: disease, treatment_id, match_type: 'exact' },
      });
    }
  }

  const childCardId = 'RFID-DEMO-001';
  const childPinHash = await bcrypt.hash('1234', 10);
  await prisma.patient.upsert({
    where: { card_id: childCardId },
    update: { guardian_id: encadreur.id },
    create: {
      card_id: childCardId,
      pin_hash: childPinHash,
      full_name: 'Petit Démo',
      age: 8, sex: 'M', village: 'Edéa',
      guardian_id: encadreur.id,
      is_pediatric: true,
    },
  });

  const orphanCardId = 'RFID-ORPHAN-002';
  await prisma.patient.upsert({
    where: { card_id: orphanCardId },
    update: { guardian_id: null },
    create: {
      card_id: orphanCardId,
      pin_hash: childPinHash,
      full_name: 'Orphelin Test',
      age: 6, sex: 'F',
      guardian_id: null,
      is_pediatric: true,
    },
  });

  console.log('\nSeed terminé.');
  console.log('');
  console.log(`Admin    : admin@mera.app    / admin1234`);
  console.log(`Encadreur: demo@mera.app     / demo1234`);
  console.log(`Médecin  : medecin@mera.app  / medecin1234`);
  console.log(`Enfant   : RFID=${childCardId}     PIN=1234`);
  console.log(`Device   : MERA-DEMO-001    token=${demoDevice.api_token}`);
  console.log('\n');
};

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
