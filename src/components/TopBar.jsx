import { Menu, Wifi, WifiOff, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TopBar({ onMenuToggle }) {
  const [robotConnected, setRobotConnected] = useState(false);
  const [lastDataTime, setLastDataTime] = useState(null);

  // Simulate robot connection status
  useEffect(() => {
    const stored = localStorage.getItem("mera_robot_connected");
    if (stored === "true") {
      setRobotConnected(true);
      setLastDataTime(new Date());
    }

    const interval = setInterval(() => {
      const connected = localStorage.getItem("mera_robot_connected") === "true";
      setRobotConnected(connected);
      if (connected) setLastDataTime(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    if (!date) return "—";
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle} 
          className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-heading font-semibold text-sm md:text-base hidden sm:block">
          Medical Evaluation Robot Assistant
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Robot connection badge */}
        <div className="flex items-center gap-2">
          {robotConnected ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1.5 text-xs">
              <Wifi className="w-3 h-3" />
              <span className="hidden sm:inline">Robot connecté</span>
              <span className="sm:hidden">En ligne</span>
              <span className="text-[10px] opacity-70 hidden md:inline">
                {formatTime(lastDataTime)}
              </span>
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1.5 text-xs">
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Robot hors ligne</span>
              <span className="sm:hidden">Hors ligne</span>
            </Badge>
          )}
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>
      </div>
    </header>
  );
}