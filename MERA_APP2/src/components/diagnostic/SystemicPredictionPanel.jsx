import { Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import UrgencyBadge from "../shared/UrgencyBadge";
import { SIMULATED_SYSTEMIC } from "../../lib/simulatorData";

const severityConfig = {
  critique: { label: "Critique", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
  eleve: { label: "Élevé", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  modere: { label: "Modéré", color: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  faible: { label: "Faible", color: "text-green-600", bg: "bg-green-500/10", border: "border-green-500/30" },
};

export default function SystemicPredictionPanel({ predictions }) {
  const data = predictions?.length ? predictions : SIMULATED_SYSTEMIC;
  const sorted = [...data].sort((a, b) => b.probability - a.probability);
  
  // Determine global urgency
  const maxSev = sorted[0]?.severity || "faible";
  const urgencyMap = { critique: "CRITIQUE", eleve: "ELEVE", modere: "MODERE", faible: "NORMAL" };
  const globalUrgency = urgencyMap[maxSev];
  const urgencyColors = {
    CRITIQUE: "bg-red-600",
    ELEVE: "bg-orange-500",
    MODERE: "bg-yellow-500",
    NORMAL: "bg-green-500",
  };

  return (
    <div className="space-y-4">
      {/* Global urgency banner */}
      <div className={cn(
        "rounded-xl p-5 text-white text-center",
        urgencyColors[globalUrgency]
      )}>
        <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Niveau d'urgence global</p>
        <p className="text-3xl font-heading font-bold">{globalUrgency}</p>
        <p className="text-xs mt-1 opacity-80">
          {globalUrgency === "CRITIQUE" && "Référence médicale urgente requise immédiatement"}
          {globalUrgency === "ELEVE" && "Prise en charge médicale nécessaire rapidement"}
          {globalUrgency === "MODERE" && "Surveillance recommandée, traitement possible sur place"}
          {globalUrgency === "NORMAL" && "Pas d'urgence détectée, suivi standard"}
        </p>
      </div>

      {/* Disease cards */}
      <div className="bg-card rounded-xl border-2 border-primary/20 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Bloc A — Maladies systémiques et infectieuses</h3>
        </div>

        <div className="space-y-3">
          {sorted.map((pred, idx) => {
            const sev = severityConfig[pred.severity] || severityConfig.faible;
            return (
              <div key={idx} className={cn("rounded-lg border p-3", sev.border, sev.bg)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{pred.disease}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", sev.bg, sev.color)}>
                      {sev.label}
                    </span>
                  </div>
                  <span className={cn("text-lg font-heading font-bold", sev.color)}>
                    {pred.probability}%
                  </span>
                </div>
                <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden mb-2">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000",
                      pred.probability >= 60 ? "bg-red-500" : pred.probability >= 30 ? "bg-orange-500" : "bg-green-500"
                    )} 
                    style={{ width: `${pred.probability}%` }} 
                  />
                </div>
                <div className="flex items-start gap-1.5">
                  <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">{pred.trigger_factors}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}