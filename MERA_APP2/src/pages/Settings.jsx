import { useState } from "react";
import { Settings as SettingsIcon, Globe, Bell, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const [language, setLanguage] = useState("fr");
  const [notifications, setNotifications] = useState(true);
  const [pin, setPin] = useState("");

  const handleSave = () => {
    toast.success("Paramètres enregistrés");
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

      {/* Language */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Langue</h3>
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ff">Fulfulde</SelectItem>
            <SelectItem value="ew">Ewondo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications */}
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
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      </div>

      {/* Security */}
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
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="mt-1.5 w-32"
          />
          <p className="text-xs text-muted-foreground mt-1">Accès rapide sans mot de passe complet</p>
        </div>
      </div>

      {/* Center info */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Centre de santé</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nom du centre</Label>
            <Input placeholder="CSI Douala" className="mt-1.5" />
          </div>
          <div>
            <Label>District</Label>
            <Input placeholder="District sanitaire" className="mt-1.5" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-12">
        Enregistrer les paramètres
      </Button>
    </div>
  );
}