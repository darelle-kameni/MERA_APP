// Routes pour le suivi de présence (badge RFID)
// GET  /attendance         — liste des badges (filtrable)
// GET  /attendance/today   — résumé du jour (stats)
// GET  /attendance/export   — export Excel du jour
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireStaff } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

const router = Router();
router.use(requireStaff);

// ─── GET /attendance : liste chronologique ─
// Query params : ?date=2026-07-05&patient_id=xxx&card_id=xxx&limit=50&offset=0
router.get('/', async (req, res, next) => {
  try {
    const { date, patient_id, card_id, limit, offset } = req.query;
    const where = {};

    if (date) {
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      where.badged_at = { gte: start, lte: end };
    }
    if (patient_id) where.patient_id = patient_id;
    if (card_id) where.card_id = card_id;

    const items = await prisma.attendance.findMany({
      where,
      orderBy: { badged_at: 'desc' },
      take: Math.min(parseInt(limit || '200'), 500),
      skip: parseInt(offset || '0'),
    });

    res.json(items);
  } catch (e) { next(e); }
});

// ─── GET /attendance/today : stats du jour ─
router.get('/today', async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const rows = await prisma.attendance.findMany({
      where: { badged_at: { gte: start, lte: end } },
      orderBy: { badged_at: 'desc' },
    });

    // Compter les badges uniques par patient
    const unique = new Map();
    for (const r of rows) {
      if (!unique.has(r.card_id)) {
        unique.set(r.card_id, { ...r, count: 0 });
      }
      unique.get(r.card_id).count++;
    }

    res.json({
      total: rows.length,
      unique_patients: unique.size,
      patients: Array.from(unique.values()),
      date: start.toISOString().slice(0, 10),
    });
  } catch (e) { next(e); }
});

// ─── GET /attendance/export : export Excel ─
router.get('/export', async (req, res, next) => {
  try {
    const { date } = req.query;
    const dateStr = date || new Date().toISOString().slice(0, 10);
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');

    const items = await prisma.attendance.findMany({
      where: { badged_at: { gte: start, lte: end } },
      orderBy: { badged_at: 'asc' },
    });

    // Récupérer les infos patients pour chaque card_id
    const cardIds = [...new Set(items.map(r => r.card_id).filter(Boolean))];
    const patients = await prisma.patient.findMany({
      where: { card_id: { in: cardIds } },
      select: { card_id: true, full_name: true, age: true, sex: true, village: true },
    });
    const patientMap = {};
    for (const p of patients) patientMap[p.card_id] = p;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MERA App';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Pointage');

    // Style en-tête
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      },
    };

    const columns = [
      { header: 'Heure', key: 'time', width: 14 },
      { header: 'Nom', key: 'name', width: 28 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'Sexe', key: 'sex', width: 8 },
      { header: 'Village', key: 'village', width: 20 },
      { header: 'ID Carte RFID', key: 'card_id', width: 22 },
      { header: 'Rôle', key: 'role', width: 16 },
      { header: 'Centre de santé', key: 'center', width: 22 },
    ];

    sheet.columns = columns;
    const headerRow = sheet.addRow(columns.map(c => c.header));
    headerRow.eachCell(cell => { cell.style = headerStyle; });

    // Données
    for (const r of items) {
      const p = patientMap[r.card_id];
      const d = new Date(r.badged_at);
      const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' });
      sheet.addRow([
        time,
        r.patient_name || 'Inconnu',
        p?.age ?? '',
        p?.sex ?? '',
        p?.village ?? '',
        r.card_id,
        r.role === 'patient' ? 'Patient' :
        r.role === 'encadreur' ? 'Encadreur' :
        r.role === 'medecin' ? 'Médecin' :
        r.role === 'admin' ? 'Admin' : r.role,
        r.health_center_id || '',
      ]);
    }

    // Ligne récapitulative
    sheet.addRow({});
    const totalLabel = `Total badges: ${items.length}`;
    const uniqueLabel = `Personnes uniques: ${new Set(items.map(r => r.card_id)).size}`;
    sheet.addRow([totalLabel]);
    sheet.addRow([uniqueLabel]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pointage-${dateStr}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
});

export default router;
