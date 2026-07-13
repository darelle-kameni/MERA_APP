import { useState, useEffect, useRef } from "react";
import { Leaf, AlertTriangle, CheckCircle2, FlaskConical, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/useTranslation";

const SEVERITY_ORDER = { eleve: 3, modere: 2, faible: 1 };
const URGENCY_LABELS = { eleve: "Urgent", modere: "Modéré", faible: "Faible" };
const URGENCY_COLORS = { eleve: "bg-destructive/10 text-destructive", modere: "bg-warning/10 text-warning", faible: "bg-muted text-muted-foreground" };
const EVIDENCE_ORDER = { OMS: 4, clinique: 3, traditionnel_avéré: 2, traditionnel_rapporté: 1 };
const EVIDENCE_LABELS = { OMS: "OMS", clinique: "Clinique", traditionnel_avéré: "Trad. avéré", traditionnel_rapporté: "Trad. rapporté" };
const EVIDENCE_COLORS = { OMS: "bg-success/10 text-success border-success/20", clinique: "bg-info/10 text-info border-info/20", traditionnel_avéré: "bg-warning/10 text-warning border-warning/20", traditionnel_rapporté: "bg-muted text-muted-foreground border-border" };

function buildDiseaseKeywords(vitals, eyeData) {
  const keywords = [];

  if (vitals) {
    if (vitals.temperature > 40) keywords.push("Fièvre", "Paludisme");
    else if (vitals.temperature > 38.5) keywords.push("Fièvre", "Paludisme");
    else if (vitals.temperature > 37.5) keywords.push("Fièvre");
    if (vitals.spo2 != null && vitals.spo2 < 90) keywords.push("Désaturation", "dyspnée");
    else if (vitals.spo2 != null && vitals.spo2 < 94) keywords.push("Désaturation");
    if (vitals.heart_rate > 120) keywords.push("Tachycardie", "palpitations");
    else if (vitals.heart_rate > 100) keywords.push("Palpitations");
    else if (vitals.heart_rate < 55) keywords.push("Bradycardie");
    if (vitals.bmi != null && vitals.bmi < 16) keywords.push("Malnutrition");
  }

  if (eyeData) {
    const c = eyeData.contagious;
    if (c) {
      if (c.conjunctivitis_bacterial != null) keywords.push("Conjonctivite");
      if (c.trachoma != null) keywords.push("Trachome");
      if (c.blepharitis_infectious != null) keywords.push("Blépharite");
    }
    const n = eyeData.non_contagious;
    if (n) {
      if (n.cataract != null) keywords.push("Cataracte");
      if (n.glaucoma != null) keywords.push("Glaucome");
      if (n.myopia != null) keywords.push("Myopie");
      if (n.diabetic_retinopathy != null) keywords.push("Rétinopathie diabétique", "Diabète");
      if (n.jaundice != null) keywords.push("Jaunisse");
      if (n.pterygion != null) keywords.push("Ptérygion");
      if (n.uveitis != null) keywords.push("Uvéite");
    }
    if (eyeData.alerte) keywords.push("Infection cutanée");
  }

  const seen = new Set();
  return keywords.filter((k) => {
    const lower = k.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function groupTreatments(rows) {
  const map = {};
  for (const row of rows) {
    const key = row.disease;
    if (!map[key]) {
      map[key] = {
        condition: key,
        urgency: row.max_severity || "modere",
        evidence_level: row.evidence_level || "traditionnel_rapporté",
        plants: [],
        notes: null,
      };
    }
    const cur = map[key];
    if (row.max_severity && SEVERITY_ORDER[row.max_severity] > SEVERITY_ORDER[cur.urgency]) {
      cur.urgency = row.max_severity;
    }
    if (row.evidence_level && EVIDENCE_ORDER[row.evidence_level] > EVIDENCE_ORDER[cur.evidence_level]) {
      cur.evidence_level = row.evidence_level;
    }
    cur.plants.push({
      scientific_name: row.plant_name_fr,
      local_name: row.plant_name_local || "",
      part_used: row.part_used || "",
      preparation: row.preparation || "",
      dosage_adult: row.dosage_adult || "",
      dosage_child: row.dosage_child || "",
      precautions: row.precautions || "",
    });
  }
  const treatments = Object.values(map);
  treatments.sort((a, b) => (SEVERITY_ORDER[b.urgency] || 0) - (SEVERITY_ORDER[a.urgency] || 0));
  return treatments;
}

function buildLLMContext(vitals, eyeData) {
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
    const c = eyeData.contagious;
    if (c) {
      const items = [];
      if (c.conjunctivitis_bacterial != null) items.push(`conjonctivite bactérienne ${c.conjunctivitis_bacterial}%`);
      if (c.conjunctivitis_viral != null) items.push(`conjonctivite virale ${c.conjunctivitis_viral}%`);
      if (c.trachoma != null) items.push(`trachome ${c.trachoma}%`);
      if (c.blepharitis_infectious != null) items.push(`blépharite infectieuse ${c.blepharitis_infectious}%`);
      if (items.length) parts.push(`Analyse oculaire contagieuse: ${items.join(", ")}.`);
      if (c.contagion_alert) parts.push("Alerte contagion oculaire.");
    }
    const n = eyeData.non_contagious;
    if (n) {
      const items = [];
      if (n.cataract != null) items.push(`cataracte ${n.cataract}%`);
      if (n.glaucoma != null) items.push(`glaucome ${n.glaucoma}%`);
      if (n.myopia != null) items.push(`myopie ${n.myopia}%`);
      if (n.diabetic_retinopathy != null) items.push(`rétinopathie diabétique ${n.diabetic_retinopathy}%`);
      if (n.jaundice != null) items.push(`jaunisse ${n.jaundice}%`);
      if (items.length) parts.push(`Analyse oculaire non contagieuse: ${items.join(", ")}.`);
    }
  }
  return parts.join("\n");
}

function buildLLMPrompt(vitals, eyeData) {
  const context = buildLLMContext(vitals, eyeData);
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
  const [source, setSource] = useState(null); // "db" | "llm"
  const analysedRef = useRef(false);

  useEffect(() => {
    if (!vitals && !eyeResults) return;
    if (analysedRef.current) return;
    analysedRef.current = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const keywords = buildDiseaseKeywords(vitals, eyeResults);

        if (keywords.length > 0) {
          const resp = await base44.treatments.search(keywords);
          const grouped = groupTreatments(resp.treatments);

          if (grouped.length > 0) {
            setData({ treatments: grouped, notes: "Traitements issus de la pharmacopée traditionnelle" });
            setSource("db");
            setLoading(false);
            return;
          }
        }

        // Fallback LLM
        const prompt = buildLLMPrompt(vitals, eyeResults);
        const result = await base44.integrations.Core.InvokeLLM({ prompt, max_tokens: 2048 });
        const parsed = JSON.parse(result);
        setData(parsed);
        setSource("llm");
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
      {loading && (
        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <div className="w-7 h-7 mx-auto mb-3 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Consultation de la pharmacopée...</p>
        </div>
      )}

      {data && data.treatments?.length === 0 && !loading && (
        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-success mb-2" />
          <p className="text-sm font-medium text-success">Aucun traitement traditionnel nécessaire</p>
          <p className="text-xs text-muted-foreground mt-1">{data.notes || "Continuer le suivi standard."}</p>
        </div>
      )}

      {error && !loading && !data && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Recommandations non disponibles</p>
              <p className="text-xs text-muted-foreground mt-1">
                {vitals && eyeResults
                  ? "Patient examiné. Consultez un spécialiste pour un traitement adapté."
                  : "Données insuffisantes pour générer des recommandations."}
              </p>
            </div>
          </div>
        </div>
      )}

      {data?.treatments?.map((treatment, idx) => {
        const isUrgent = treatment.urgency === "ELEVE";
        return (
          <div key={idx} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className={cn("w-4 h-4", isUrgent ? "text-destructive" : "text-success")} />
                <span className="text-sm font-semibold">{treatment.condition}</span>
                {treatment.evidence_level && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium border hidden sm:inline-block", EVIDENCE_COLORS[treatment.evidence_level])}>
                    {EVIDENCE_LABELS[treatment.evidence_level]}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                URGENCY_COLORS[treatment.urgency] || "bg-muted text-muted-foreground"
              )}>
                {URGENCY_LABELS[treatment.urgency] || treatment.urgency}
              </span>
            </div>

            <div className="p-4 space-y-3">
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
                      <p className="text-[11px] text-foreground mt-0.5 whitespace-pre-wrap">{plant.precautions}</p>
                    </div>
                  )}
                </div>
              ))}

              {treatment.notes && (
                <p className="text-[10px] text-muted-foreground italic text-center border-t border-border pt-2">
                  {treatment.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {source === "db" && data?.treatments?.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic text-center">
          Traitements issus de la pharmacopée traditionnelle — données sourcées (OMS, PROTA, pharmacopée africaine)
        </p>
      )}
      {source === "llm" && data?.treatments?.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic text-center">
          Recommandation générée par IA — à vérifier auprès d'un spécialiste
        </p>
      )}
      {data?.treatments?.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic text-center">
          Ces traitements sont complémentaires — consulter un médecin si pas d'amélioration sous 48h
        </p>
      )}
    </div>
  );
}
