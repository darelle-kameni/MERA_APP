import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, Battery, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const d = await base44.entities.MeraDevice.list();
      setDevices(d);
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

  const statusConfig = {
    en_ligne: { label: "En ligne", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: Wifi },
    hors_ligne: { label: "Hors ligne", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: WifiOff },
    maintenance: { label: "Maintenance", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: RefreshCw },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <Cpu className="w-6 h-6 text-primary" />
          Appareils MERA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{devices.length} appareils enregistrés</p>
      </div>

      {devices.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Cpu className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun appareil enregistré</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => {
          const status = statusConfig[device.status] || statusConfig.hors_ligne;
          const StatusIcon = status.icon;
          const batteryColor = device.battery_level > 60 ? "text-green-600" : device.battery_level > 20 ? "text-yellow-600" : "text-red-600";

          return (
            <div key={device.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-primary" />
                </div>
                <Badge variant="outline" className={cn("gap-1", status.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
              </div>

              <h3 className="font-heading font-semibold text-sm">{device.serial_number}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{device.health_center_name || "Centre non assigné"}</p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Battery className={cn("w-3.5 h-3.5", batteryColor)} />
                    Batterie
                  </span>
                  <span className={cn("font-medium", batteryColor)}>{device.battery_level || 0}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all",
                      device.battery_level > 60 ? "bg-green-500" : device.battery_level > 20 ? "bg-yellow-500" : "bg-red-500"
                    )} 
                    style={{ width: `${device.battery_level || 0}%` }} 
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Firmware</span>
                  <span className="font-mono text-[10px]">{device.firmware_version || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dernière sync</span>
                  <span className="text-[10px]">
                    {device.last_sync ? new Date(device.last_sync).toLocaleString("fr-FR") : "Jamais"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}