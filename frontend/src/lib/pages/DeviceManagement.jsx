import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Cpu, Battery, Wifi, WifiOff, RefreshCw, Settings as SettingsIcon, Eye, EyeOff, Copy, Check,
  Plus, Loader2, RotateCw, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageLoading, PageError } from "../components/shared/PageState";

const STATUS_CONFIG = {
  en_ligne:    { label: "En ligne",    color: "bg-green-500/10 text-green-600 border-green-500/30", icon: Wifi },
  hors_ligne:  { label: "Hors ligne",  color: "bg-red-500/10 text-red-600 border-red-500/30",       icon: WifiOff },
  maintenance: { label: "Maintenance", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: RefreshCw },
};

const formatTime = (iso) => {
  if (!iso) return "Jamais";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return d.toLocaleString("fr-FR");
};

const ConfigureDialog = ({ device, isAdmin, onClose, onSaved }) => {
  const [form, setForm] = useState({
    serial_number: device?.serial_number || '',
    ip_address: device?.ip_address || '',
    port: device?.port ?? 80,
    health_center_name: device?.health_center_name || '',
    firmware_version: device?.firmware_version || '',
  });
  const [token, setToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (device) setForm({
      serial_number: device.serial_number, ip_address: device.ip_address || '',
      port: device.port ?? 80, health_center_name: device.health_center_name || '',
      firmware_version: device.firmware_version || '',
    });
    setToken(null);
  }, [device]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.MeraDevice.update(device.id, {
        ip_address: form.ip_address.trim() || null,
        port: parseInt(form.port, 10) || null,
        health_center_name: form.health_center_name || null,
        firmware_version: form.firmware_version || null,
      });
      toast.success('Configuration enregistrée');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally { setSubmitting(false); }
  };

  const revealToken = async () => {
    try {
      const data = await base44.devices.getToken(device.id);
      setToken(data.api_token);
    } catch (err) { toast.error(err.message || 'Erreur'); }
  };

  const regenerate = async () => {
    if (!confirm("Régénérer l'API token ? L'ancien token cessera de fonctionner immédiatement.")) return;
    try {
      const data = await base44.devices.regenerateToken(device.id);
      setToken(data.api_token);
      toast.success('Token régénéré');
    } catch (err) { toast.error(err.message || 'Erreur'); }
  };

  const copy = (val, key) => navigator.clipboard.writeText(val).then(() => {
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  });

  if (!device) return null;

  return (
    <Dialog open={!!device} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurer {device.serial_number}</DialogTitle>
          <DialogDescription>Adresse réseau de l'ESP32 et identifiants d'API</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <Label htmlFor="ip">Adresse IP de l'ESP32</Label>
              <Input id="ip" placeholder="192.168.1.42" value={form.ip_address}
                onChange={update('ip_address')} className="mt-1.5 font-mono" />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input id="port" type="number" min={1} max={65535} value={form.port}
                onChange={update('port')} className="mt-1.5 w-20 font-mono" />
            </div>
          </div>

          <div>
            <Label htmlFor="hc">Nom du centre</Label>
            <Input id="hc" value={form.health_center_name} onChange={update('health_center_name')} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="fw">Version firmware (affichée)</Label>
            <Input id="fw" placeholder="1.2.0" value={form.firmware_version}
              onChange={update('firmware_version')} className="mt-1.5 font-mono" />
            <p className="text-[10px] text-muted-foreground mt-1">Auto-mise à jour lors d'un ping réussi</p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
          </Button>
        </form>

        {isAdmin && (
          <>
            <div className="border-t border-border pt-3 space-y-2">
              <Label className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> API Token (à flasher dans l'ESP32)
              </Label>
              {token ? (
                <div className="bg-muted/50 rounded-lg p-3 border-2 border-dashed border-border space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-xs break-all flex-1">{token}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                      onClick={() => copy(token, 'token')}>
                      {copied === 'token' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Header HTTP: <code>Authorization: Bearer {'{token}'}</code>
                  </p>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={revealToken} className="w-full gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Voir le token
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={regenerate} className="w-full gap-1.5 text-orange-700">
                <RotateCw className="w-3.5 h-3.5" /> Régénérer (révoque l'ancien)
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CreateDeviceDialog = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({ serial_number: '', ip_address: '', port: 80, health_center_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await base44.entities.MeraDevice.create({
        serial_number: form.serial_number.trim(),
        ip_address: form.ip_address.trim() || null,
        port: parseInt(form.port, 10) || null,
        health_center_name: form.health_center_name || null,
        status: 'hors_ligne',
      });
      // Generate a token for this new device
      await base44.devices.regenerateToken(created.id);
      toast.success('Appareil créé — pense à configurer le token');
      setForm({ serial_number: '', ip_address: '', port: 80, health_center_name: '' });
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel appareil MERA</DialogTitle>
          <DialogDescription>Un token API sera généré automatiquement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="cd-sn">Numéro de série *</Label>
            <Input id="cd-sn" required placeholder="MERA-XXXX-001"
              value={form.serial_number} onChange={update('serial_number')} className="mt-1.5 font-mono" />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <Label htmlFor="cd-ip">Adresse IP</Label>
              <Input id="cd-ip" placeholder="192.168.1.42" value={form.ip_address}
                onChange={update('ip_address')} className="mt-1.5 font-mono" />
            </div>
            <div>
              <Label htmlFor="cd-port">Port</Label>
              <Input id="cd-port" type="number" value={form.port} onChange={update('port')}
                className="mt-1.5 w-20 font-mono" />
            </div>
          </div>
          <div>
            <Label htmlFor="cd-hc">Centre</Label>
            <Input id="cd-hc" value={form.health_center_name} onChange={update('health_center_name')} className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer l\'appareil'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function DeviceManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pinging, setPinging] = useState({});
  const [configuring, setConfiguring] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setDevices(await base44.entities.MeraDevice.list()); }
    catch (err) { setError(err.message || 'Erreur réseau'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pingOne = useCallback(async (id) => {
    setPinging((p) => ({ ...p, [id]: true }));
    try {
      const result = await base44.devices.ping(id);
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, ...result.device } : d));
      return result;
    } catch (err) {
      if (err.data?.error === 'no_address') {
        // expected — just propagate silently
        return { reachable: false, error: 'no_address' };
      }
      return { reachable: false, error: err.message };
    } finally {
      setPinging((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }, []);

  // Auto-ping all devices once after load
  useEffect(() => {
    if (devices.length === 0) return;
    devices.forEach((d) => { if (d.ip_address) pingOne(d.id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices.length]);

  const handlePing = async (d) => {
    const result = await pingOne(d.id);
    if (result.reachable) toast.success(`${d.serial_number} : en ligne`);
    else if (result.error === 'no_address') toast.error('Configurez d\'abord l\'adresse IP');
    else toast.error(`${d.serial_number} : ${result.error || 'injoignable'}`);
  };

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <Cpu className="w-6 h-6 text-primary" />
            Appareils MERA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {devices.length} appareil(s) — statut vérifié par requête HTTP vers l'ESP32
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Ajouter un appareil
          </Button>
        )}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Cpu className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun appareil enregistré</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const status = STATUS_CONFIG[device.status] || STATUS_CONFIG.hors_ligne;
          const StatusIcon = status.icon;
          const battery = device.battery_level ?? 0;
          const batteryColor = battery > 60 ? "text-green-600" : battery > 20 ? "text-yellow-600" : "text-red-600";
          const isPinging = !!pinging[device.id];

          return (
            <div key={device.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-primary" />
                </div>
                <Badge variant="outline" className={cn("gap-1", status.color)}>
                  {isPinging ? <Loader2 className="w-3 h-3 animate-spin" /> : <StatusIcon className="w-3 h-3" />}
                  {status.label}
                </Badge>
              </div>

              <div>
                <h3 className="font-heading font-semibold text-sm font-mono">{device.serial_number}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{device.health_center_name || "Centre non assigné"}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Adresse
                  </span>
                  <span className="font-mono">
                    {device.ip_address ? `${device.ip_address}:${device.port || 80}` : <span className="text-orange-600">non configurée</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Battery className={cn("w-3.5 h-3.5", batteryColor)} /> Batterie
                  </span>
                  <span className={cn("font-medium", batteryColor)}>{battery}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all",
                    battery > 60 ? "bg-green-500" : battery > 20 ? "bg-yellow-500" : "bg-red-500")}
                    style={{ width: `${battery}%` }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Firmware</span>
                  <span className="font-mono text-[10px]">{device.firmware_version || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dernier contact</span>
                  <span className="text-[10px]">{formatTime(device.last_sync)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={() => handlePing(device)} disabled={isPinging || !device.ip_address}
                  size="sm" variant="outline" className="flex-1 gap-1.5">
                  {isPinging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Pinger
                </Button>
                {isAdmin && (
                  <Button onClick={() => setConfiguring(device)} size="sm" className="flex-1 gap-1.5">
                    <SettingsIcon className="w-3.5 h-3.5" /> Configurer
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfigureDialog device={configuring} isAdmin={isAdmin}
        onClose={() => setConfiguring(null)} onSaved={load} />
      <CreateDeviceDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </div>
  );
}
