import { Leaf, AlertTriangle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRADITIONAL_TREATMENTS_DATA } from "../../lib/simulatorData";

export default function TraditionalTreatmentPanel({ predictions }) {
  // Match diseases detected with traditional treatments
  const detectedDiseases = predictions?.length 
    ? predictions.filter(p => p.probability >= 20).map(p => ({ name: p.disease, severity: p.severity, probability: p.probability }))
    : [
        { name: "Paludisme grave", severity: "eleve", probability: 78 },
        { name: "Anémie", severity: "modere", probability: 65 },
        { name: "Typhoïde", severity: "modere", probability: 42 },
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Leaf className="w-5 h-5 text-green-600" />
        <h3 className="font-heading font-semibold">Traitements traditionnels aux plantes</h3>
      </div>

      {detectedDiseases.map((disease, idx) => {
        const treatment = TRADITIONAL_TREATMENTS_DATA.find(
          t => t.disease.toLowerCase().includes(disease.name.toLowerCase().split(" ")[0])
        );
        const isHighSeverity = disease.severity === "critique" || disease.severity === "eleve";

        return (
          <div key={idx} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className={cn(
              "px-4 py-3 flex items-center justify-between",
              isHighSeverity ? "bg-red-500/5 border-b border-red-500/20" : "bg-green-500/5 border-b border-green-500/20"
            )}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{disease.name}</span>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                  isHighSeverity ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                )}>
                  {disease.probability}%
                </span>
              </div>
            </div>

            <div className="p-4">
              {isHighSeverity ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">
                        ⚠️ Ce cas nécessite une prise en charge médicale urgente
                      </p>
                      <p className="text-xs text-red-600/80 mt-1">
                        Le traitement traditionnel seul est insuffisant pour ce niveau de gravité.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-xs">
                      <strong>Centre de référence :</strong> Hôpital de District le plus proche
                    </p>
                  </div>
                  {treatment && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs font-medium text-amber-700 mb-2">
                        🌿 Soulagement temporaire pendant le trajet uniquement :
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>{treatment.plant_name_fr}</strong> — {treatment.preparation.substring(0, 100)}...
                      </p>
                    </div>
                  )}
                </div>
              ) : treatment ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Plante</p>
                      <p className="text-sm font-medium">{treatment.plant_name_fr}</p>
                      <p className="text-xs text-muted-foreground italic">{treatment.plant_name_local}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Partie utilisée</p>
                      <p className="text-sm">{treatment.part_used}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Préparation</p>
                    <p className="text-xs leading-relaxed">{treatment.preparation}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-[10px] text-muted-foreground">Dosage adulte</p>
                      <p className="text-xs font-medium">{treatment.dosage_adult}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/5">
                      <p className="text-[10px] text-blue-600">Dosage enfant</p>
                      <p className="text-xs font-medium">{treatment.dosage_child}</p>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[10px] font-medium text-amber-700">⚠️ Précautions</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{treatment.precautions}</p>
                  </div>

                  <p className="text-[10px] text-muted-foreground italic text-center border-t border-border pt-2">
                    Ce traitement est complémentaire — consulter un médecin si pas d'amélioration sous 48h
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun traitement traditionnel référencé pour cette pathologie
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}