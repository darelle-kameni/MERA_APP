import { useState, useEffect, useRef } from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/useTranslation";

function buildVitalsSummary(vitals) {
  if (!vitals) return [];
  const findings = [];
  if (vitals.temperature > 38.5) findings.push({ label: "Fièvre", value: `${vitals.temperature}°C`, severity: "high" });
  else if (vitals.temperature > 37.5) findings.push({ label: "Température élevée", value: `${vitals.temperature}°C`, severity: "medium" });
  if (vitals.spo2 < 94) findings.push({ label: "Désaturation", value: `${vitals.spo2}%`, severity: "high" });
  else if (vitals.spo2 < 96) findings.push({ label: "SpO2 limite", value: `${vitals.spo2}%`, severity: "medium" });
  if (vitals.heart_rate > 120) findings.push({ label: "Tachycardie", value: `${vitals.heart_rate} bpm`, severity: "high" });
  else if (vitals.heart_rate < 55) findings.push({ label: "Bradycardie", value: `${vitals.heart_rate} bpm`, severity: "high" });
  else if (vitals.heart_rate > 100) findings.push({ label: "Pouls élevé", value: `${vitals.heart_rate} bpm`, severity: "medium" });
  return findings;
}

function buildEyeSummary(eyeData) {
  if (!eyeData) return [];
  const findings = [];
  const left = eyeData.eye_left;
  const right = eyeData.eye_right;
  if (left && left.diagnosis && left.diagnosis !== "Sain") findings.push({ label: `OD: ${left.diagnosis}`, value: `${Math.round(left.confidence * 100)}%`, severity: left.confidence > 0.8 ? "high" : "medium" });
  if (right && right.diagnosis && right.diagnosis !== "Sain") findings.push({ label: `OG: ${right.diagnosis}`, value: `${Math.round(right.confidence * 100)}%`, severity: right.confidence > 0.8 ? "high" : "medium" });
  if (eyeData.alerte) findings.push({ label: "Alerte ophtalmique", value: "Active", severity: "high" });
  return findings;
}

function determineUrgency(vitalsFindings, eyeFindings) {
  const all = [...vitalsFindings, ...eyeFindings];
  if (all.some((f) => f.severity === "high")) return "ELEVE";
  if (all.some((f) => f.severity === "medium")) return "MODERE";
  return "NORMAL";
}

function getAIAnalysis(vitals, eyeData, urgency) {
  const parts = [];
  if (vitals) {
    parts.push(`Signes vitaux: température=${vitals.temperature}°C, SpO2=${vitals.spo2}%, fréquence cardiaque=${vitals.heart_rate}bpm, poids=${vitals.weight}kg.`);
  }
  if (eyeData) {
    const left = eyeData.eye_left;
    const right = eyeData.eye_right;
    if (left) parts.push(`Œil gauche: ${left.diagnosis || "non évalué"} (confiance ${((left.confidence || 0) * 100).toFixed(0)}%).`);
    if (right) parts.push(`Œil droit: ${right.diagnosis || "non évalué"} (confiance ${((right.confidence || 0) * 100).toFixed(0)}%).`);
    if (eyeData.alerte) parts.push("Alerte contagion détectée.");
  }
  return `Analyse diagnostique pour le patient.
Données cliniques:
${parts.join("\n")}

Urgence: ${urgency}.

Sur la base de ces seules données, rédige un avis médical concis (4-5 lignes max) :
- Résume l'état général du patient
- Mentionne les anomalies significatives si présentes
- Donne une recommandation clinique appropriée
- Si tout est normal, rassure et recommande un suivi standard

Réponse en français, sans formule d'appel, sans signature.`;
}

export default function SystemicPredictionPanel({ vitals: vitalsProp, eyeResults: eyeProp }) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const analysedRef = useRef(false);

  const vitalsFindings = buildVitalsSummary(vitalsProp);
  const eyeFindings = buildEyeSummary(eyeProp);
  const allFindings = [...vitalsFindings, ...eyeFindings];
  const urgency = determineUrgency(vitalsFindings, eyeFindings);

  useEffect(() => {
    if (!vitalsProp && !eyeProp) return;
    if (analysedRef.current) return;
    analysedRef.current = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const prompt = getAIAnalysis(vitalsProp, eyeProp, urgency);
        const result = await base44.integrations.Core.InvokeLLM({ prompt, max_tokens: 512 });
        setAnalysis(result);
      } catch {
        setError(true);
      }
      setLoading(false);
    }
    run();
  }, [vitalsProp, eyeProp, urgency]);

  if (!vitalsProp && !eyeProp) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Activity className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm">Mesures non disponibles</p>
        <p className="text-xs mt-1">Les signes vitaux et l'analyse oculaire doivent être complétés d'abord</p>
      </div>
    );
  }

  const foundUrgent = allFindings.some(f => f.severity === "high");
  const isHealthy = allFindings.length === 0;

  return (
    <div className="space-y-3">
      {/* Avis clinique */}
      {loading && (
        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <div className="w-7 h-7 mx-auto mb-3 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Analyse des données en cours...</p>
        </div>
      )}

      {(analysis || error) && !loading && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Avis clinique
          </h3>
          {analysis ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{analysis}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {vitalsProp && eyeProp
                ? "Analyse IA non disponible — patient examiné, paramètres enregistrés."
                : vitalsProp
                  ? "Seuls les signes vitaux sont disponibles. Complétez l'analyse oculaire."
                  : "Seule l'analyse oculaire est disponible. Complétez les signes vitaux."}
            </p>
          )}
        </div>
      )}

      {/* Statut global - ligne discrète */}
      {!loading && (
        <div className={cn(
          "flex items-center gap-2.5 px-4 py-3 rounded-xl border",
          foundUrgent ? "border-destructive/20 bg-destructive/5" :
          isHealthy ? "border-border" : "border-border"
        )}>
          {foundUrgent ? (
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          ) : isHealthy ? (
            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          ) : (
            <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={cn(
            "text-sm font-medium",
            foundUrgent ? "text-destructive" :
            isHealthy ? "text-success" : "text-muted-foreground"
          )}>
            {foundUrgent ? "Point d'attention détecté — revoir les paramètres" :
             isHealthy ? "Tous les paramètres sont dans les normes" :
             "Surveillance recommandée"}
          </span>
        </div>
      )}

      {/* Points d'attention */}
      {allFindings.length > 0 && !loading && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
              Points d'attention
            </h3>
          </div>
          <div className="divide-y divide-border">
            {allFindings.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium">{f.label}</span>
                <span className={cn(
                  "text-xs font-semibold",
                  f.severity === "high" ? "text-destructive" :
                  f.severity === "medium" ? "text-warning" : "text-success"
                )}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
