import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { usePatientAuth } from '@/lib/PatientAuthContext';
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

const buildPdf = (patient, session) => {
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

  line('MERA — Compte-rendu de consultation', { size: 16, bold: true });
  line(`Document généré le ${new Date().toLocaleString('fr-FR')}`, { size: 9 });
  sep();

  line('Patient', { size: 12, bold: true });
  line(`Nom : ${patient.full_name || '—'}`);
  line(`Âge : ${patient.age} ans   Sexe : ${patient.sex}`);
  if (patient.village) line(`Village : ${patient.village}`);
  line(`Code patient : ${patient.qr_code || '—'}`);
  sep();

  line('Consultation', { size: 12, bold: true });
  line(`Date : ${new Date(session.session_date).toLocaleString('fr-FR')}`);
  line(`Niveau d'urgence : ${session.urgency_level}`);
  line(`Statut : ${session.status}`);
  sep();

  if (session.vital_signs?.length) {
    line('Signes vitaux', { size: 12, bold: true });
    const v = session.vital_signs[0];
    if (v.temperature != null) line(`Température : ${v.temperature} °C`);
    if (v.spo2 != null) line(`SpO2 : ${v.spo2} %`);
    if (v.heart_rate != null) line(`Fréquence cardiaque : ${v.heart_rate} bpm`);
    if (v.weight != null) line(`Poids : ${v.weight} kg`);
    if (v.bmi != null) line(`IMC : ${v.bmi}`);
    sep();
  }

  if (session.systemic_predictions?.length) {
    line('Prédictions systémiques', { size: 12, bold: true });
    session.systemic_predictions.forEach((p) => {
      line(`• ${p.disease} — ${p.probability != null ? `${p.probability}%` : ''}${p.severity ? ` (${p.severity})` : ''}`);
    });
    sep();
  }

  const eyeRes = session.contagious_result || session.non_contagious_result;
  if (eyeRes) {
    line('Analyse oculaire', { size: 12, bold: true });
    Object.entries(eyeRes).forEach(([k, v]) => {
      if (k === 'id' || k === 'session_id' || k === 'created_date' || k === 'updated_date') return;
      if (typeof v === 'number') line(`${k.replace(/_/g, ' ')} : ${v}%`);
    });
    sep();
  }

  if (session.recommendations) {
    line('Recommandations', { size: 12, bold: true });
    line(session.recommendations);
    sep();
  }

  const lastReview = session.medical_reviews?.[0];
  if (lastReview) {
    line('Avis médical', { size: 12, bold: true });
    if (lastReview.doctor_name) line(`Médecin : ${lastReview.doctor_name}`);
    line(`Statut : ${lastReview.status}`);
    if (lastReview.note) line(`Note : ${lastReview.note}`);
    if (lastReview.referral_needed) line(`Référé : ${lastReview.referral_hospital || 'Oui'}`);
    sep();
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Ce document est un compte-rendu informatif. Consultez un professionnel de santé pour toute décision médicale.",
    18, 290, { maxWidth: 175 });
  return doc;
};

export default function PatientSession() {
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
      if (err.status === 404) setError('Consultation introuvable.');
      else setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const downloadPdf = () => {
    try {
      const doc = buildPdf(patient, session);
      const date = new Date(session.session_date).toISOString().slice(0, 10);
      doc.save(`MERA-compte-rendu-${date}.pdf`);
      toast.success('Compte-rendu téléchargé');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération du PDF');
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
          <Link to="/patient"><ArrowLeft className="w-4 h-4" /> Retour</Link>
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {lastReview?.pdf_url && (
            <Button asChild size="sm" className="gap-1.5">
              <a href={`/api${lastReview.pdf_url}`} target="_blank" rel="noreferrer">
                <FileSignature className="w-3.5 h-3.5" /> Compte-rendu signé
              </a>
            </Button>
          )}
          <Button onClick={downloadPdf} size="sm" variant={lastReview?.pdf_url ? 'outline' : 'default'} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Résumé PDF
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-heading font-bold">
              Consultation du {new Date(session.session_date).toLocaleDateString('fr-FR', {
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
            <p className="text-[10px] uppercase tracking-wider text-blue-600 mb-1">Recommandations</p>
            <p className="text-sm">{session.recommendations}</p>
          </div>
        )}
      </div>

      {vitals && (
        <Section icon={Activity} title="Signes vitaux">
          <div className="grid grid-cols-2 gap-x-4">
            <KV label="Température" value={vitals.temperature} unit="°C" />
            <KV label="SpO2" value={vitals.spo2} unit="%" />
            <KV label="Fréquence cardiaque" value={vitals.heart_rate} unit="bpm" />
            <KV label="Poids" value={vitals.weight} unit="kg" />
            <KV label="IMC" value={vitals.bmi} />
          </div>
        </Section>
      )}

      {session.systemic_predictions?.length > 0 && (
        <Section icon={Brain} title="Évaluation systémique">
          <div className="space-y-3">
            {session.systemic_predictions.map((p) => (
              <Pct key={p.id} label={`${p.disease}${p.severity ? ` (${p.severity})` : ''}`} value={p.probability} />
            ))}
          </div>
        </Section>
      )}

      {eyeRes && (
        <Section icon={Eye} title="Analyse oculaire">
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
        <Section icon={MessageSquare} title="Dialogue avec l'assistant">
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
        <Section icon={Stethoscope} title="Avis du médecin">
          <div className="space-y-2 text-sm">
            {lastReview.doctor_name && <KV label="Médecin" value={lastReview.doctor_name} />}
            <KV label="Statut" value={lastReview.status} />
            {lastReview.note && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Note clinique :</p>
                <p className="text-sm">{lastReview.note}</p>
              </div>
            )}
            {lastReview.referral_needed && (
              <div className="mt-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs font-medium text-orange-700">
                  Vous êtes référé(e) à : {lastReview.referral_hospital || 'un hôpital'}
                </p>
              </div>
            )}
            {lastReview.pdf_url && (
              <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5">
                <a href={`/api${lastReview.pdf_url}`} target="_blank" rel="noreferrer">
                  <FileSignature className="w-3.5 h-3.5" /> Télécharger le compte-rendu signé
                </a>
              </Button>
            )}
          </div>
        </Section>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Ces informations sont communiquées à titre informatif. Pour toute décision médicale,
          consultez un professionnel de santé.
        </p>
      </div>
    </div>
  );
}
