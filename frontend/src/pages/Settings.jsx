import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Globe, Building2, Cpu, Wifi, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useTranslation, setLanguage } from "@/lib/useTranslation";
import { LANGUAGES } from "@/lib/lang/languages.js";
import { toast } from "sonner";

export default function Settings() {
  const { t } = useTranslation();
  const [lang, setLangState] = useState(localStorage.getItem("mera_lang") || "fr");
  const availableLangs = LANGUAGES.filter((l) => l.available);
  const todoLangs = LANGUAGES.filter((l) => !l.available);
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
    toast.success(t("settings.saved", "Paramètres enregistrés"));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-primary" />
          {t("nav.settings", "Paramètres")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.description", "Configuration de l'application")}</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">{t("settings.language", "Langue")}</h3>
        </div>
        <Select value={lang} onValueChange={(v) => { setLangState(v); setLanguage(v); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableLangs.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.native}{l.name !== l.native ? ` — ${l.name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t("settings.languageHint", "La langue de l'interface. Les traductions incomplètes retombent sur le français.")}
        </p>
        {todoLangs.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              {t("settings.todoTitle", "Langues camerounaises à traduire")} ({todoLangs.length})
            </summary>
            <p className="mt-2">
              {todoLangs.map((l) => `${l.name} (${l.region})`).join(" · ")}
            </p>
          </details>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">{t("settings.healthCenter", "Centre de santé")}</h3>
        </div>
        <Select value={centerId} onValueChange={setCenterId}>
          <SelectTrigger>
            <SelectValue placeholder={t("settings.selectCenter", "Sélectionner un centre")} />
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
          <h3 className="font-heading font-semibold">{t("settings.wifiTitle", "WiFi — QR Code patients")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.wifiHint", "Ces identifiants seront utilisés pour générer le QR code WiFi à donner aux patients.")}
        </p>
        <div>
          <Label>{t("settings.wifiSsid", "Nom du réseau (SSID)")}</Label>
          <Input value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className="mt-1.5 font-mono" placeholder="MERA" />
        </div>
        <div>
          <Label>{t("settings.wifiPassword", "Mot de passe")}</Label>
          <div className="relative mt-1.5">
            <Input type={showWifiPass ? "text" : "password"} value={wifiPass}
              onChange={(e) => setWifiPass(e.target.value)} className="font-mono pr-10" placeholder={t("settings.wifiPasswordPlaceholder", "Mot de passe WiFi")} />
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
          <h3 className="font-heading font-semibold">{t("settings.robotConfig", "Configuration réseau robot")}</h3>
        </div>
        <div>
          <Label>{t("settings.backendUrl", "URL du backend MERA")}</Label>
          <Input value={meraUrl} onChange={(e) => setMeraUrl(e.target.value)} className="mt-1.5 font-mono" />
          <p className="text-xs text-muted-foreground mt-1">{t("settings.backendHint", "Adresse du serveur")}</p>
        </div>
        <div>
          <Label>{t("settings.raspUrl", "URL Raspberry Pi (capture oculaire)")}</Label>
          <Input value={raspUrl} onChange={(e) => setRaspUrl(e.target.value)} className="mt-1.5 font-mono" />
          <p className="text-xs text-muted-foreground mt-1">{t("settings.raspHint", "Adresse de la Raspberry Pi")}</p>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-12 gap-2">
        <Save className="w-4 h-4" />
        {t("settings.save", "Enregistrer les paramètres")}
      </Button>
    </div>
  );
}
