-- Anti-doublon pharmacopée : une seule entrée par (maladie, plante).
-- Contrôle préalable : aucune doublon existante sur la base (169 lignes).
-- La route admin fait également le contrôle avant création (409 duplicate).
CREATE UNIQUE INDEX "TraditionalTreatment_disease_plant_name_fr_key"
ON "TraditionalTreatment"("disease", "plant_name_fr");
