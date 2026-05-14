import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { usePatientAuth } from '@/lib/PatientAuthContext';
import { useTranslation } from '@/lib/useTranslation';
import { FolderOpen, Calendar, ChevronRight, FileText, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import { PageLoading, PageError } from '@/components/shared/PageState';

export default function PatientDashboard() {
  const { t } = useTranslation();
  const { patient } = usePatientAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.patient.sessions();
      setSessions(data);
    } catch (err) {
      setError(err.message || 'Erreur réseau');
      toast.error('Impossible de charger votre dossier');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">
          {t("patient.greeting").replace("%s", patient?.full_name?.split(' ')[0] || '')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("patient.medicalHistory")}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t("patient.questionPrompt")}</p>
          <p className="text-xs text-muted-foreground">{t("patient.chatWithAssistant")}</p>
        </div>
        <Button asChild size="sm">
          <Link to="/patient/chat">{t("patient.chat")}</Link>
        </Button>
      </div>

      <div>
        <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("patient.myConsultations")} ({sessions.length})
        </h2>

        {sessions.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{t("patient.noConsultations")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("patient.consultationsHere")}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {sessions.map((s) => {
            const hasReview = s.medical_reviews?.length > 0;
            const lastReview = s.medical_reviews?.[0];
            return (
              <Link key={s.id} to={`/patient/sessions/${s.id}`}
                className="block bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {t("patient.consultationDate")} {new Date(s.session_date).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'long', year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.session_date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <UrgencyBadge level={s.urgency_level} />
                    </div>

                    {s.recommendations && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {s.recommendations}
                      </p>
                    )}

                    {hasReview && lastReview.referral_needed && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Référé en hôpital
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
