import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import UrgencyBadge from "../components/shared/UrgencyBadge";
import { toast } from "sonner";
import { useTranslation } from "@/lib/useTranslation";

export default function MedicalReview() {
  const [sessions, setSessions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    async function load() {
      const [s, r] = await Promise.all([
        base44.entities.DiagnosticSession.filter({ status: "en_attente_revue" }, "-created_date"),
        base44.entities.MedicalReview.list("-created_date", 50),
      ]);
      setSessions(s);
      setReviews(r);
      setLoading(false);
    }
    load();
  }, []);

  const handleValidate = async (session) => {
    await base44.entities.MedicalReview.create({
      session_id: session.id,
      status: "valide",
      note: reviewNote,
      validated_at: new Date().toISOString(),
      referral_needed: false,
    });
    await base44.entities.DiagnosticSession.update(session.id, { status: "revue_complete" });
    setSessions(prev => prev.filter(s => s.id !== session.id));
    setReviewNote("");
    setExpandedId(null);
    toast.success("Diagnostic validé");
  };

  const handleRefer = async (session) => {
    await base44.entities.MedicalReview.create({
      session_id: session.id,
      status: "refere",
      note: reviewNote,
      validated_at: new Date().toISOString(),
      referral_needed: true,
      referral_hospital: "Hôpital de District",
    });
    await base44.entities.DiagnosticSession.update(session.id, { status: "revue_complete" });
    setSessions(prev => prev.filter(s => s.id !== session.id));
    setReviewNote("");
    setExpandedId(null);
    toast.success("Patient référé à l'hôpital");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          {t("nav.review", "Revue médicale")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {sessions.length} {t("medical.pendingCases", "cas en attente de validation")}
        </p>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500/30 mb-3" />
          <p className="text-sm text-muted-foreground">{t("medical.allReviewed", "Tous les cas ont été revus")}</p>
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
                  <p className="font-medium text-sm">{session.patient_name || t("common.anonymous", "Patient anonyme")}</p>
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
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("medical.vocalTranscript", "Transcription vocale")}</p>
                    <p className="text-sm">{session.vocal_transcript}</p>
                  </div>
                )}
                {session.recommendations && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-blue-600 mb-1">{t("medical.aiRecommendations", "Recommandations IA")}</p>
                    <p className="text-sm">{session.recommendations}</p>
                  </div>
                )}
                <Textarea 
                  placeholder={t("medical.clinicalNote", "Note clinique du médecin...")}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleValidate(session)} className="flex-1 h-10" size="sm">
                    <CheckCircle className="w-4 h-4 mr-1.5" /> {t("medical.validateDiagnosis", "Valider diagnostic")}
                  </Button>
                  <Button onClick={() => handleRefer(session)} variant="destructive" className="flex-1 h-10" size="sm">
                    <AlertTriangle className="w-4 h-4 mr-1.5" /> {t("medical.referHospital", "Référer hôpital")}
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