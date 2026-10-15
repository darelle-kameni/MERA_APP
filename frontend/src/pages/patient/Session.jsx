import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { usePatientAuth } from '@/lib/PatientAuthContext';
import { useTranslation } from '@/lib/useTranslation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Activity, Eye, Brain, Stethoscope, MessageSquare, FileText, FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { PageLoading, PageError } from '@/components/shared/PageState';

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-sm font-heading font-semibold">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const KV = ({ label, value, unit }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value ?? '—'}{value != null && unit ? ` ${unit}` : ''}</span>
  </div>
);

const Pct = ({ label, value }) => {
  if (value == null) return null;
  const v = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(v)) return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{v.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, v)}%` }} />
      </div>
    </div>
  );
};

const buildPdf = (patient, session, t) => {
  const doc = new jsPDF();
  let y = 18;
  const line = (txt, opts = {}) => {
    if (opts.size) doc.setFontSize(opts.size);
    if (opts.bold) doc.setFont(undefined, 'bold'); else doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(txt, 175);
    lines.forEach((l) => {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.text(l, 18, y);
      y += opts.size ? opts.size * 0.5 + 2 : 6;
    });
  };
  const sep = () => { y += 2; doc.setDrawColor(200); doc.line(18, y, 192, y); y += 4; };

  line(t('session.pdfTitle', 'MERA — Compte-rendu de consultation'), { size: 16, bold: true });
  line(`${t('session.generatedOn', 'Document généré le')} ${new Date().toLocaleString('fr-FR')}`, { size: 9 });
  sep();

  line(t('session.patient', 'Patient'), { size: 12, bold: true });
  line(`${t('session.name', 'Nom')} : ${patient.full_name || '—'}`);
  line(`${t('session.age', 'Âge')} : ${patient.age} ${t('common.years', 'ans')}   ${t('session.sex', 'Sexe')} : ${patient.sex}`);
  if (patient.village) line(`${t('session.village', 'Village')} : ${patient.village}`);
  line(`${t('session.patientCode', 'Code patient')} : ${patient.qr_code || '—'}`);
  sep();

  line(t('session.consultation', 'Consultation'), { size: 12, bold: true });
  line(`${t('session.date', 'Date')} : ${new Date(session.session_date).toLocaleString('fr-FR')}`);
  line(`${t("session.urgencyLevel", "Niveau d'urgence")} : ${session.urgency_level}`);
  line(`${t('session.status', 'Statut')} : ${session.status}`);
  sep();

  if (session.vital_signs?.length) {
    line(t('session.vitals', 'Signes vitaux'), { size: 12, bold: true });
    const v = session.vital_signs[0];
    if (v.temperature != null) line(`${t('session.temperature', 'Température')} : ${v.temperature} °C`);
    if (v.spo2 != null) line(`${t('session.spo2', 'SpO2')} : ${v.spo2} %`);
    if (v.heart_rate != null) line(`${t('session.heartRate', 'Fréquence cardiaque')} : ${v.heart_rate} bpm`);
    if (v.weight != null) line(`${t('session.weight', 'Poids')} : ${v.weight} kg`);
    if (v.bmi != null) line(`${t('session.bmi', 'IMC')} : ${v.bmi}`);
    if (v.bp_systolic != null && v.bp_diastolic != null) line(`${t('session.bloodPressure', 'Tension artérielle')} : ${v.bp_systolic}/${v.bp_diastolic} mmHg`);
    sep();
  }

  if (session.systemic_predictions?.length) {
    line(t('session.predictions', 'Prédictions systémiques'), { size: 12, bold: true });
    session.systemic_predictions.forEach((p) => {
      line(`• ${p.disease} — ${p.probability != null ? `${p.probability}%` : ''}${p.severity ? ` (${p.severity})` : ''}`);
    });
    sep();
  }

  const eyeRes = session.contagious_result || session.non_contagious_result;
  if (eyeRes) {
    line(t('session.eyeAnalysis', 'Analyse oculaire'), { size: 12, bold: true });
    Object.entries(eyeRes).forEach(([k, v]) => {
      if (k === 'id' || k === 'session_id' || k === 'created_date' || k === 'updated_date') return;
      if (typeof v === 'number') line(`${k.replace(/_/g, ' ')} : ${v}%`);
    });
    sep();
  }

  if (session.recommendations) {
    line(t('session.recommendations', 'Recommandations'), { size: 12, bold: true });
    line(session.recommendations);
    sep();
  }

  const lastReview = session.medical_reviews?.[0];
  if (lastReview) {
    line(t('session.medicalOpinion', 'Avis médical'), { size: 12, bold: true });
    if (lastReview.doctor_name) line(`${t('session.doctor', 'Médecin')} : ${lastReview.doctor_name}`);
    line(`${t('session.status', 'Statut')} : ${lastReview.status}`);
    if (lastReview.note) line(`${t('session.note', 'Note')} : ${lastReview.note}`);
    if (lastReview.referral_needed) line(`${t('session.referred', 'Référé')} : ${lastReview.referral_hospital || t('common.yes', 'Oui')}`);
    sep();
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(t('session.pdfDisclaimer', 'Ce document est un compte-rendu informatif. Consultez un professionnel de santé pour toute décision médicale.'),
    18, 290, { maxWidth: 175 });
  return doc;
};

export default function PatientSession() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { patient } = usePatientAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await base44.patient.session(id);
      setSession(s);
    } catch (err) {
      if (err.status === 404) setError(t('session.notFound', 'Consultation introuvable.'));
      else setError(err.message || t('common.networkError', 'Erreur réseau'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const downloadPdf = () => {
    try {
      const doc = buildPdf(patient, session, t);
      const date = new Date(session.session_date).toISOString().slice(0, 10);
      doc.save(`${t('session.pdfFilename', 'MERA-compte-rendu-')}${date}.pdf`);
      toast.success(t('session.downloaded', 'Compte-rendu téléchargé'));
    } catch (err) {
      console.error(err);
      toast.error(t('session.pdfError', 'Erreur lors de la génération du PDF'));
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;
  if (!session) return null;

  const vitals = session.vital_signs?.[0];
  const eyeRes = session.contagious_result || session.non_contagious_result;
  const lastReview = session.medical_reviews?.[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/patient"><ArrowLeft className="w-4 h-4" /> {t('common.back', 'Retour')}</Link>
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {lastReview?.pdf_url && (
            <Button asChild size="sm" className="gap-1.5">
              <a href={`/api${lastReview.pdf_url}`} target="_blank" rel="noreferrer">
                <FileSignature className="w-3.5 h-3.5" /> {t('session.signedReport', 'Compte-rendu signé')}
              </a>
            </Button>
          )}
          <Button onClick={downloadPdf} size="sm" variant={lastReview?.pdf_url ? 'outline' : 'default'} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> {t('session.pdfSummary', 'Résumé PDF')}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-heading font-bold">
              {t('session.consultationOn', 'Consultation du')} {new Date(session.session_date).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric'
              })}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(session.session_date).toLocaleTimeString('fr-FR', {
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <UrgencyBadge level={session.urgency_level} />
        </div>
        {session.recommendations && (
          <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <p className="text-[10px] uppercase tracking-wider text-blue-600 mb-1">{t('session.recommendations', 'Recommandations')}</p>
            <p className="text-sm">{session.recommendations}</p>
          </div>
        )}
      </div>

      {vitals && (
        <Section icon={Activity} title={t('session.vitals', 'Signes vitaux')}>
          <div className="grid grid-cols-2 gap-x-4">
            <KV label={t('session.temperature', 'Température')} value={vitals.temperature} unit="°C" />
            <KV label={t('session.spo2', 'SpO2')} value={vitals.spo2} unit="%" />
            <KV label={t('session.heartRate', 'Fréquence cardiaque')} value={vitals.heart_rate} unit="bpm" />
            <KV label={t('session.weight', 'Poids')} value={vitals.weight} unit="kg" />
            <KV label={t('session.bmi', 'IMC')} value={vitals.bmi} />
            <KV label={t('session.bloodPressure', 'Tension artérielle')} value={vitals.bp_systolic != null && vitals.bp_diastolic != null ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : null} unit="mmHg" />
          </div>
        </Section>
      )}

      {session.systemic_predictions?.length > 0 && (
        <Section icon={Brain} title={t('session.systemicEval', 'Évaluation systémique')}>
          <div className="space-y-3">
            {session.systemic_predictions.map((p) => (
              <Pct key={p.id} label={`${p.disease}${p.severity ? ` (${p.severity})` : ''}`} value={p.probability} />
            ))}
          </div>
        </Section>
      )}

      {eyeRes && (
        <Section icon={Eye} title={t('session.eyeAnalysis', 'Analyse oculaire')}>
          <div className="space-y-3">
            {Object.entries(eyeRes).map(([k, v]) => {
              if (['id', 'session_id', 'created_date', 'updated_date', 'contagion_alert'].includes(k)) return null;
              if (typeof v !== 'number') return null;
              return <Pct key={k} label={k.replace(/_/g, ' ')} value={v} />;
            })}
          </div>
        </Section>
      )}

      {session.vocal_exchanges?.length > 0 && (
        <Section icon={MessageSquare} title={t('session.dialogue', "Dialogue avec l'assistant")}>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {session.vocal_exchanges.map((v) => (
              <div key={v.id} className={`text-sm p-2 rounded-lg ${
                v.speaker === 'robot' ? 'bg-primary/5' : 'bg-muted'
              }`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{v.speaker}</p>
                <p>{v.transcript_text}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {lastReview && (
        <Section icon={Stethoscope} title={t('session.doctorOpinion', 'Avis du médecin')}>
          <div className="space-y-2 text-sm">
            {lastReview.doctor_name && <KV label={t('session.doctor', 'Médecin')} value={lastReview.doctor_name} />}
            <KV label={t('session.status', 'Statut')} value={lastReview.status} />
            {lastReview.note && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">{t('session.clinicalNote', 'Note clinique :')}</p>
                <p className="text-sm">{lastReview.note}</p>
              </div>
            )}
            {lastReview.referral_needed && (
              <div className="mt-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs font-medium text-orange-700">
                  {t('session.referredTo', 'Vous êtes référé(e) à :')} {lastReview.referral_hospital || t('session.unnamedHospital', 'un hôpital')}
                </p>
              </div>
            )}
            {lastReview.pdf_url && (
              <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5">
                <a href={`/api${lastReview.pdf_url}`} target="_blank" rel="noreferrer">
                  <FileSignature className="w-3.5 h-3.5" /> {t('session.downloadSigned', 'Télécharger le compte-rendu signé')}
                </a>
              </Button>
            )}
          </div>
        </Section>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          {t('session.disclaimer', 'Ces informations sont communiquées à titre informatif. Pour toute décision médicale, consultez un professionnel de santé.')}
        </p>
      </div>
    </div>
  );
}
