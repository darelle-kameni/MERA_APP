import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from "@/lib/useTranslation";
import { Users, Stethoscope, AlertTriangle, Activity, UserCog, Shield, Wifi, Baby } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import RecentSessions from "../components/dashboard/RecentSessions";
import UrgencyChart from "../components/dashboard/UrgencyChart";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = user?.role;
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const promises = [
        base44.entities.Patient.list().catch(() => []),
        base44.entities.DiagnosticSession.list("-created_date", 50).catch(() => []),
        base44.entities.MeraDevice.list().catch(() => []),
      ];
      if (role === "admin") {
        promises.push(base44.admin.listUsers().catch(() => []));
      }
      const [p, s, d, u] = await Promise.all(promises);
      setPatients(p || []);
      setSessions(s || []);
      setDevices(d || []);
      if (u) setUsers(u || []);
      setLoading(false);
    }
    load();
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const criticalCount = sessions.filter(s => s.urgency_level === "CRITIQUE").length;
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.created_date);
    return d.toDateString() === new Date().toDateString();
  }).length;
  const onlineDevices = devices.filter(d => d.status === "en_ligne").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t("dashboard.title", "Tableau de bord")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === "admin" ? t("dashboard.adminOverview") :
           role === "medecin" ? t("dashboard.medecinOverview") :
           t("dashboard.encadreurOverview")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {role === "admin" && (
          <>
            <StatsCard icon={Shield} label={t("dashboard.admins", "Admins")} value={users.filter(u => u.role === "admin").length} color="critical" />
            <StatsCard icon={UserCog} label={t("dashboard.encadreurs", "Encadreurs")} value={users.filter(u => u.role === "encadreur").length} color="warning" />
            <StatsCard icon={Stethoscope} label={t("dashboard.medecins", "Médecins")} value={users.filter(u => u.role === "medecin").length} color="info" />
            <StatsCard icon={Wifi} label={t("dashboard.robotsOnline", "Robots en ligne")} value={`${onlineDevices}/${devices.length}`} color="success" />
          </>
        )}
        {role === "medecin" && (
          <>
            <StatsCard icon={UserCog} label={t("dashboard.encadreurs", "Encadreurs")} value="—" color="warning" />
            <StatsCard icon={Baby} label={t("dashboard.children", "Enfants")} value={patients.length} color="primary" />
            <StatsCard icon={Activity} label={t("dashboard.pendingReview", "En attente de revue")} value={sessions.filter(s => s.status === "en_attente_revue").length} color="warning" />
            <StatsCard icon={AlertTriangle} label={t("dashboard.criticalCases", "Cas critiques")} value={criticalCount} color="critical" />
          </>
        )}
        {role === "encadreur" && (
          <>
            <StatsCard icon={Baby} label={t("dashboard.myChildren", "Mes enfants")} value={patients.length} color="primary" />
            <StatsCard icon={Stethoscope} label={t("dashboard.sessions", "Sessions")} value={sessions.length} subtitle={`${todaySessions} ${t("dashboard.today", "aujourd'hui")}`} color="info" />
            <StatsCard icon={AlertTriangle} label={t("dashboard.criticalCases", "Cas critiques")} value={criticalCount} color="critical" />
            <StatsCard icon={Activity} label={t("dashboard.pendingReview", "En attente de revue")} value={sessions.filter(s => s.status === "en_attente_revue").length} color="warning" />
          </>
        )}
      </div>

      {/* Charts */}
      {role !== "admin" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <RecentSessions sessions={sessions} />
          <UrgencyChart sessions={sessions} />
        </div>
      )}
    </div>
  );
}
