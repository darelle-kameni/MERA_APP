import jsPDF from 'jspdf';

const fetchSignatureDataUrl = async (signatureUrl) => {
  try {
    const url = signatureUrl.startsWith('http') ? signatureUrl : `/api${signatureUrl}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

const detectFormat = (dataUrl) => {
  if (!dataUrl) return null;
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return null;
};

// Builds the signed medical report PDF. Returns a Blob.
export const buildSignedDiagnosisPdf = async ({ session, doctor, status, note, referralHospital }) => {
  const doc = new jsPDF();
  let y = 18;

  const line = (txt, opts = {}) => {
    if (opts.size) doc.setFontSize(opts.size);
    if (opts.bold) doc.setFont(undefined, 'bold'); else doc.setFont(undefined, 'normal');
    if (opts.color) doc.setTextColor(...opts.color); else doc.setTextColor(0);
    const lines = doc.splitTextToSize(String(txt), 175);
    for (const l of lines) {
      if (y > 270) { doc.addPage(); y = 18; }
      doc.text(l, 18, y);
      y += opts.size ? opts.size * 0.5 + 2 : 6;
    }
  };
  const sep = () => { y += 2; doc.setDrawColor(220); doc.line(18, y, 192, y); y += 5; };

  line('MERA — Compte-rendu médical validé', { size: 16, bold: true });
  line(`Document généré le ${new Date().toLocaleString('fr-FR')}`, { size: 9, color: [120, 120, 120] });
  sep();

  line('Patient', { size: 12, bold: true });
  line(`Nom : ${session.patient_name || '—'}`);
  line(`Âge : ${session.patient_age ?? '—'} ans${session.patient_sex ? `   Sexe : ${session.patient_sex}` : ''}`);
  sep();

  line('Consultation', { size: 12, bold: true });
  line(`Date : ${new Date(session.session_date || session.created_date).toLocaleString('fr-FR')}`);
  line(`Niveau d'urgence : ${session.urgency_level}`);
  sep();

  if (session.recommendations) {
    line('Recommandations issues du moteur IA', { size: 12, bold: true });
    line(session.recommendations);
    sep();
  }

  if (session.vocal_transcript) {
    line('Transcription vocale', { size: 12, bold: true });
    line(session.vocal_transcript);
    sep();
  }

  line('Avis médical', { size: 12, bold: true });
  line(`Statut : ${status === 'refere' ? 'Patient référé' : 'Diagnostic validé'}`);
  if (status === 'refere' && referralHospital) line(`Hôpital de référence : ${referralHospital}`);
  if (note) {
    line('Note clinique :', { bold: true });
    line(note);
  }
  sep();

  // Signature block
  y = Math.max(y, 230);
  line('Validé électroniquement par', { size: 11, bold: true });
  line(`Dr. ${doctor.full_name || doctor.email || 'Médecin'}`);
  if (doctor.id_card) line(`ID Card : ${doctor.id_card}`);
  line(`Le ${new Date().toLocaleString('fr-FR')}`, { color: [100, 100, 100] });

  if (doctor.signature_url) {
    const dataUrl = await fetchSignatureDataUrl(doctor.signature_url);
    const fmt = detectFormat(dataUrl);
    if (dataUrl && fmt) {
      try {
        doc.addImage(dataUrl, fmt, 18, y, 55, 22);
        y += 24;
      } catch { /* swallow image errors — note already printed */ }
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    'Document signé électroniquement via MERA. La validité de cette signature peut être vérifiée auprès du Club GIT — ENSP Douala.',
    18, 290, { maxWidth: 175 },
  );

  return doc.output('blob');
};
