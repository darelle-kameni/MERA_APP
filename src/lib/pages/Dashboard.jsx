import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Stethoscope, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import StatsCard from "../components/dashboard/StatsCard";
import RecentSessions from "../components/dashboard/RecentSessions";
import UrgencyChart from "../components/dashboard/UrgencyChart";
import { PageLoading, PageError } from "../components/shared/PageState";

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s] = await Promise.all([
        base44.entities.Patient.list(),
        base44.entities.DiagnosticSession.list("-created_date", 50),
      ]);
      setPatients(p);
      setSessions(s);
    } catch (err) {
      setError(err.message || 'Erreur réseau');
      toast.error('Impossible de charger le tableau de bord');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  const criticalCount = sessions.filter((s) => s.urgency_level === "CRITIQUE").length;
  const todaySessions = sessions.filter((s) => {
    const d = new Date(s.created_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble du système MERA</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Users} label="Enfants enregistrés" value={patients.length} color="primary" />
        <StatsCard icon={Stethoscope} label="Sessions totales" value={sessions.length}
          subtitle={`${todaySessions} aujourd'hui`} color="info" />
        <StatsCard icon={AlertTriangle} label="Cas critiques" value={criticalCount} color="critical" />
        <StatsCard icon={Activity} label="En attente de revue"
          value={sessions.filter((s) => s.status === "en_attente_revue").length} color="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RecentSessions sessions={sessions} />
        <UrgencyChart sessions={sessions} />
      </div>
    </div>
  );
}
