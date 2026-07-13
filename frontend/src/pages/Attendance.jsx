import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/useTranslation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarClock, Search, QrCode, ChevronLeft, ChevronRight, Clock, FilterX, Download } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const request = async (path) => {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Erreur chargement');
  return res.json();
};

export default function Attendance() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [stats, setStats] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  const loadDay = useCallback(async (date, { silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [recordsData, patientsData, statsData] = await Promise.all([
        request(`/attendance?date=${date}&limit=500`),
        base44.entities.Patient.list("-created_date").catch(() => []),
        request(`/attendance/today`),
      ]);
      setRecords(recordsData);
      setPatients(patientsData);
      setStats(statsData);
    } catch (e) {
      if (!silent) toast.error("Erreur chargement des présences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDay(selectedDate); }, [loadDay, selectedDate]);

  const isToday = selectedDate === today;

  const pollingRef = useRef(null);
  useEffect(() => {
    if (isToday) {
      pollingRef.current = setInterval(() => loadDay(selectedDate, { silent: true }), 5000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isToday, loadDay, selectedDate]);

  const patientMap = {};
  patients.forEach((p) => { patientMap[p.card_id] = p; });

  const filtered = search
    ? records.filter((r) =>
        (r.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
        r.card_id.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <CalendarClock className="w-6 h-6 text-primary" />
            {t("attendance.title", "Pointage")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("attendance.subtitle", "Suivi des présences par badge RFID")}
          </p>
        </div>
        {stats && isToday && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{t("attendance.badges", "Badges")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.unique_patients}</p>
              <p className="text-xs text-muted-foreground">{t("attendance.unique", "Personnes")}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="relative">
              <Input type="date" value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44 text-center font-mono text-sm" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)} disabled={isToday}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)} className="text-xs">
                {t("attendance.today", "Aujourd'hui")}
              </Button>
            )}
          </div>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/attendance/export?date=${selectedDate}`, { credentials: 'include' });
              if (!res.ok) throw new Error('Erreur téléchargement');
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pointage-${selectedDate}.xlsx`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              toast.error("Échec téléchargement Excel");
            }
          }} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Excel
          </Button>

          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("attendance.search", "Rechercher...")}
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <FilterX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {formatDate(selectedDate)}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("attendance.empty", "Aucun badge enregistré pour cette date")}</p>
          <p className="text-xs mt-1">{t("attendance.emptyHint", "Les badges RFID apparaîtront ici automatiquement")}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t("attendance.time", "Heure")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {t("attendance.patient", "Patient")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">
                    {t("attendance.cardId", "Carte RFID")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">
                    {t("attendance.role", "Rôle")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r, i) => {
                  const p = patientMap[r.card_id];
                  const prev = i < filtered.length - 1 ? filtered[i + 1] : null;
                  const timeDiff = prev
                    ? Math.round((new Date(r.badged_at) - new Date(prev.badged_at)) / 60000)
                    : null;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono font-medium">{formatTime(r.badged_at)}</span>
                          {timeDiff !== null && timeDiff > 5 && (
                            <span className="text-[10px] text-muted-foreground">+{timeDiff}min</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.patient_name || "Inconnu"}</div>
                        {p && (
                          <div className="text-xs text-muted-foreground">
                            {p.age} ans · {p.sex === 'M' ? 'M' : 'F'}
                            {p.village ? ` · ${p.village}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {r.card_id}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.role === 'patient' ? 'bg-blue-100 text-blue-700' :
                          r.role === 'encadreur' ? 'bg-amber-100 text-amber-700' :
                          r.role === 'medecin' ? 'bg-green-100 text-green-700' :
                          r.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {r.role === 'patient' ? 'Patient' :
                           r.role === 'encadreur' ? 'Encadreur' :
                           r.role === 'medecin' ? 'Médecin' :
                           r.role === 'admin' ? 'Admin' : r.role}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>{filtered.length} badge{filtered.length > 1 ? 's' : ''} enregistré{filtered.length > 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}
