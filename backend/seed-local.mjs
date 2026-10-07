import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'prisma', 'dev.db'));
db.pragma('journal_mode = WAL');

const dataset = JSON.parse(readFileSync(join(__dirname, '..', 'datasets', 'traditional_treatments.json'), 'utf-8'));

const insert = db.prepare(`
  INSERT OR REPLACE INTO TraditionalTreatment
  (id, disease, plant_name_fr, plant_name_local, synonyms_locaux, part_used, preparation,
   dosage_adult, dosage_child, precautions, contre_indications, max_severity,
   evidence_level, source, source_url, created_date, updated_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const insertIndication = db.prepare(`
  INSERT OR IGNORE INTO TreatmentIndication
  (id, prediction_disease, treatment_id, match_type, created_date)
  VALUES (?, ?, ?, ?, datetime('now'))
`);

// Clear old data
db.exec("DELETE FROM TreatmentIndication");
db.exec("DELETE FROM TraditionalTreatment");

// Insert treatments
const insertAll = db.transaction(() => {
  for (const t of dataset.treatments) {
    const id = t.disease.replace(/[^a-z0-9]/gi, '_').slice(0, 30) + '_' + crypto.randomBytes(8).toString('hex');
    insert.run(
      id, t.disease, t.plant.scientific_name, t.plant.local_name, null, t.plant.part_used,
      t.preparation, t.dosage?.adult || null, t.dosage?.child || null,
      t.precautions, t.contraindications, t.max_severity,
      t.evidence_level, t.source, t.source_url || null
    );
    // Create indication link
    const indId = crypto.randomBytes(8).toString('hex');
    insertIndication.run(indId, t.disease, id, 'exact');
  }
});

insertAll();

const count = db.prepare("SELECT COUNT(*) as n FROM TraditionalTreatment").get();
const withUrl = db.prepare("SELECT COUNT(*) as n FROM TraditionalTreatment WHERE source_url IS NOT NULL").get();
const cats = db.prepare("SELECT evidence_level, COUNT(*) as n FROM TraditionalTreatment GROUP BY evidence_level ORDER BY n DESC").all();

console.log(`\n✅ ${count.n} traitements importés dans dev.db`);
console.log(`🔗 ${withUrl.n} avec URL de référence`);
console.log("\nNiveaux de preuve:");
cats.forEach(r => console.log(`  ${r.evidence_level}: ${r.n}`));

db.close();
