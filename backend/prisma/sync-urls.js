import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const data = JSON.parse(readFileSync(new URL('../../datasets/traditional_treatments.json', import.meta.url), 'utf-8'));
const treats = data.treatments;

// Index des URLs cibles par (disease | plant_name_fr)
const urlByKey = new Map();
for (const t of treats) {
  const key = `${t.disease}||${t.plant.scientific_name}`;
  urlByKey.set(key, t.source_url || null);
}

const rows = await prisma.traditionalTreatment.findMany({
  select: { id: true, disease: true, plant_name_fr: true, source_url: true },
});

let updated = 0;
let skipped = 0;
for (const r of rows) {
  const key = `${r.disease}||${r.plant_name_fr}`;
  const target = urlByKey.get(key);
  if (target === undefined) { skipped++; continue; }
  if (r.source_url !== target) {
    await prisma.traditionalTreatment.update({
      where: { id: r.id },
      data: { source_url: target },
    });
    updated++;
  }
}

console.log(`✅ ${updated} URLs DB mises à jour, ${skipped} non retrouvées`);
await prisma.$disconnect();
