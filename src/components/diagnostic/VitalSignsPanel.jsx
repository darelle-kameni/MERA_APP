import { useState, useEffect, useRef } from "react";
import { speak } from "../../hooks/useSpeech";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Thermometer, Heart, Wind, Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateVitals } from "../../lib/simulatorData";

function VitalCard({ icon: Icon, label, value, unit, color, isAbnormal, history = [] }) {
  return (
    <div className={cn(
      "bg-card rounded-xl border p-4 transition-all",
      isAbnormal ? "border-destructive/40 shadow-destructive/5 shadow-lg" : "border-border"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${color}-500/10`)}>
            <Icon className={cn("w-4 h-4", `text-${color}-600`)} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        {isAbnormal && (
          <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full animate-vital-pulse">
            ALERTE
          </span>
        )}
      </div>
      <p className="text-2xl font-heading font-bold">
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      {history.length > 2 && (
        <div className="h-12 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.slice(-10)}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={isAbnormal ? "#E74C3C" : "hsl(var(--primary))"}
                strokeWidth={1.5}
                dot={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 10, padding: "2px 6px" }}
                formatter={(v) => [`${v} ${unit}`, label]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function VitalSignsPanel({ isChild = false, isSimulating = false, sessionData }) {
  const [current, setCurrent] = useState(null);
  const [tempHistory, setTempHistory] = useState([]);
  const [spo2History, setSpo2History] = useState([]);
  const [hrHistory, setHrHistory] = useState([]);
  const intervalRef = useRef(null);

  const isFirstTick = useRef(true);
  const prevAlerts = useRef({ temp: false, spo2: false, hr: false });

  // Use real session data when available
  useEffect(() => {
    if (sessionData?.temperature != null) {
      setCurrent({
        temperature: sessionData.temperature,
        spo2: sessionData.spo2,
        heart_rate: sessionData.heart_rate,
        weight: sessionData.weight,
      });
      setTempHistory([{ v: sessionData.temperature }]);
      setSpo2History([{ v: sessionData.spo2 }]);
      setHrHistory([{ v: sessionData.heart_rate }]);
    }
  }, [sessionData]);

  // Simulation mode
  useEffect(() => {
    if (isSimulating && !sessionData) {
      isFirstTick.current = true;
      const tick = () => {
        const vitals = generateVitals(isChild);
        setCurrent(vitals);

        const highTemp = vitals.temperature > 38.5;
        const lowSpo2 = vitals.spo2 < 94;
        const abnormalHR = vitals.heart_rate > 120 || vitals.heart_rate < 55;

        if (isFirstTick.current) {
          isFirstTick.current = false;
          speak(`Mesures enregistrées. Température : ${vitals.temperature} degrés. Saturation oxygène : ${vitals.spo2} pourcent. Fréquence cardiaque : ${vitals.heart_rate} battements par minute. Poids : ${vitals.weight} kilogrammes.`);
        }

        if (highTemp && !prevAlerts.current.temp) {
          setTimeout(() => speak(`Alerte ! Température élevée détectée : ${vitals.temperature} degrés. Veuillez vérifier le patient.`), 4000);
        }
        if (lowSpo2 && !prevAlerts.current.spo2) {
          setTimeout(() => speak(`Alerte ! Saturation en oxygène faible : ${vitals.spo2} pourcent. Attention requise.`), 5000);
        }
        if (abnormalHR && !prevAlerts.current.hr) {
          setTimeout(() => speak(`Alerte ! Fréquence cardiaque anormale : ${vitals.heart_rate} battements par minute.`), 6000);
        }
        prevAlerts.current = { temp: highTemp, spo2: lowSpo2, hr: abnormalHR };

        setTempHistory(p => [...p.slice(-15), { v: vitals.temperature }]);
        setSpo2History(p => [...p.slice(-15), { v: vitals.spo2 }]);
        setHrHistory(p => [...p.slice(-15), { v: vitals.heart_rate }]);
      };
      tick();
      intervalRef.current = setInterval(tick, 2000);
      return () => clearInterval(intervalRef.current);
    }
  }, [isSimulating, isChild, sessionData]);

  if (!current) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">En attente des signes vitaux du robot...</p>
        <p className="text-xs mt-1">Activez la simulation pour générer des données</p>
      </div>
    );
  }

  const isHighTemp = current.temperature > 38.5;
  const isLowSpo2 = current.spo2 < 94;
  const isAbnormalHR = current.heart_rate > 120 || current.heart_rate < 55;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <VitalCard
        icon={Thermometer}
        label="Température"
        value={current.temperature}
        unit="°C"
        color="red"
        isAbnormal={isHighTemp}
        history={tempHistory}
      />
      <VitalCard
        icon={Wind}
        label="SpO2"
        value={current.spo2}
        unit="%"
        color="blue"
        isAbnormal={isLowSpo2}
        history={spo2History}
      />
      <VitalCard
        icon={Heart}
        label="Fréq. cardiaque"
        value={current.heart_rate}
        unit="bpm"
        color="orange"
        isAbnormal={isAbnormalHR}
        history={hrHistory}
      />
      <VitalCard
        icon={Weight}
        label="Poids"
        value={current.weight}
        unit="kg"
        color="green"
        isAbnormal={false}
        history={[]}
      />
    </div>
  );
}
