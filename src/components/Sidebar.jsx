import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, UserPlus, Stethoscope, FolderOpen,
  ClipboardCheck, Cpu, Settings, X, Bot,
  Shield, Inbox, Users as UsersIcon, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from "@/lib/useTranslation";

// `end: true` = exact-match only. Default (false) = prefix-match (so /diagnostic
// stays active on /diagnostic/:id too). `roles` restricts visibility.
const baseNavItems = [
  { path: "/",                 icon: LayoutDashboard, labelKey: "nav.dashboard", end: true },
  { path: "/patients/new",     icon: UserPlus,        labelKey: "nav.newChild", roles: ["encadreur"], end: true },
  { path: "/diagnostic",       icon: Stethoscope,     labelKey: "nav.session", roles: ["encadreur"] },
  { path: "/patients",         icon: FolderOpen,      labelKey: "nav.children", roles: ["encadreur", "medecin"], end: true },
  { path: "/reviews",          icon: ClipboardCheck,  labelKey: "nav.review", roles: ["medecin"], end: true },
  { path: "/devices",          icon: Cpu,             labelKey: "nav.devices", roles: ["admin"], end: true },
  { path: "/simulator",        icon: Bot,             labelKey: "nav.simulator", roles: ["encadreur", "medecin"] },
];

const adminItems = [
  { path: "/admin/requests",    icon: Inbox,     label: "Demandes",     end: true },
  { path: "/admin/users",       icon: UsersIcon, label: "Utilisateurs", end: true },
  { path: "/admin/assignments", icon: Link2,     label: "Associations", end: true },
];

const settingsItem = { path: "/settings", icon: Settings, label: "Paramètres", end: true };

const NavItem = ({ item, onClose }) => (
  <NavLink
    to={item.path}
    end={item.end}
    onClick={onClose}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
      isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
        : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent",
    )}>
    <item.icon className="w-5 h-5 flex-shrink-0" /> <span>{item.label}</span>
  </NavLink>
);

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = user?.role;
  const canSee = (item) => !item.roles || item.roles.includes(role);
  const navItems = baseNavItems.map((item) => ({ ...item, label: t(item.labelKey, item.labelKey) }));
  const mainNav = navItems.filter(canSee);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}>
        <div className="p-5 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Bot className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-white">MERA</h1>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">
                {role === 'admin' ? 'Administration' : role === 'medecin' ? 'Médecin' : 'Encadreur'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {mainNav.map((item) => (
            <NavItem key={item.path} item={item} onClose={onClose} />
          ))}

          {role === 'admin' && (
            <div className="pt-4">
              <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Administration
              </p>
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </div>
          )}

          <div className="pt-4">
            <NavItem item={settingsItem} onClose={onClose} />
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/40 text-center">
            MERA v2.0 — Medical Embedded Robotic Assistant
          </p>
        </div>
      </aside>
    </>
  );
}
