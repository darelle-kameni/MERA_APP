// Source de vérité des seuils cliniques — utilisée par robot.js, llm-predict.js
// et répliquée dans frontend/src/lib/thresholds.js (garder les deux alignés).

export const THRESHOLDS = {
  HR_CRITICAL: 120, // FC (bpm) > ce seuil => CRITIQUE
  HR_MEDIUM: 100, // FC (bpm) > ce seuil => anomalie modérée
  HR_LOW: 55, // FC (bpm) < ce seuil => bradycardie
  TEMP_CRITICAL: 40, // T° (°C) > ce seuil => CRITIQUE
  TEMP_HIGH: 38, // T° (°C) >= ce seuil => ELEVE
  SPO2_CRITICAL: 90, // SpO2 (%) < ce seuil => CRITIQUE
  SPO2_HIGH: 95, // SpO2 (%) < ce seuil => ELEVE
  BP_SYS_CRITICAL: 130, // PA systolique (mmHg) >= ce seuil => CRITIQUE
  BP_SYS_HIGH: 120, // PA systolique (mmHg) >= ce seuil => ELEVE
  BP_SYS_LOW: 80, // PA systolique (mmHg) < ce seuil => ELEVE (hypotension)
  BP_DIA_CRITICAL: 90, // PA diastolique (mmHg) >= ce seuil => CRITIQUE
  BP_DIA_HIGH: 80, // PA diastolique (mmHg) >= ce seuil => ELEVE
  BP_DIA_LOW: 50, // PA diastolique (mmHg) < ce seuil => ELEVE (hypotension)
  CONTESTED_SCORE: 50, // score oculaire > ce seuil => MODERE
};
