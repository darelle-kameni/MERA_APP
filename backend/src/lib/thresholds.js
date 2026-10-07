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
  CONTESTED_SCORE: 50, // score oculaire > ce seuil => MODERE
};
