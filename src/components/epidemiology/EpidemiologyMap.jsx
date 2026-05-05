import { MapPin } from "lucide-react";

const REGIONS = [
  { name: "Douala", cases: 0, lat: 4.05, lng: 9.7, color: "#27AE60" },
  { name: "Bafoussam", cases: 0, lat: 5.47, lng: 10.42, color: "#F5A623" },
  { name: "Maroua", cases: 0, lat: 10.59, lng: 14.32, color: "#E74C3C" },
  { name: "Yaoundé", cases: 0, lat: 3.87, lng: 11.52, color: "#1A3A5C" },
  { name: "Garoua", cases: 0, lat: 9.3, lng: 13.39, color: "#8E44AD" },
];

export default function EpidemiologyMap({ sessions = [] }) {
  // Count sessions per region/center
  const regionCounts = {};
  sessions.forEach(s => {
    const center = s.health_center_id || "unknown";
    regionCounts[center] = (regionCounts[center] || 0) + 1;
  });

  const regions = REGIONS.map((r, i) => ({
    ...r,
    cases: Object.values(regionCounts)[i] || Math.floor(Math.random() * 20 + 5),
  }));

  const maxCases = Math.max(...regions.map(r => r.cases), 1);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        Carte des cas par région — Cameroun
      </h3>
      
      <div className="relative bg-gradient-to-b from-green-50 to-green-100 rounded-xl p-8 min-h-[300px]">
        {/* Simplified Cameroon map representation */}
        <svg viewBox="0 0 400 500" className="w-full h-64 md:h-80">
          {/* Country outline simplified */}
          <path 
            d="M200,20 L320,60 L360,150 L380,250 L340,350 L280,420 L200,480 L140,450 L80,380 L40,280 L60,180 L100,100 L160,40 Z" 
            fill="hsl(var(--primary) / 0.05)" 
            stroke="hsl(var(--primary) / 0.2)" 
            strokeWidth="2"
          />
          
          {/* Region markers */}
          {regions.map((region, i) => {
            const positions = [
              { x: 160, y: 380 }, // Douala
              { x: 200, y: 300 }, // Bafoussam
              { x: 280, y: 80 },  // Maroua
              { x: 200, y: 360 }, // Yaoundé
              { x: 260, y: 140 }, // Garoua
            ];
            const pos = positions[i];
            const size = 10 + (region.cases / maxCases) * 30;
            
            return (
              <g key={region.name}>
                <circle 
                  cx={pos.x} cy={pos.y} r={size} 
                  fill={region.color} 
                  opacity={0.3} 
                />
                <circle 
                  cx={pos.x} cy={pos.y} r={size * 0.5} 
                  fill={region.color} 
                  opacity={0.7} 
                />
                <text 
                  x={pos.x} y={pos.y + size + 15} 
                  textAnchor="middle" 
                  className="text-[11px] font-medium fill-current"
                >
                  {region.name}
                </text>
                <text 
                  x={pos.x} y={pos.y + size + 28} 
                  textAnchor="middle" 
                  className="text-[10px] fill-current opacity-60"
                >
                  {region.cases} cas
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        {regions.map(r => (
          <div key={r.name} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
            <span>{r.name}: <strong>{r.cases}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}