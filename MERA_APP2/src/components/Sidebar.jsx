import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, UserPlus, Stethoscope, FolderOpen, 
  ClipboardCheck, BarChart3, Cpu, Settings, X, Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Tableau de bord" },
  { path: "/patients/new", icon: UserPlus, label: "Nouveau patient" },
  { path: "/diagnostic", icon: Stethoscope, label: "Session diagnostic" },
  { path: "/patients", icon: FolderOpen, label: "Dossiers patients" },
  { path: "/reviews", icon: ClipboardCheck, label: "Revue médicale" },
  { path: "/epidemiology", icon: BarChart3, label: "Épidémiologie" },
  { path: "/devices", icon: Cpu, label: "Appareils MERA" },
  { path: "/simulator", icon: Bot, label: "Simulateur IA" },
  { path: "/settings", icon: Settings, label: "Paramètres" },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose} 
        />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Bot className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-white">MERA</h1>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.path === "/" 
              ? location.pathname === "/" 
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20" 
                    : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/40 text-center">
            MERA v1.0 — Medical Evaluation Robot Assistant
          </p>
        </div>
      </aside>
    </>
  );
}