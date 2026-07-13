import { useState, useEffect } from "react";
import { Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/useTranslation";

// Mots-clés normalisés utilisés pour la simulation. Le rendu utilise t("eye.diseases.<key>") quand possible.
const DIAG_KEYS = ["healthy", "cataract", "conjunctivite", "glaucoma", "diabetic_retinopathy", "pterygion", "trachoma", "uveitis"];

function randomDiagnosis() {
  const key = DIAG_KEYS[Math.floor(Math.random() * DIAG_KEYS.length)];
  const conf = +((70 + Math.random() * 28) / 100).toFixed(4);
  return { diagnosisKey: key, confidence: conf };
}

function getTopDiagnosis(contagious, nonContagious) {
  const diseases = [];
  if (contagious) {
    for (const [key, val] of Object.entries(contagious)) {
      if (["contagion_alert", "id", "session_id", "created_date", "updated_date"].includes(key)) continue;
      if (typeof val === "number" && val > 0) diseases.push({ key, prob: val });
    }
  }
  if (nonContagious) {
    for (const [key, val] of Object.entries(nonContagious)) {
      if (["id", "session_id", "created_date", "updated_date"].includes(key)) continue;
      if (typeof val === "number" && val > 0) diseases.push({ key, prob: val });
    }
  }
  if (diseases.length === 0) return null;
  diseases.sort((a, b) => b.prob - a.prob);
  return diseases[0];
}

const diagnosisLabel = (t, raw) => {
  if (!raw) return null;
  // raw peut être une clé (ex. "cataract" / "healthy") ou un libellé français déjà traduit (ex. "Sain")
  if (typeof raw !== "string") return raw;
  if (raw === "healthy" || raw === "Sain") return t("eye.healthy");
  // tentative de mapping via eye.diseases.<key>
  const mapped = t(`eye.diseases.${raw}`, raw);
  return mapped;
};

export default function EyeAnalysisPanel({ isSimulating = false, sessionData }) {
  const { t } = useTranslation();
  const [eyeLeft, setEyeLeft] = useState(null);
  const [eyeRight, setEyeRight] = useState(null);

  useEffect(() => {
    if (sessionData?.eye_left || sessionData?.eye_right) {
      setEyeLeft(sessionData.eye_left);
      setEyeRight(sessionData.eye_right);
      return;
    }
    const contagious = sessionData?.contagious;
    const nonContagious = sessionData?.nonContagious;
    if (contagious || nonContagious) {
      const top = getTopDiagnosis(contagious, nonContagious);
      const hasAlert = contagious?.contagion_alert;
      if (top) {
        setEyeLeft({ diagnosisKey: top.key, confidence: top.prob / 100 });
        setEyeRight(hasAlert
          ? { diagnosisKey: top.key, confidence: top.prob / 100 }
          : { diagnosisKey: "healthy", confidence: (100 - top.prob) / 100 });
      }
    }
  }, [sessionData]);

  useEffect(() => {
    if (!isSimulating || sessionData?.eye_left || sessionData?.contagious) return;
    setEyeLeft(randomDiagnosis());
    setEyeRight(randomDiagnosis());
    const interval = setInterval(() => {
      setEyeLeft(randomDiagnosis());
      setEyeRight(randomDiagnosis());
    }, 4000);
    return () => clearInterval(interval);
  }, [isSimulating, sessionData]);

  const getLabel = (data) => {
    if (!data) return null;
    if (data.diagnosisKey) return diagnosisLabel(t, data.diagnosisKey);
    if (data.diagnosis)    return diagnosisLabel(t, data.diagnosis);
    return null;
  };

  const isHealthyData = (data) => {
    if (!data) return true;
    const key = data.diagnosisKey || data.diagnosis;
    return key === "healthy" || key === "Sain";
  };

  const hasAlert = sessionData?.alerte === true
    || (eyeLeft && !isHealthyData(eyeLeft))
    || (eyeRight && !isHealthyData(eyeRight));

  if (!eyeLeft && !eyeRight) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Eye className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm">{t("eye.waiting")}</p>
        <p className="text-xs mt-1">{t("vitals.activateSimulation")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasAlert && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">{t("eye.anomalyDetected")}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { sideKey: "eye.left",  data: eyeLeft },
          { sideKey: "eye.right", data: eyeRight },
        ].map(({ sideKey, data }) => {
          const healthy = isHealthyData(data);
          const barColor = healthy
            ? "bg-success"
            : data?.confidence >= 0.8 ? "bg-destructive" : data?.confidence >= 0.5 ? "bg-warning" : "bg-success";

          return (
            <div key={sideKey} className={cn(
              "bg-card rounded-xl border-2 p-5 transition-all",
              healthy ? "border-success/30" : "border-destructive/30",
            )}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    healthy ? "bg-success/10" : "bg-destructive/10",
                  )}>
                    <Eye className={cn("w-5 h-5", healthy ? "text-success" : "text-destructive")} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t(sideKey)}</p>
                    <p className="text-lg font-heading font-bold">{getLabel(data) || t("common.na")}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-2xl font-heading font-bold",
                  healthy ? "text-success" : "text-destructive",
                )}>
                  {data?.confidence != null ? `${Math.round(data.confidence * 100)}%` : t("common.na")}
                </span>
              </div>

              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-700", barColor)}
                  style={{ width: `${(data?.confidence || 0) * 100}%` }} />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-muted-foreground">{t("eye.confidence")}</span>
                <span className={cn(
                  "text-[11px] font-semibold",
                  healthy ? "text-success" : "text-destructive",
                )}>
                  {data?.confidence != null ? `${(data.confidence * 100).toFixed(1)}%` : t("common.na")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
