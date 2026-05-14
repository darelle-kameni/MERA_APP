import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Globe, Bell, Shield, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const STORAGE_KEY = "mera_settings_v1";

const defaults = {
  language: "fr",
  notifications: true,
  pin: "",
  centerName: "",
  district: "",
};

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
};

export default function Settings() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(defaults);

  useEffect(() => { setSettings(loadSettings()); }, []);

  const update = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success("Paramètres enregistrés");
    } catch {
      toast.error("Impossible d'enregistrer les paramètres");
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration de l'application</p>
      </div>

      {user && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-muted-foreground">Compte connecté</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email} · {user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Déconnexion
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Langue</h3>
        </div>
        <Select value={settings.language} onValueChange={(v) => update("language", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ff">Fulfulde</SelectItem>
            <SelectItem value="ew">Ewondo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Notifications</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Alertes critiques</p>
            <p className="text-xs text-muted-foreground">Recevoir les alertes quand un cas critique est détecté</p>
          </div>
          <Switch checked={settings.notifications} onCheckedChange={(v) => update("notifications", v)} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Sécurité</h3>
        </div>
        <div>
          <Label>Code PIN rapide</Label>
          <Input
            type="password"
            maxLength={4}
            placeholder="4 chiffres"
            value={settings.pin}
            onChange={(e) => update("pin", e.target.value.replace(/\D/g, ""))}
            className="mt-1.5 w-32"
          />
          <p className="text-xs text-muted-foreground mt-1">Accès rapide sans mot de passe complet</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Centre de santé</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nom du centre</Label>
            <Input placeholder="CSI Douala" className="mt-1.5"
              value={settings.centerName} onChange={(e) => update("centerName", e.target.value)} />
          </div>
          <div>
            <Label>District</Label>
            <Input placeholder="District sanitaire" className="mt-1.5"
              value={settings.district} onChange={(e) => update("district", e.target.value)} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-12">
        Enregistrer les paramètres
      </Button>
    </div>
  );
}
