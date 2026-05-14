import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp } from "lucide-react";
import EpidemiologyCharts from "../components/epidemiology/EpidemiologyCharts";
import EpidemiologyMap from "../components/epidemiology/EpidemiologyMap";
import { useTranslation } from "@/lib/useTranslation";

export default function Epidemiology() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    async function load() {
      const s = await base44.entities.DiagnosticSession.list("-created_date", 200);
      setSessions(s);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          Tableau de bord épidémiologique
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Statistiques agrégées — {sessions.length} sessions analysées
        </p>
      </div>

      <EpidemiologyMap sessions={sessions} />
      <EpidemiologyCharts sessions={sessions} />
    </div>
  );
}