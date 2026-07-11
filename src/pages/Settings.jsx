import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Globe, Building2, Cpu, Wifi, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/useTranslation";
import { toast } from "sonner";

export default function Settings() {
  const { t } = useTranslation();
  const [lang, setLang] = useState(localStorage.getItem("mera_lang") || "fr");
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState(localStorage.getItem("mera_center_id") || "");
  const [meraUrl, setMeraUrl] = useState(localStorage.getItem("mera_backend_url") || "http://192.168.1.10:4000");
  const [raspUrl, setRaspUrl] = useState(localStorage.getItem("mera_rasp_url") || "http://192.168.1.110:5000");
  const [wifiSsid, setWifiSsid] = useState(localStorage.getItem("mera_wifi_ssid") || "");
  const [wifiPass, setWifiPass] = useState(localStorage.getItem("mera_wifi_password") || "");
  const [showWifiPass, setShowWifiPass] = useState(false);

  useEffect(() => {
    base44.entities.HealthCenter.list().then(setCenters).catch(() => {});
  }, []);

  const handleSave = () => {
    localStorage.setItem("mera_lang", lang);
    localStorage.setItem("mera_center_id", centerId);
    localStorage.setItem("mera_backend_url", meraUrl);
    localStorage.setItem("mera_rasp_url", raspUrl);
    localStorage.setItem("mera_wifi_ssid", wifiSsid);
    localStorage.setItem("mera_wifi_password", wifiPass);
    window.dispatchEvent(new Event("mera:langchange"));
    toast.success("Paramètres enregistrés");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-primary" />
          {t("nav.settings", "Paramètres")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration de l'application</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Langue</h3>
        </div>
        <Select value={lang} onValueChange={(v) => { setLang(v); localStorage.setItem("mera_lang", v); window.dispatchEvent(new Event("mera:langchange")); }}>
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

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Centre de santé</h3>
        </div>
        <Select value={centerId} onValueChange={setCenterId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un centre" />
          </SelectTrigger>
          <SelectContent>
            {centers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name} — {c.region}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Wifi className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">WiFi — QR Code patients</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Ces identifiants seront utilisés pour générer le QR code WiFi à donner aux patients.
        </p>
        <div>
          <Label>Nom du réseau (SSID)</Label>
          <Input value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className="mt-1.5 font-mono" placeholder="MERA" />
        </div>
        <div>
          <Label>Mot de passe</Label>
          <div className="relative mt-1.5">
            <Input type={showWifiPass ? "text" : "password"} value={wifiPass}
              onChange={(e) => setWifiPass(e.target.value)} className="font-mono pr-10" placeholder="Mot de passe WiFi" />
            <button type="button" onClick={() => setShowWifiPass(!showWifiPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showWifiPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Configuration réseau robot</h3>
        </div>
        <div>
          <Label>URL du backend MERA</Label>
          <Input value={meraUrl} onChange={(e) => setMeraUrl(e.target.value)} className="mt-1.5 font-mono" />
          <p className="text-xs text-muted-foreground mt-1">Adresse du serveur</p>
        </div>
        <div>
          <Label>URL Raspberry Pi (capture oculaire)</Label>
          <Input value={raspUrl} onChange={(e) => setRaspUrl(e.target.value)} className="mt-1.5 font-mono" />
          <p className="text-xs text-muted-foreground mt-1">Adresse de la Raspberry Pi</p>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-12 gap-2">
        <Save className="w-4 h-4" />
        Enregistrer les paramètres
      </Button>
    </div>
  );
}
