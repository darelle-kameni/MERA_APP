import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ID_CARD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomBlock = (n) => Array.from({ length: n }, () =>
  ID_CARD_ALPHABET[Math.floor(Math.random() * ID_CARD_ALPHABET.length)]).join('');
const generateIdCard = (role) => {
  const prefix = role === 'admin' ? 'AD' : role === 'medecin' ? 'MD' : 'EN';
  return `${prefix}-${randomBlock(4)}-${randomBlock(4)}`;
};

const treatments = [
  { disease: 'Conjonctivite bactérienne', plant_name_fr: 'Neem (margousier)', plant_name_local: 'Dogo yaro',
    part_used: 'Feuilles', preparation: 'Décoction de feuilles fraîches', dosage_adult: '2 gouttes x 3/j',
    dosage_child: '1 goutte x 2/j', precautions: 'Éviter chez le nourrisson < 6 mois', max_severity: 'modere' },
  { disease: 'Cataracte', plant_name_fr: 'Moringa oleifera', plant_name_local: 'Nebeday',
    part_used: 'Feuilles séchées', preparation: 'Infusion 5 min', dosage_adult: '1 tasse x 2/j',
    dosage_child: '1/2 tasse x 1/j', precautions: 'Pas de substitution à la chirurgie', max_severity: 'faible' },
  { disease: 'Trachome', plant_name_fr: 'Aloe vera', plant_name_local: 'Sabar',
    part_used: 'Gel des feuilles', preparation: 'Gel pur appliqué localement', dosage_adult: 'Application x 2/j',
    dosage_child: 'Application x 1/j', precautions: 'Tester sur la peau d\'abord', max_severity: 'modere' },
];

const upsertUser = async ({ email, password, full_name, role, id_card_override }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  const password_hash = await bcrypt.hash(password, 10);
  const id_card = existing?.id_card || id_card_override || generateIdCard(role);
  if (existing) {
    return prisma.user.update({
      where: { email },
      data: { full_name, role, status: 'active', id_card },
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

  // Associer le médecin démo à l'encadreur démo
  await prisma.doctorAssignment.upsert({
    where: { doctor_id_encadreur_id: { doctor_id: medecin.id, encadreur_id: encadreur.id } },
    update: {},
    create: { doctor_id: medecin.id, encadreur_id: encadreur.id },
  });

  // Centre de santé démo
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

  // Device démo : ESP32 simulé, token généré une seule fois (réutilisé si déjà présent)
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
      last_sync: null,  // null jusqu'au premier heartbeat
      api_token: generateDeviceToken(),
      ip_address: '192.168.1.42',  // exemple — à éditer via Configurer
      port: 80,
    },
  });

  // Traitements traditionnels
  for (const t of treatments) {
    const existing = await prisma.traditionalTreatment.findFirst({
      where: { disease: t.disease, plant_name_fr: t.plant_name_fr },
    });
    if (!existing) await prisma.traditionalTreatment.create({ data: t });
  }

  // Démo : un enfant pour l'encadreur (PIN connu = 1234), un enfant orphelin
  const childCardId = 'RFID-DEMO-001';
  const childPinHash = await bcrypt.hash('1234', 10);
  const child = await prisma.patient.upsert({
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
  console.log('────────────────────────────────────────────');
  console.log(`Admin    : admin@mera.app    / admin1234     (ID: ${admin.id_card})`);
  console.log(`Encadreur: demo@mera.app     / demo1234      (ID: ${encadreur.id_card})`);
  console.log(`Médecin  : medecin@mera.app  / medecin1234   (ID: ${medecin.id_card})`);
  console.log(`Enfant   : QR=${childQr}     PIN=1234         (tuteur: encadreur démo)`);
  console.log(`Appareil : MERA-DEMO-001   token=${demoDevice.api_token}`);
  console.log(`           IP=${demoDevice.ip_address}:${demoDevice.port}  (à reconfigurer depuis Appareils MERA)`);
  console.log('────────────────────────────────────────────\n');
};

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
