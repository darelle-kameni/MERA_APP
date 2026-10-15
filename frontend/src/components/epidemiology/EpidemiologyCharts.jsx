import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useTranslation } from "@/lib/useTranslation";

const COLORS = ["#1A3A5C", "#E74C3C", "#F5A623", "#27AE60", "#8E44AD", "#E67E22", "#2C3E50", "#16A085"];

export default function EpidemiologyCharts({ sessions = [] }) {
  const { t } = useTranslation();
  // Urgency distribution
  const urgencyCounts = sessions.reduce((acc, s) => {
    acc[s.urgency_level] = (acc[s.urgency_level] || 0) + 1;
    return acc;
  }, {});
  const urgencyData = Object.entries(urgencyCounts).map(([name, value]) => ({ name, value }));
  const urgencyColors = { CRITIQUE: "#E74C3C", ELEVE: "#E67E22", MODERE: "#F5A623", NORMAL: "#27AE60" };

  // Age distribution
  const ageGroups = { "0-5": 0, "6-14": 0, "15-30": 0, "31-50": 0, "51+": 0 };
  sessions.forEach(s => {
    const age = s.patient_age || 25;
    if (age <= 5) ageGroups["0-5"]++;
    else if (age <= 14) ageGroups["6-14"]++;
    else if (age <= 30) ageGroups["15-30"]++;
    else if (age <= 50) ageGroups["31-50"]++;
    else ageGroups["51+"]++;
  });
  const ageData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

  // Monthly trend (simulated)
  const monthData = [
    { month: t("epidemiology.monthJan", "Jan"), sessions: 12, critiques: 3 },
    { month: t("epidemiology.monthFeb", "Fév"), sessions: 18, critiques: 5 },
    { month: t("epidemiology.monthMar", "Mar"), sessions: 22, critiques: 4 },
    { month: t("epidemiology.monthApr", "Avr"), sessions: sessions.length || 15, critiques: sessions.filter(s => s.urgency_level === "CRITIQUE").length || 6 },
  ];

  // Top diseases (simulated)
  const diseaseData = [
    { name: "epidemiology.diseaseMalaria", fallback: "Paludisme", value: 35 },
    { name: "epidemiology.diseaseConjunctivitis", fallback: "Conjonctivite", value: 22 },
    { name: "epidemiology.diseaseAnemia", fallback: "Anémie", value: 18 },
    { name: "epidemiology.diseaseTyphoid", fallback: "Typhoïde", value: 12 },
    { name: "epidemiology.diseaseTrachoma", fallback: "Trachome", value: 8 },
    { name: "epidemiology.diseaseMyopia", fallback: "Myopie", value: 5 },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Urgency distribution */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">{t("epidemiology.byUrgency", "Répartition par niveau d'urgence")}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={urgencyData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={4} dataKey="value">
                {urgencyData.map((entry, idx) => (
                  <Cell key={idx} fill={urgencyColors[entry.name] || COLORS[idx]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {urgencyData.map(d => (
            <span key={d.name} className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full" style={{ background: urgencyColors[d.name] }} />
              {d.name}: {d.value}
            </span>
          ))}
        </div>
      </div>

      {/* Age groups */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">{t("epidemiology.byAge", "Répartition par tranche d'âge")}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1A3A5C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">{t("epidemiology.monthlyTrend", "Tendance mensuelle")}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sessions" stroke="#1A3A5C" strokeWidth={2} name={t("epidemiology.sessionsLegend", "Sessions")} />
              <Line type="monotone" dataKey="critiques" stroke="#E74C3C" strokeWidth={2} name={t("epidemiology.critiquesLegend", "Critiques")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top diseases */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">{t("epidemiology.topDiseases", "Top pathologies détectées")}</h3>
        <div className="space-y-2.5">
          {diseaseData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 truncate">{t(d.name, d.fallback)}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ width: `${(d.value / diseaseData[0].value) * 100}%`, background: COLORS[i] }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}