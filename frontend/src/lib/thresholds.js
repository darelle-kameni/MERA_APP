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
  BP_SYS_CRITICAL: 130, // PA systolique (mmHg) >= ce seuil => critique
  BP_SYS_HIGH: 120, // PA systolique (mmHg) >= ce seuil => élevé
  BP_SYS_LOW: 80, // PA systolique (mmHg) < ce seuil => hypotension
  BP_DIA_CRITICAL: 90, // PA diastolique (mmHg) >= ce seuil => critique
  BP_DIA_HIGH: 80, // PA diastolique (mmHg) >= ce seuil => élevé
  BP_DIA_LOW: 50, // PA diastolique (mmHg) < ce seuil => hypotension
};
