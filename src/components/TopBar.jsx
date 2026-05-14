import { useTranslation } from "@/lib/useTranslation";
import { Menu, Wifi, WifiOff, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { base44 } from "@/api/base44Client";

const initials = (s) => (s || '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((w) => w[0]?.toUpperCase())
  .join('') || '?';

export default function TopBar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [robotConnected, setRobotConnected] = useState(false);
  const [lastDataTime, setLastDataTime] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const devices = await base44.entities.MeraDevice.list("-last_sync", 10);
        const online = devices.filter((d) => {
          if (d.status === 'en_ligne' && d.last_sync) {
            const elapsed = Date.now() - new Date(d.last_sync).getTime();
            return elapsed < 60000;
          }
          return false;
        });
        setRobotConnected(online.length > 0);
        if (online.length > 0) setLastDataTime(new Date(online[0].last_sync));
      } catch { setRobotConnected(false); }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => date
    ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-heading font-semibold text-sm md:text-base hidden sm:block">
          Medical Evaluation Robot Assistant
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {robotConnected ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1.5 text-xs">
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">{t("topbar.robotOnline")}</span>
            <span className="sm:hidden">{t("topbar.online")}</span>
            <span className="text-[10px] opacity-70 hidden md:inline">{formatTime(lastDataTime)}</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1.5 text-xs">
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">{t("topbar.robotOffline")}</span>
            <span className="sm:hidden">{t("topbar.offline")}</span>
          </Badge>
        )}

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" aria-label="Menu utilisateur">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                {initials(user?.full_name || user?.email)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium truncate">{user?.full_name || 'Utilisateur'}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                {user?.role && (
                  <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="gap-2 cursor-pointer">
                <SettingsIcon className="w-3.5 h-3.5" /> Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="gap-2 text-destructive cursor-pointer focus:text-destructive">
              <LogOut className="w-3.5 h-3.5" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
