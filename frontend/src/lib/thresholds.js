// Source de vérité des seuils cliniques côté UI — doit rester alignée
// sur backend/src/lib/thresholds.js (une seule valeur de référence : 120 bpm).

export const THRESHOLDS = {
  HR_CRITICAL: 120, // FC (bpm) > ce seuil => critique / tachycardie
  HR_MEDIUM: 100, // FC (bpm) > ce seuil => pouls élevé
  HR_LOW: 55, // FC (bpm) < ce seuil => bradycardie
  TEMP_CRITICAL: 40,
  TEMP_HIGH: 38,
  SPO2_CRITICAL: 90,
  SPO2_HIGH: 95,
};
