import { useState, useEffect, useRef } from "react";
import { Leaf, AlertTriangle, CheckCircle2, FlaskConical, Droplets, ExternalLink, Sparkles, Baby } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/useTranslation";
import { THRESHOLDS } from "@/lib/thresholds";

const SEVERITY_ORDER = { critique: 4, eleve: 3, modere: 2, faible: 1 };
const URGENCY_LABELS = { critique: "Critique", eleve: "Urgent", modere: "Modéré", faible: "Faible" };
const URGENCY_COLORS = { critique: "bg-destructive/10 text-destructive", eleve: "bg-destructive/10 text-destructive", modere: "bg-warning/10 text-warning", faible: "bg-muted text-muted-foreground" };
const EVIDENCE_ORDER = { OMS: 4, clinique: 3, traditionnel_avéré: 2, traditionnel_rapporté: 1 };
const EVIDENCE_LABELS = { OMS: "OMS", clinique: "Clinique", traditionnel_avéré: "Trad. avéré", traditionnel_rapporté: "Trad. rapporté" };
const EVIDENCE_COLORS = { OMS: "bg-success/10 text-success border-success/20", clinique: "bg-info/10 text-info border-info/20", traditionnel_avéré: "bg-warning/10 text-warning border-warning/20", traditionnel_rapporté: "bg-muted text-muted-foreground border-border" };

const MIN_PROBABILITY = 0.5;

const EYE_CONDITIONS = [
  { field: "conjunctivitis_bacterial", keywords: ["Conjonctivite"] },
  { field: "conjunctivitis_viral", keywords: ["Conjonctivite"] },
  { field: "trachoma", keywords: ["Trachome"] },
  { field: "blepharitis_infectious", keywords: ["Blépharite"] },
  { field: "cataract", keywords: ["Cataracte"] },
  { field: "glaucoma", keywords: ["Glaucome"] },
  { field: "myopia", keywords: ["Myopie"] },
  { field: "diabetic_retinopathy", keywords: ["Rétinopathie diabétique", "Diabète"] },
  { field: "jaundice", keywords: ["Jaunisse"] },
  { field: "pterygion", keywords: ["Ptérygion"] },
  { field: "uveitis", keywords: ["Uvéite"] },
];

const HIGH_RISK_CONTRAINDICATION = /(enfants?|nourrisson|pédiatri|grossesse|allergi)/i;
const PEDIATRIC_CONTRAINDICATION = /(enfants?|nourrisson|pédiatri|bébé|mineur)/i;
const PEDIATRIC_AGE_MAX = 18;
const NO_DOSE = /^(non\s*[-–—]?\s*établi|non etabli|n\/?a|inconnu|-|—|aucune)?$/i;

function isHighRiskContraindication(value) {
  return HIGH_RISK_CONTRAINDICATION.test(String(value || ""));
}

function hasPediatricContraindication(value) {
  return PEDIATRIC_CONTRAINDICATION.test(String(value || ""));
}

function isPediatricAge(age) {
  const n = Number(age);
  return Number.isFinite(n) && n >= 0 && n < PEDIATRIC_AGE_MAX;
}

function childDoseMissing(dose) {
  return NO_DOSE.test(String(dose || "").trim());
}

// Une source n'est « vérifiée » que si elle pointe vers un article PubMed
// identifié (PMID) — un lien de type ?term=... reste une simple recherche.
function isVerifiedSource(url) {
  return /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/$/.test(String(url || ""));
}

function toProbability(value) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
}

function isDetected(value) {
  const p = toProbability(value);
  return p != null && p >= MIN_PROBABILITY;
}

function normalizeUrgency(value) {
  const v = String(value || "").toLowerCase();
  return SEVERITY_ORDER[v] ? v : "modere";
}

function getEyeSections(eyeData) {
  if (!eyeData) return { contagious: null, nonContagious: null };
  return {
    contagious: eyeData.contagious || null,
    nonContagious: eyeData.non_contagious || eyeData.nonContagious || null,
  };
}

function buildDiseaseKeywords(vitals, eyeData) {
  const keywords = [];

  if (vitals) {
    if (vitals.temperature > 40) keywords.push("Fièvre", "Paludisme");
    else if (vitals.temperature > 38.5) keywords.push("Fièvre", "Paludisme");
    else if (vitals.temperature > 37.5) keywords.push("Fièvre");
    if (vitals.spo2 != null && vitals.spo2 < 90) keywords.push("Désaturation", "dyspnée");
    else if (vitals.spo2 != null && vitals.spo2 < 94) keywords.push("Désaturation");
    if (vitals.heart_rate > THRESHOLDS.HR_CRITICAL) keywords.push("Tachycardie", "palpitations");
    else if (vitals.heart_rate > THRESHOLDS.HR_MEDIUM) keywords.push("Palpitations");
    else if (vitals.heart_rate < THRESHOLDS.HR_LOW) keywords.push("Bradycardie");
    if (vitals.bmi != null && vitals.bmi < 16) keywords.push("Malnutrition");
  }

  const { contagious, nonContagious } = getEyeSections(eyeData);
  for (const section of [contagious, nonContagious]) {
    if (!section) continue;
    for (const condition of EYE_CONDITIONS) {
      if (isDetected(section[condition.field])) keywords.push(...condition.keywords);
    }
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
        urgency: normalizeUrgency(row.max_severity),
        evidence_level: row.evidence_level || "traditionnel_rapporté",
        plants: [],
        notes: null,
      };
    }
    const cur = map[key];
    if (row.max_severity && (SEVERITY_ORDER[normalizeUrgency(row.max_severity)] || 0) > (SEVERITY_ORDER[cur.urgency] || 0)) {
      cur.urgency = normalizeUrgency(row.max_severity);
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
      contre_indications: row.contre_indications || "",
      source_url: row.source_url || null,
      source: row.source || null,
    });
  }
  const treatments = Object.values(map);
  treatments.sort((a, b) => (SEVERITY_ORDER[b.urgency] || 0) - (SEVERITY_ORDER[a.urgency] || 0));
  return treatments;
}

function buildLLMContext(vitals, eyeData, patientAge) {
  const parts = [];
  if (isPediatricAge(patientAge)) {
    parts.push(`Âge du patient: ${patientAge} ans (patient pédiatrique)`);
  } else if (patientAge != null) {
    parts.push(`Âge du patient: ${patientAge} ans`);
  } else {
    parts.push("Âge du patient: inconnu — traiter comme cas pédiatrique possible");
  }
  if (vitals) {
    parts.push(`Signes vitaux: température=${vitals.temperature}°C, SpO2=${vitals.spo2}%, fréquence cardiaque=${vitals.heart_rate}bpm, poids=${vitals.weight}kg.`);
    const anomalies = [];
    if (vitals.temperature > 38.5) anomalies.push("fièvre élevée");
    else if (vitals.temperature > 37.5) anomalies.push("fièvre légère");
    if (vitals.spo2 < 94) anomalies.push("désaturation");
    if (vitals.heart_rate > THRESHOLDS.HR_CRITICAL) anomalies.push("tachycardie");
    else if (vitals.heart_rate < THRESHOLDS.HR_LOW) anomalies.push("bradycardie");
    if (anomalies.length) parts.push(`Anomalies: ${anomalies.join(", ")}.`);
  }
  const { contagious, nonContagious } = getEyeSections(eyeData);
  for (const [section, label] of [[contagious, "contagieuse"], [nonContagious, "non contagieuse"]]) {
    if (!section) continue;
    const items = [];
    for (const condition of EYE_CONDITIONS) {
      if (!isDetected(section[condition.field])) continue;
      items.push(`${condition.keywords[0].toLowerCase()} ${Math.round(toProbability(section[condition.field]) * 100)}%`);
    }
    if (items.length) parts.push(`Analyse oculaire ${label}: ${items.join(", ")}.`);
  }
  if (contagious?.contagion_alert) parts.push("Alerte contagion oculaire.");
  return parts.join("\n");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesKnownCondition(candidate, knownConditions) {
  const needle = normalizeText(candidate);
  if (!needle) return false;
  return knownConditions.some((condition) => {
    const known = normalizeText(condition);
    if (!known) return false;
    return known.includes(needle) || needle.includes(known);
  });
}

function safetyRules(patientAge) {
  const ageLine = isPediatricAge(patientAge)
    ? `1. Le patient a ${patientAge} ans : c'est ${patientAge < 2 ? 'un nourrisson/un enfant' : "un enfant"}. Si tu n'es pas certain de la posologie pédiatrique pour cet âge, écris "Non établi" — n'invente jamais une dose.`
    : `1. Le patient est potentiellement pédiatrique. Si tu n'es pas certain de la posologie enfant, écris "Non établi" — n'invente jamais une dose.`;
  return `RÈGLES ABSOLUES :
${ageLine}
2. N'invente jamais de référence scientifique ni d'URL. Omets ces champs.
3. En cas de doute sur une plante, ne la propose pas.
4. N'établis pas de diagnostic définitif et ne remplace jamais un traitement médical.`;
}

const OUTPUT_FORMAT = `Format de réponse : un objet JSON valide avec cette structure exacte (sans markdown, sans texte autour) :
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
          "dosage_child": "dosage enfant ou Non établi",
          "precautions": "précautions"
        }
      ],
      "notes": "notes complémentaires"
    }
  ]
}

Si aucune proposition pertinente et sûre n'existe, réponds :
{"treatments": []}

Réponds UNIQUEMENT avec le JSON valide, rien d'autre.`;

function buildLLMPrompt(vitals, eyeData, searched = [], covered = [], patientAge = null) {
  const context = buildLLMContext(vitals, eyeData, patientAge);
  const rules = safetyRules(patientAge);
  const isComplement = covered.length > 0;
  const list = (items) => items.map((c) => `- ${c}`).join("\n");

  const role = `Tu es un expert en pharmacopée et phytothérapie traditionnelles du monde entier. Tu connais les plantes médicinales de toutes les cultures (Afrique de l'Ouest, Afrique de l'Est, Maghreb, Inde/Ayurvéda, Chine, Amérique du Sud, etc.) et leurs usages traditionnels.`;

  const task = isComplement
    ? `Ces pathologies sont DÉJÀ couvertes par des traitements de notre base pharmacopée, avec posologie et source documentée :
${list(covered)}

Ta tâche est de proposer des ALTERNATIVES complémentaires à ces traitements déjà connus, pour ces pathologies uniquement.

${rules}
5. Ne propose JAMAIS une pathologie qui ne figure pas dans la liste ci-dessus. N'invente aucun autre diagnostic.

Pour chaque alternative, indique :
1. La maladie ou condition ciblée (parmi la liste ci-dessus)
2. La ou les plantes utilisées (nom scientifique et nom local)
3. La partie de la plante utilisée
4. La méthode de préparation
5. Le dosage (adulte et enfant si applicable)
6. Les précautions d'usage
7. Le niveau d'urgence (FAIBLE, MODERE, ELEVE)`
    : `Notre base pharmacopée ne contient aucun remède pour ces pathologies détectées chez le patient :
${list(searched)}

Propose les traitements traditionnels à base de plantes traditionnellement utilisés pour ce type de signes, en t'appuyant uniquement sur le tableau clinique ci-dessus. Ne propose aucune autre pathologie que celles que ces signes décrivent.

${rules}

Pour chaque traitement, indique :
1. La maladie ou condition ciblée, déduite du tableau clinique
2. La ou les plantes utilisées (nom scientifique et nom local)
3. La partie de la plante utilisée
4. La méthode de préparation
5. Le dosage (adulte et enfant si applicable)
6. Les précautions d'usage
7. Le niveau d'urgence (FAIBLE, MODERE, ELEVE)`;

  return `${role}

Données cliniques du patient:
${context || "Aucune donnée clinique disponible."}

${task}

${OUTPUT_FORMAT}`;
}

async function buildSuggestions(searched, covered, vitals, eyeData, patientAge = null) {
  try {
    const prompt = buildLLMPrompt(vitals, eyeData, searched, covered, patientAge);
    const result = await base44.integrations.Core.InvokeLLM({ prompt, max_tokens: 2048 });
    const parsed = JSON.parse(result);
    const isComplement = covered.length > 0;
    const kept = (parsed?.treatments || [])
      .filter((t) => Array.isArray(t?.plants) && t.plants.length)
      .filter((t) => (isComplement ? matchesKnownCondition(t.condition, covered) : true))
      .map((t) => ({ ...t, urgency: normalizeUrgency(t.urgency) }));
    return kept.length ? kept : null;
  } catch {
    return null;
  }
}

export default function TraditionalTreatmentPanel({ vitals, eyeResults, patientAge = null }) {
  const { t } = useTranslation();
  const pediatric = isPediatricAge(patientAge);
  const weight = vitals?.weight ?? null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // "db" | "none"
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

        if (keywords.length === 0) {
          setData({
            treatments: [],
            emptyKind: "healthy",
            notes: "Aucune anomalie détectée au-dessus des seuils. Continuer le suivi standard.",
          });
          setSource("none");
          setLoading(false);
          return;
        }

        const resp = await base44.treatments.search(keywords);
        const grouped = groupTreatments(resp.treatments);

        if (grouped.length === 0) {
          setData({
            treatments: [],
            emptyKind: "none",
            notes: "Notre base ne couvre pas ce tableau clinique. Ces propositions sont générées par IA et n'ont pas été validées.",
          });
          setSource("none");

          const suggestions = await buildSuggestions(keywords, [], vitals, eyeResults, patientAge);
          if (suggestions) setData((current) => ({ ...current, complement: suggestions }));
          setLoading(false);
          return;
        }

        setData({ treatments: grouped, notes: "Traitements issus de la pharmacopée traditionnelle" });
        setSource("db");

        const covered = grouped.map((g) => g.condition);
        const complement = await buildSuggestions(keywords, covered, vitals, eyeResults, patientAge);
        if (complement) setData((current) => ({ ...current, complement }));
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
      {pediatric && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <Baby className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">
              Patient de {patientAge} ans — lecture pédiatrique
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Les posologies enfant et les contre-indications pédiatriques sont signalées ci-dessous.
              Une posologie marquée « Non établi » ne doit jamais être administrée sans avis médical.
              {weight != null ? ` Poids de référence : ${weight} kg.` : ""}
            </p>
          </div>
        </div>
      )}
      {loading && (
        <div className="bg-card rounded-xl border border-border p-5 text-center">
          <div className="w-7 h-7 mx-auto mb-3 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Consultation de la pharmacopée...</p>
        </div>
      )}

      {data && data.treatments?.length === 0 && !loading && !data.complement?.length && (
        <div className="bg-card rounded-xl border border-border p-5 text-center">
          {data.emptyKind === "healthy" ? (
            <>
              <CheckCircle2 className="w-8 h-8 mx-auto text-success mb-2" />
              <p className="text-sm font-medium text-success">Aucune anomalie détectée</p>
              <p className="text-xs text-muted-foreground mt-1">{data.notes || "Continuer le suivi standard."}</p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Aucun remède de la base ne correspond</p>
              <p className="text-xs text-muted-foreground mt-1">{data.notes}</p>
            </>
          )}
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
        const urgency = normalizeUrgency(treatment.urgency);
        const isUrgent = urgency === "eleve" || urgency === "critique";
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
                URGENCY_COLORS[urgency] || "bg-muted text-muted-foreground"
              )}>
                {URGENCY_LABELS[urgency] || urgency}
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

              {treatment.plants?.map((plant, pidx) => {
                const highRisk = isHighRiskContraindication(plant.contre_indications);
                const pediatricCI = pediatric && hasPediatricContraindication(plant.contre_indications);
                const missingChildDose = pediatric && childDoseMissing(plant.dosage_child);
                return (
                <div key={pidx} className="border border-border rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{plant.scientific_name}</p>
                      </div>
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
                    <div className={cn("p-2 rounded-lg", missingChildDose ? "bg-destructive/5 border border-destructive/30" : "bg-muted")}>
                      <p className={cn("text-[10px]", missingChildDose ? "text-destructive font-medium" : "text-muted-foreground")}>Dosage enfant</p>
                      <p className={cn("text-xs font-medium", missingChildDose && "text-destructive")}>
                        {childDoseMissing(plant.dosage_child) ? "Non établi" : plant.dosage_child}
                      </p>
                    </div>
                  </div>

                  {missingChildDose && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/30">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-destructive font-medium">
                        Posologie enfant non établie pour un patient de {patientAge} ans : ne pas administrer sans avis médical.
                      </p>
                    </div>
                  )}

                  {pediatric && !missingChildDose && weight != null && (
                    <p className="text-[10px] text-muted-foreground">
                      Posologie enfant à vérifier selon le poids de l'enfant ({weight} kg).
                    </p>
                  )}

                  {plant.precautions && (
                    <div className="p-2.5 rounded-lg bg-muted border border-border">
                      <p className="text-[10px] font-medium text-muted-foreground">Précautions</p>
                      <p className="text-[11px] text-foreground mt-0.5 whitespace-pre-wrap">{plant.precautions}</p>
                    </div>
                  )}

                  {pediatricCI && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/30">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-destructive font-medium">
                        Contre-indication pédiatrique : ce remède est signalé contre-indiqué ou déconseillé
                        chez l'enfant (patient de {patientAge} ans). Avis médical requis avant toute administration.
                      </p>
                    </div>
                  )}

                  {plant.contre_indications && (
                    <div className={cn(
                      "p-2.5 rounded-lg border",
                      highRisk ? "bg-destructive/5 border-destructive/30" : "bg-muted border-border"
                    )}>
                      <p className={cn(
                        "text-[10px] font-medium",
                        highRisk ? "text-destructive" : "text-muted-foreground"
                      )}>
                        Contre-indications
                      </p>
                      <p className="text-[11px] text-foreground mt-0.5 whitespace-pre-wrap">
                        {plant.contre_indications}
                      </p>
                    </div>
                  )}

                  {plant.source_url && (
                    <a
                      href={plant.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>
                        {isVerifiedSource(plant.source_url)
                          ? "Référence PubMed (article identifié)"
                          : "Recherche PubMed (référence non vérifiée)"}
                      </span>
                    </a>
                  )}
                </div>
              );
              })}

              {treatment.notes && (
                <p className="text-[10px] text-muted-foreground italic text-center border-t border-border pt-2">
                  {treatment.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {data?.complement?.length > 0 && (() => {
        const isStandalone = !data.treatments?.length;
        return (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/60 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">
                {isStandalone ? "Propositions IA non vérifiées" : "Compléments IA non vérifiés"}
              </span>
            </div>
            <div className="p-3.5 space-y-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isStandalone
                  ? "Aucun remède de la base pharmacopée n'a été trouvé pour ce tableau clinique. Ces propositions viennent d'un modèle d'IA : ni les plantes ni les posologies n'ont pas été validées. À ne pas administrer sans validation par un professionnel de santé."
                  : "Ces propositions s'ajoutent aux traitements de la base ci-dessus pour les mêmes pathologies. Elles viennent d'un modèle d'IA : ni les plantes ni les posologies n'ont pas été validées. À ne pas administrer sans validation par un professionnel de santé."}
              </p>
              {data.complement.map((treatment, tidx) => {
                const urgency = normalizeUrgency(treatment.urgency);
                const isUrgent = urgency === "eleve" || urgency === "critique";
                return (
                  <div key={tidx} className="border border-border/60 rounded-lg p-2.5 space-y-2 bg-card/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{treatment.condition}</span>
                      {isUrgent ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium shrink-0">
                          {URGENCY_LABELS[urgency]}
                        </span>
                      ) : null}
                    </div>

                    {treatment.plants?.map((plant, pidx) => (
                      <div key={pidx} className="text-[11px] text-muted-foreground space-y-1">
                        <p className="text-foreground">
                          {plant.scientific_name}
                        </p>
                        {plant.part_used && <p>Partie utilisée: {plant.part_used}</p>}
                        {plant.preparation && <p className="text-foreground/80">{plant.preparation}</p>}
                        <p>
                          Adulte: {plant.dosage_adult || "Non établi"}
                          {plant.dosage_child ? ` · Enfant: ${plant.dosage_child}` : ""}
                        </p>
                        {pediatric && childDoseMissing(plant.dosage_child) && (
                          <p className="text-destructive font-medium">
                            Posologie enfant non établie ({patientAge} ans) — ne pas administrer sans avis médical.
                          </p>
                        )}
                        {plant.precautions && <p className="whitespace-pre-wrap">Précautions: {plant.precautions}</p>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {source === "db" && data?.treatments?.length > 0 && (() => {
        const plants = data.treatments.flatMap((tr) => tr.plants || []);
        const verified = plants.filter((p) => isVerifiedSource(p.source_url)).length;
        const pending = plants.length - verified;
        return (
          <p className="text-[10px] text-muted-foreground italic text-center">
            Traitements issus de la pharmacopée traditionnelle — {verified} référence(s) PubMed identifiée(s)
            sur {plants.length} plante(s)
            {pending > 0 ? ` ; ${pending} sans article identifié (simple lien de recherche PubMed)` : ""}
          </p>
        );
      })()}
      {data?.treatments?.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic text-center">
          Ces traitements sont complémentaires — consulter un médecin si pas d'amélioration sous 48h
        </p>
      )}
    </div>
  );
}
