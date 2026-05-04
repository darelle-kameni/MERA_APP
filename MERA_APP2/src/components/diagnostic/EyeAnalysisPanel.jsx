import { Eye, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { SIMULATED_CONTAGIOUS_EYE, SIMULATED_NON_CONTAGIOUS_EYE, TEST_EYE_IMAGES } from "../../lib/simulatorData";

function DiseaseRow({ name, score, isContagious }) {
  const getColor = (s) => {
    if (s >= 60) return "bg-red-500";
    if (s >= 30) return "bg-orange-500";
    if (s >= 15) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className={cn("text-xs font-bold", score >= 60 ? "text-red-600" : score >= 30 ? "text-orange-600" : "text-muted-foreground")}>
            {score}%
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", getColor(score))} style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function EyeAnalysisPanel({ sessionData }) {
  const contagious = sessionData?.contagious || SIMULATED_CONTAGIOUS_EYE;
  const nonContagious = sessionData?.nonContagious || SIMULATED_NON_CONTAGIOUS_EYE;
  const eyePhotoUrl = TEST_EYE_IMAGES[0];

  const contagiousLabels = {
    conjunctivitis_bacterial: "Conjonctivite bactérienne",
    conjunctivitis_viral: "Conjonctivite virale",
    trachoma: "Trachome",
    blepharitis_infectious: "Blépharite infectieuse",
  };

  const nonContagiousLabels = {
    cataract: "Cataracte",
    pterygion: "Ptérygion",
    uveitis: "Uvéite",
    jaundice: "Jaunisse oculaire (ictère)",
    myopia: "Myopie",
    glaucoma: "Glaucome",
    diabetic_retinopathy: "Rétinopathie diabétique",
  };

  return (
    <div className="space-y-6">
      {/* Eye photo */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Photo oculaire capturée</h3>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Analyse IA fusion</span>
        </div>
        <div className="relative rounded-lg overflow-hidden bg-black/5 aspect-video max-w-sm">
          <img src={eyePhotoUrl} alt="Photo oculaire" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded">Caméra MERA</span>
            <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded">TFLite + Claude Vision</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Bloc B - Contagious */}
        <div className="bg-card rounded-xl border-2 border-red-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="font-heading font-semibold text-red-700">Bloc B — Maladies oculaires contagieuses</h3>
          </div>
          {contagious.contagion_alert && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-red-700">⚠️ Risque de contagion — isolement recommandé</span>
            </div>
          )}
          <div className="space-y-1">
            {Object.entries(contagiousLabels).map(([key, label]) => (
              <DiseaseRow key={key} name={label} score={contagious[key] || 0} isContagious />
            ))}
          </div>
        </div>

        {/* Bloc C - Non-contagious */}
        <div className="bg-card rounded-xl border-2 border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-amber-600" />
            <h3 className="font-heading font-semibold text-amber-700">Bloc C — Maladies oculaires non contagieuses</h3>
          </div>
          <div className="space-y-1">
            {Object.entries(nonContagiousLabels).map(([key, label]) => (
              <DiseaseRow key={key} name={label} score={nonContagious[key] || 0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}