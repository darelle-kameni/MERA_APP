import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FolderOpen, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import UrgencyBadge from "../components/shared/UrgencyBadge";

export default function PatientRecords() {
  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([
        base44.entities.DiagnosticSession.list("-created_date", 100),
        base44.entities.Patient.list(),
      ]);
      setSessions(s);
      setPatients(p);
      setLoading(false);
    }
    load();
  }, []);

  const patientMap = {};
  patients.forEach(p => { patientMap[p.id] = p; });

  const filtered = sessions.filter(s => {
    const patient = patientMap[s.patient_id];
    const nameMatch = !search || 
      (s.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (patient?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (patient?.village || "").toLowerCase().includes(search.toLowerCase());
    const urgencyMatch = urgencyFilter === "all" || s.urgency_level === urgencyFilter;
    return nameMatch && urgencyMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-primary" />
          Dossiers patients
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{sessions.length} sessions de diagnostic</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher patient, village..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous niveaux</SelectItem>
            <SelectItem value="CRITIQUE">Critique</SelectItem>
            <SelectItem value="ELEVE">Élevé</SelectItem>
            <SelectItem value="MODERE">Modéré</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun dossier trouvé</p>
          </div>
        )}
        {filtered.map((session) => {
          const patient = patientMap[session.patient_id];
          return (
            <Link
              key={session.id}
              to={`/diagnostic/${session.id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(session.patient_name || patient?.full_name || "?")[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {session.patient_name || patient?.full_name || "Patient anonyme"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.patient_age ? `${session.patient_age} ans` : ""} 
                    {session.patient_sex ? ` • ${session.patient_sex === "M" ? "Homme" : "Femme"}` : ""}
                    {patient?.village ? ` • ${patient.village}` : ""}
                    {" • "}{new Date(session.created_date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <UrgencyBadge level={session.urgency_level} />
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}