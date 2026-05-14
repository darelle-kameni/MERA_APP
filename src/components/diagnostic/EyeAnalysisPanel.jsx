import { useState, useEffect } from "react";
import { Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const DIAGNOSES = ["Sain", "Cataracte", "Conjonctivite", "Glaucome", "Rétinopathie diabétique", "Ptérygion", "Trachome", "Uvéite"];

function randomDiagnosis() {
  const idx = Math.floor(Math.random() * DIAGNOSES.length);
  const conf = +(70 + Math.random() * 28).toFixed(2);
  return { diagnosis: DIAGNOSES[idx], confidence: conf };
}

const DISEASE_LABELS = {
  conjunctivitis_bacterial: "Conjonctivite bactérienne",
  conjunctivitis_viral: "Conjonctivite virale",
  trachoma: "Trachome",
  blepharitis_infectious: "Blépharite infectieuse",
  cataract: "Cataracte",
  pterygion: "Ptérygion",
  uveitis: "Uvéite",
  jaundice: "Jaunisse oculaire",
  myopia: "Myopie",
  glaucoma: "Glaucome",
  diabetic_retinopathy: "Rétinopathie diabétique",
};

function getTopDiagnosis(contagious, nonContagious) {
  const diseases = [];

  if (contagious) {
    for (const [key, val] of Object.entries(contagious)) {
      if (key === "contagion_alert" || key === "id" || key === "session_id" || key === "created_date" || key === "updated_date") continue;
      if (val > 0) diseases.push({ name: DISEASE_LABELS[key] || key, prob: val });
    }
  }
  if (nonContagious) {
    for (const [key, val] of Object.entries(nonContagious)) {
      if (key === "id" || key === "session_id" || key === "created_date" || key === "updated_date") continue;
      if (val > 0) diseases.push({ name: DISEASE_LABELS[key] || key, prob: val });
    }
  }

  if (diseases.length === 0) return null;
  diseases.sort((a, b) => b.prob - a.prob);
  return diseases[0];
}

export default function EyeAnalysisPanel({ isSimulating = false, sessionData }) {
  const [eyeLeft, setEyeLeft] = useState(null);
  const [eyeRight, setEyeRight] = useState(null);

  // Load from backend data (eye_left/eye_right from robot, or fallback to contagious/nonContagious)
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
        setEyeLeft({ diagnosis: top.name, confidence: top.prob });
        setEyeRight({ diagnosis: hasAlert ? top.name : "Sain", confidence: hasAlert ? top.prob : 100 - top.prob });
      }
    }
  }, [sessionData]);

  // Simulation mode
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

  const hasAlert = sessionData?.alerte === true || (eyeLeft?.diagnosis !== "Sain" && eyeLeft?.diagnosis != null) || (eyeRight?.diagnosis !== "Sain" && eyeRight?.diagnosis != null);

  if (!eyeLeft && !eyeRight) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Eye className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm">En attente des résultats de l'analyse oculaire...</p>
        <p className="text-xs mt-1">Activez la simulation pour générer des données</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasAlert && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">
            Anomalie détectée — une consultation ophtalmologique est recommandée
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { side: "Œil gauche", data: eyeLeft },
          { side: "Œil droit", data: eyeRight },
        ].map(({ side, data }) => {
          const isHealthy = data?.diagnosis === "Sain";
          const barColor = isHealthy
            ? "bg-success"
            : data?.confidence >= 80 ? "bg-destructive" : data?.confidence >= 50 ? "bg-warning" : "bg-success";

          return (
            <div key={side} className={cn(
              "bg-card rounded-xl border-2 p-5 transition-all",
              isHealthy ? "border-success/30" : "border-destructive/30"
            )}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isHealthy ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    <Eye className={cn("w-5 h-5", isHealthy ? "text-success" : "text-destructive")} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{side}</p>
                    <p className="text-lg font-heading font-bold">{data?.diagnosis || "N/A"}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-2xl font-heading font-bold",
                  isHealthy ? "text-success" : "text-destructive"
                )}>
                  {data?.confidence != null ? `${Math.round(data.confidence)}%` : "N/A"}
                </span>
              </div>

              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", barColor)}
                  style={{ width: `${data?.confidence || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-muted-foreground">Confiance</span>
                <span className={cn(
                  "text-[11px] font-semibold",
                  isHealthy ? "text-success" : "text-destructive"
                )}>
                  {data?.confidence != null ? `${data.confidence.toFixed(1)}%` : "N/A"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
