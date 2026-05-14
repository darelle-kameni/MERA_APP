import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ClipboardCheck, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UrgencyBadge from "../components/shared/UrgencyBadge";
import { toast } from "sonner";
import { PageLoading, PageError } from "../components/shared/PageState";
import { buildSignedDiagnosisPdf } from "@/lib/pdfReport";

export default function MedicalReview() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [referralHospital, setReferralHospital] = useState("Hôpital de District");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await base44.entities.DiagnosticSession.filter(
        { status: "en_attente_revue" }, "-created_date",
      );
      setSessions(s);
    } catch (err) {
      setError(err.message || 'Erreur réseau');
      toast.error('Impossible de charger les revues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (session, kind) => {
    if (submitting) return;
    if (!user) { toast.error('Session utilisateur invalide'); return; }
    if (user.role === 'medecin' && !user.signature_url) {
      toast.error('Votre signature numérique est manquante — contactez l\'administrateur');
      return;
    }
    if (kind === 'refer' && !referralHospital.trim()) {
      toast.error("Veuillez préciser l'hôpital de référence");
      return;
    }

    const status = kind === 'refer' ? 'refere' : 'valide';
    setSubmitting(true);
    let pdfUrl = null;

    try {
      // 1. Generate the signed PDF client-side
      const pdfBlob = await buildSignedDiagnosisPdf({
        session, doctor: user, status, note: reviewNote,
        referralHospital: kind === 'refer' ? referralHospital : null,
      });
      const filename = `diagnostic-${session.id.slice(0, 10)}-${Date.now()}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // 2. Upload it
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      pdfUrl = file_url;
    } catch (err) {
      console.error('PDF generation/upload failed', err);
      toast.warning('Le compte-rendu PDF n\'a pas pu être généré, le diagnostic sera enregistré sans PDF');
    }

    try {
      // 3. Create the MedicalReview (backend triggers notification to guardian)
      await base44.entities.MedicalReview.create({
        session_id: session.id,
        status,
        note: reviewNote,
        validated_at: new Date().toISOString(),
        referral_needed: kind === 'refer',
        referral_hospital: kind === 'refer' ? referralHospital : null,
        doctor_id: user.id,
        doctor_name: user.full_name || user.email,
        pdf_url: pdfUrl,
      });
      // 4. Mark the session as reviewed
      await base44.entities.DiagnosticSession.update(session.id, { status: 'revue_complete' });
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      setReviewNote("");
      setExpandedId(null);
      toast.success(kind === 'refer' ? "Enfant référé à l'hôpital" : 'Diagnostic validé', {
        description: pdfUrl ? 'Compte-rendu PDF généré et signé' : undefined,
      });
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  const missingSignature = user?.role === 'medecin' && !user?.signature_url;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          Revue médicale
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {sessions.length} cas en attente de validation
        </p>
      </div>

      {missingSignature && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-900">Signature numérique manquante</p>
            <p className="text-xs text-orange-800/80 mt-0.5">
              Vous ne pourrez pas valider de diagnostic sans signature. Contactez un administrateur.
            </p>
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500/30 mb-3" />
          <p className="text-sm text-muted-foreground">Tous les cas ont été revus</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{session.patient_name || "Enfant anonyme"}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.patient_age ? `${session.patient_age} ans` : ""} • {new Date(session.created_date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UrgencyBadge level={session.urgency_level} />
                {expandedId === session.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {expandedId === session.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                {session.vocal_transcript && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transcription vocale</p>
                    <p className="text-sm">{session.vocal_transcript}</p>
                  </div>
                )}
                {session.recommendations && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-blue-600 mb-1">Recommandations IA</p>
                    <p className="text-sm">{session.recommendations}</p>
                  </div>
                )}
                <Textarea
                  placeholder="Note clinique du médecin (sera incluse dans le PDF signé)..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hôpital de référence (si référence)</p>
                  <input type="text" value={referralHospital}
                    onChange={(e) => setReferralHospital(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" />
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-[11px] text-muted-foreground">
                  <FileSignature className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>Un PDF signé électroniquement avec votre signature sera automatiquement généré et transmis à la famille.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => review(session, 'validate')}
                    disabled={submitting || missingSignature} className="flex-1 h-10 gap-1.5" size="sm">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Valider diagnostic
                  </Button>
                  <Button onClick={() => review(session, 'refer')}
                    disabled={submitting || missingSignature} variant="destructive" className="flex-1 h-10 gap-1.5" size="sm">
                    <AlertTriangle className="w-4 h-4" /> Référer hôpital
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
