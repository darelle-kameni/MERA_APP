import { useState, useEffect, useRef } from "react";
import { Leaf, AlertTriangle, CheckCircle2, FlaskConical, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/useTranslation";

function buildClinicalContext(vitals, eyeData) {
  const parts = [];
  if (vitals) {
    parts.push(`Signes vitaux: température=${vitals.temperature}°C, SpO2=${vitals.spo2}%, fréquence cardiaque=${vitals.heart_rate}bpm, poids=${vitals.weight}kg.`);
    const anomalies = [];
    if (vitals.temperature > 38.5) anomalies.push("fièvre élevée");
    else if (vitals.temperature > 37.5) anomalies.push("fièvre légère");
    if (vitals.spo2 < 94) anomalies.push("désaturation");
    if (vitals.heart_rate > 120) anomalies.push("tachycardie");
    else if (vitals.heart_rate < 55) anomalies.push("bradycardie");
    if (anomalies.length) parts.push(`Anomalies: ${anomalies.join(", ")}.`);
  }
  if (eyeData) {
    const left = eyeData.eye_left;
    const right = eyeData.eye_right;
    if (left && left.diagnosis && left.diagnosis !== "Sain") parts.push(`Œil gauche: ${left.diagnosis} (confiance ${left.confidence}%).`);
    if (right && right.diagnosis && right.diagnosis !== "Sain") parts.push(`Œil droit: ${right.diagnosis} (confiance ${right.confidence}%).`);
    if (eyeData.alerte) parts.push("Alerte contagion oculaire.");
  }
  return parts.join("\n");
}

function buildTreatmentPrompt(vitals, eyeData) {
  const context = buildClinicalContext(vitals, eyeData);
  return `Tu es un guérisseur traditionnel africain spécialisé en phytothérapie. Tu connais les plantes médicinales d'Afrique de l'Ouest et leurs usages traditionnels.

Données cliniques du patient:
${context || "Aucune donnée clinique disponible, le patient semble en bonne santé."}

Sur la base de ces données, propose UNIQUEMENT des traitements traditionnels africains à base de plantes. Pour chaque traitement suggéré, indique:
1. La maladie ou condition ciblée
2. La ou les plantes utilisées (nom scientifique et nom local)
3. La partie de la plante utilisée
4. La méthode de préparation
5. Le dosage (adulte et enfant si applicable)
6. Les précautions d'usage
7. Le niveau d'urgence (FAIBLE, MODERE, ELEVE)

Format de réponse: un objet JSON valide avec cette structure exacte (sans markdown, sans texte autour):
{
  "treatments": [
    {
      "condition": "nom de la maladie",
      "urgency": "FAIBLE|MODERE|ELEVE",
      "plants": [
        {
          "scientific_name": "nom scientifique",
          "local_name": "nom local",
          "part_used": "partie utilisée",
          "preparation": "méthode de préparation",
          "dosage_adult": "dosage adulte",
          "dosage_child": "dosage enfant",
          "precautions": "précautions"
        }
      ],
      "notes": "notes complémentaires"
    }
  ]
}

Si tout est normal et qu'aucun traitement n'est nécessaire, réponds:
{"treatments": [], "notes": "Aucun traitement traditionnel nécessaire. Continuer le suivi standard."}

Réponds UNIQUEMENT avec le JSON valide, rien d'autre.`;
}

export default function TraditionalTreatmentPanel({ vitals, eyeResults }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const analysedRef = useRef(false);

  useEffect(() => {
    if (!vitals && !eyeResults) return;
    if (analysedRef.current) return;
    analysedRef.current = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const prompt = buildTreatmentPrompt(vitals, eyeResults);
        const result = await base44.integrations.Core.InvokeLLM({ prompt, max_tokens: 2048 });
        const parsed = JSON.parse(result);
        setData(parsed);
      } catch {
        setError(true);
      }
      setLoading(false);
    }
    run();
  }, [vitals, eyeResults]);

  if (!vitals && !eyeResults) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Leaf className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm">Données non disponibles</p>
        <p className="text-xs mt-1">Les signes vitaux et l'analyse oculaire doivent être complétés d'abord</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chargement */}
      {loading && (
        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <div className="w-7 h-7 mx-auto mb-3 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Consultation des plantes médicinales...</p>
        </div>
      )}

      {/* Aucun traitement nécessaire */}
      {data && data.treatments?.length === 0 && !loading && (
        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-success mb-2" />
          <p className="text-sm font-medium text-success">Aucun traitement traditionnel nécessaire</p>
          <p className="text-xs text-muted-foreground mt-1">{data.notes || "Continuer le suivi standard."}</p>
        </div>
      )}

      {/* Fallback local quand l'IA échoue */}
      {error && !loading && !data && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Recommandations non disponibles</p>
              <p className="text-xs text-muted-foreground mt-1">
                {vitals && !eyeResults
                  ? "Signes vitaux enregistrés. Complétez l'analyse oculaire pour des recommandations personnalisées."
                  : eyeResults && !vitals
                    ? "Analyse oculaire disponible. Complétez les signes vitaux pour des recommandations personnalisées."
                    : vitals && eyeResults
                      ? "Patient examiné (signes vitaux + yeux). Consultez un spécialiste pour un traitement adapté."
                      : "Données insuffisantes pour générer des recommandations."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Traitements recommandés */}
      {data?.treatments?.map((treatment, idx) => {
        const isUrgent = treatment.urgency === "ELEVE";
        return (
          <div key={idx} className="bg-card rounded-xl border border-border overflow-hidden">
            {/* En-tête maladie */}
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className={cn("w-4 h-4", isUrgent ? "text-destructive" : "text-success")} />
                <span className="text-sm font-semibold">{treatment.condition}</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                isUrgent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              )}>
                {treatment.urgency === "ELEVE" ? "Urgent" : treatment.urgency === "MODERE" ? "Modéré" : "Faible"}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Alerte urgence */}
              {isUrgent && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      Ce cas nécessite une prise en charge médicale urgente
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Le traitement traditionnel seul est insuffisant. Consultez un centre de santé.
                    </p>
                  </div>
                </div>
              )}

              {/* Plantes */}
              {treatment.plants?.map((plant, pidx) => (
                <div key={pidx} className="border border-border rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{plant.scientific_name}</p>
                      <p className="text-xs text-muted-foreground italic">{plant.local_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Droplets className="w-3 h-3" />
                    <span>Partie utilisée: <strong className="text-foreground">{plant.part_used}</strong></span>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Préparation</p>
                    <p className="text-xs leading-relaxed">{plant.preparation}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-[10px] text-muted-foreground">Dosage adulte</p>
                      <p className="text-xs font-medium">{plant.dosage_adult}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-[10px] text-muted-foreground">Dosage enfant</p>
                      <p className="text-xs font-medium">{plant.dosage_child}</p>
                    </div>
                  </div>

                  {plant.precautions && (
                    <div className="p-2.5 rounded-lg bg-muted border border-border">
                      <p className="text-[10px] font-medium text-muted-foreground">Précautions</p>
                      <p className="text-[11px] text-foreground mt-0.5">{plant.precautions}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Notes */}
              {treatment.notes && (
                <p className="text-[10px] text-muted-foreground italic text-center border-t border-border pt-2">
                  {treatment.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Note de bas de page */}
      {data?.treatments?.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic text-center">
          Ces traitements sont complémentaires — consulter un médecin si pas d'amélioration sous 48h
        </p>
      )}
    </div>
  );
}
