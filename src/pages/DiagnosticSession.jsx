import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { Activity, Eye, Brain, Leaf, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/useTranslation";
import VitalSignsPanel from "../components/diagnostic/VitalSignsPanel";
import EyeAnalysisPanel from "../components/diagnostic/EyeAnalysisPanel";
import SystemicPredictionPanel from "../components/diagnostic/SystemicPredictionPanel";
import TraditionalTreatmentPanel from "../components/diagnostic/TraditionalTreatmentPanel";
import ConversationPanel from "../components/diagnostic/ConversationPanel";

export default function DiagnosticSession() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient_id");

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const { t } = useTranslation();
  const [vitalsData, setVitalsData] = useState(null);
  const [eyeData, setEyeData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!paramId && !patientId) return;
    loadData(paramId || patientId);
  }, [paramId, patientId]);

  async function loadData(id) {
    setLoading(true);
    try {
      if (paramId) {
        const session = await base44.entities.DiagnosticSession.get(paramId);
        setSelectedSession(session);
        setSessions([session]);
        await loadSessionDetails(session);
      } else {
        const list = await base44.entities.DiagnosticSession.filter(
          { patient_id: id },
          "-created_date",
          50
        );
        setSessions(list);
        if (list.length > 0) {
          setSelectedSession(list[0]);
          await loadSessionDetails(list[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load session data", e);
    }
    setLoading(false);
  }

  async function loadSessionDetails(session) {
    try {
      const [vitals, contagious, nonContagious] = await Promise.all([
        base44.entities.VitalSigns.filter({ session_id: session.id }),
        base44.entities.ContagiousEyeResult.filter({ session_id: session.id }),
        base44.entities.NonContagiousEyeResult.filter({ session_id: session.id }),
      ]);
      setVitalsData(vitals[0] || null);
      setEyeData({
        contagious: contagious[0] || null,
        nonContagious: nonContagious[0] || null,
        eye_left: session.eye_left_diagnosis ? { diagnosis: session.eye_left_diagnosis, confidence: session.eye_left_confidence } : null,
        eye_right: session.eye_right_diagnosis ? { diagnosis: session.eye_right_diagnosis, confidence: session.eye_right_confidence } : null,
        alerte: session.alerte,
      });
    } catch (e) {
      console.error("Failed to load session details", e);
    }
  }

  async function selectSession(session) {
    setSelectedSession(session);
    setVitalsData(null);
    setEyeData(null);
    await loadSessionDetails(session);
  }

  const isEmpty = !loading && !selectedSession;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t("diagnostic.title", "Session de diagnostic")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedSession
              ? `${selectedSession.patient_name || "Patient"} • ${new Date(selectedSession.session_date || selectedSession.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : patientId ? `Patient #${patientId}` : t("diagnostic.demo", "Session de démonstration")}
          </p>
        </div>
      </div>

      {/* History */}
      {sessions.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-1.5">
          <div className="flex items-center gap-1 overflow-x-auto">
            <Clock className="w-3.5 h-3.5 text-muted-foreground ml-2 flex-shrink-0" />
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all",
                  selectedSession?.id === s.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {new Date(s.session_date || s.created_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  s.urgency_level === "CRITIQUE" ? "bg-destructive" :
                  s.urgency_level === "ELEVE" ? "bg-warning" :
                  s.urgency_level === "MODERE" ? "bg-accent" : "bg-success"
                )} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="vitals" className="w-full">
        <TabsList className="w-full flex overflow-x-auto bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="vitals" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Activity className="w-3.5 h-3.5" /> {t("diagnostic.vitals", "Signes vitaux")}
          </TabsTrigger>
          <TabsTrigger value="eye" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Eye className="w-3.5 h-3.5" /> {t("diagnostic.eye", "Analyse oculaire")}
          </TabsTrigger>
          <TabsTrigger value="prediction" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Brain className="w-3.5 h-3.5" /> {t("diagnostic.predictions", "Prédictions")}
          </TabsTrigger>
          <TabsTrigger value="treatment" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Leaf className="w-3.5 h-3.5" /> {t("diagnostic.treatments", "Traitements")}
          </TabsTrigger>
          <TabsTrigger value="conversation" className="gap-1.5 text-xs flex-1 min-w-fit">
            <MessageSquare className="w-3.5 h-3.5" /> {t("diagnostic.dialogue", "Dialogue")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="mt-4">
          <VitalSignsPanel sessionData={vitalsData} />
        </TabsContent>

        <TabsContent value="eye" className="mt-4">
          <EyeAnalysisPanel sessionData={eyeData} />
        </TabsContent>

        <TabsContent value="prediction" className="mt-4">
          <SystemicPredictionPanel vitals={vitalsData} eyeResults={eyeData} />
        </TabsContent>

        <TabsContent value="treatment" className="mt-4">
          <TraditionalTreatmentPanel vitals={vitalsData} eyeResults={eyeData} />
        </TabsContent>

        <TabsContent value="conversation" className="mt-4">
          <ConversationPanel />
        </TabsContent>
      </Tabs>

      {isEmpty && (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm">{t("diagnostic.noSession", "Aucune session trouvée")}</p>
          <p className="text-xs mt-1">{t("diagnostic.selectPatient", "Sélectionnez un patient pour voir ses sessions")}</p>
        </div>
      )}
    </div>
  );
}
