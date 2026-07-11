import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "@/lib/useTranslation";

const COLORS = {
  CRITIQUE: "#E74C3C",
  ELEVE: "#E67E22",
  MODERE: "#F5A623",
  NORMAL: "#27AE60",
};

const TKEYS = {
  CRITIQUE: "urgency.critique",
  ELEVE: "urgency.eleve",
  MODERE: "urgency.modere",
  NORMAL: "urgency.normal",
};

export default function UrgencyChart({ sessions = [] }) {
  const { t } = useTranslation();
  const counts = sessions.reduce((acc, s) => {
    acc[s.urgency_level] = (acc[s.urgency_level] || 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  if (!data.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">{t("urgency.distribution")}</h3>
        <p className="text-sm text-muted-foreground text-center py-8">{t("urgency.noData")}</p>
      </div>
    );
  }

  const labelFor = (k) => t(TKEYS[k] || k);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-heading font-semibold mb-4">{t("urgency.distribution")}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
              {data.map((entry, idx) => (
                <Cell key={idx} fill={COLORS[entry.name] || "#999"} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, labelFor(name)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[item.name] }} />
            <span>{labelFor(item.name)}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
