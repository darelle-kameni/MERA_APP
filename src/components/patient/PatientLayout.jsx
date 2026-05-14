import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Stethoscope, FolderOpen, User, MessageCircle, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { usePatientAuth } from '@/lib/PatientAuthContext';

const initials = (s) => (s || '')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const navItems = [
  { to: '/patient', icon: FolderOpen, label: 'Mon dossier', end: true },
  { to: '/patient/profile', icon: User, label: 'Mes informations' },
  { to: '/patient/chat', icon: MessageCircle, label: 'Discuter avec MERA' },
];

export default function PatientLayout() {
  const { patient, logout } = usePatientAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-3xl mx-auto h-14 px-4 flex items-center justify-between">
          <Link to="/patient" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-heading font-bold text-sm">MERA</p>
              <p className="text-[10px] text-muted-foreground">Espace enfant</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}>
                <item.icon className="w-3.5 h-3.5" /> {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-muted">
                  {initials(patient?.full_name) || patient?.card_id?.slice(-3) || '?'}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-muted-foreground">
                <LogOut className="w-3.5 h-3.5" /> Déconnexion
              </Button>
            </div>
            <button onClick={() => setOpen((v) => !v)} className="md:hidden p-2 hover:bg-muted rounded-lg">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border bg-card">
            <nav className="max-w-3xl mx-auto p-2 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(
                    "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}>
                  <item.icon className="w-4 h-4" /> {item.label}
                </NavLink>
              ))}
              <button onClick={() => { setOpen(false); logout(); }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
