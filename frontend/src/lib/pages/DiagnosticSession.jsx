import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Activity, Eye, Brain, Leaf, MessageSquare, FileText } from "lucide-react";
import VitalSignsPanel from "../components/diagnostic/VitalSignsPanel";
import EyeAnalysisPanel from "../components/diagnostic/EyeAnalysisPanel";
import SystemicPredictionPanel from "../components/diagnostic/SystemicPredictionPanel";
import TraditionalTreatmentPanel from "../components/diagnostic/TraditionalTreatmentPanel";
import ConversationPanel from "../components/diagnostic/ConversationPanel";

export default function DiagnosticSession() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [robotConnected, setRobotConnected] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get("patient_id");

  const toggleSimulation = () => {
    const next = !isSimulating;
    setIsSimulating(next);
    setRobotConnected(next);
    localStorage.setItem("mera_robot_connected", next.toString());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Session de diagnostic</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {patientId ? `Enfant #${patientId.slice(0, 8)}…` : "Session de démonstration"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={robotConnected 
            ? "bg-green-500/10 text-green-600 border-green-500/30 gap-1.5" 
            : "bg-red-500/10 text-red-600 border-red-500/30 gap-1.5"
          }>
            {robotConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {robotConnected ? "Robot connecté" : "Robot hors ligne"}
          </Badge>
          <Button onClick={toggleSimulation} variant={isSimulating ? "destructive" : "default"} size="sm">
            {isSimulating ? "Arrêter simulation" : "🤖 Simuler robot"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vitals" className="w-full">
        <TabsList className="w-full flex overflow-x-auto bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="vitals" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Activity className="w-3.5 h-3.5" /> Signes vitaux
          </TabsTrigger>
          <TabsTrigger value="eye" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Eye className="w-3.5 h-3.5" /> Analyse oculaire
          </TabsTrigger>
          <TabsTrigger value="prediction" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Brain className="w-3.5 h-3.5" /> Prédictions
          </TabsTrigger>
          <TabsTrigger value="treatment" className="gap-1.5 text-xs flex-1 min-w-fit">
            <Leaf className="w-3.5 h-3.5" /> Traitements
          </TabsTrigger>
          <TabsTrigger value="conversation" className="gap-1.5 text-xs flex-1 min-w-fit">
            <MessageSquare className="w-3.5 h-3.5" /> Dialogue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="mt-4">
          <VitalSignsPanel isSimulating={isSimulating} />
        </TabsContent>

        <TabsContent value="eye" className="mt-4">
          <EyeAnalysisPanel />
        </TabsContent>

        <TabsContent value="prediction" className="mt-4">
          <SystemicPredictionPanel />
        </TabsContent>

        <TabsContent value="treatment" className="mt-4">
          <TraditionalTreatmentPanel />
        </TabsContent>

        <TabsContent value="conversation" className="mt-4">
          <ConversationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}