import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, QrCode, Baby, Copy, Printer, Check, Stethoscope } from "lucide-react";
import { toast } from "sonner";

const CredentialsModal = ({ open, credentials, patient, onClose, onContinue }) => {
  const [copied, setCopied] = useState(null);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const print = () => {
    if (!credentials) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) { toast.error("Impossible d'ouvrir la fenêtre d'impression"); return; }
    w.document.write(`
      <html><head><title>Carte patient MERA</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; max-width: 360px; margin: 0 auto; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
        .box { border: 2px dashed #94a3b8; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
        .label { text-transform: uppercase; font-size: 10px; color: #64748b; letter-spacing: 0.1em; margin-bottom: 4px; }
        .value { font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 0.05em; word-break: break-all; }
        .pin { font-size: 28px; letter-spacing: 0.3em; }
        .footer { font-size: 10px; color: #94a3b8; margin-top: 16px; }
      </style>
      </head><body>
      <h1>MERA — Carte patient</h1>
      <div class="sub">${patient?.full_name || 'Patient'} · ${patient?.age} ans</div>
      <div class="box"><div class="label">Code patient (QR)</div><div class="value">${credentials.qr_code}</div></div>
      <div class="box"><div class="label">Code PIN</div><div class="value pin">${credentials.pin}</div></div>
      <p class="footer">Ces identifiants permettent d'accéder à votre dossier sur l'application MERA.<br/>Conservez-les en lieu sûr.</p>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body></html>
    `);
    w.document.close();
  };

  if (!credentials || !patient) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-green-500/10 mb-2">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <DialogTitle className="text-center">Patient enregistré</DialogTitle>
          <DialogDescription className="text-center">
            Communiquez ces identifiants au patient. <strong>Le PIN ne sera plus affiché ensuite.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-muted/50 rounded-lg p-3 border-2 border-dashed border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <QrCode className="w-3 h-3" /> Code patient
            </p>
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono text-sm font-bold tracking-wider truncate">{credentials.qr_code}</code>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => copy(credentials.qr_code, 'qr')}>
                {copied === 'qr' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 border-2 border-dashed border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Stethoscope className="w-3 h-3" /> Code PIN (4 chiffres)
            </p>
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono text-2xl font-bold tracking-[0.5em]">{credentials.pin}</code>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => copy(credentials.pin, 'pin')}>
                {copied === 'pin' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={print} className="gap-1.5 w-full sm:w-auto">
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </Button>
          <Button onClick={onContinue} className="w-full sm:flex-1">
            Démarrer le diagnostic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [centers, setCenters] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [createdPatient, setCreatedPatient] = useState(null);
  const [form, setForm] = useState({
    full_name: "", age: "", sex: "", village: "", phone: "", health_center_id: "",
  });

  useEffect(() => {
    base44.entities.HealthCenter.list().then(setCenters).catch(() => { });
  }, []);

  const isPediatric = form.age && parseInt(form.age) < 15;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await base44.patient.register({
        full_name: form.full_name || null,
        age: parseInt(form.age),
        sex: form.sex,
        village: form.village || null,
        phone: form.phone || null,
        health_center_id: form.health_center_id || null,
      });
      toast.success("Patient enregistré");
      setCreatedPatient(result.patient);
      setCredentials(result.credentials);
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const continueToDiagnostic = () => {
    if (!createdPatient) return;
    navigate(`/diagnostic?patient_id=${createdPatient.id}`);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          Nouveau patient
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enregistrer un patient — un code QR et un PIN seront générés
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
        {isPediatric && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Baby className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Mode pédiatrique activé</span>
          </div>
        )}

        <div>
          <Label htmlFor="name">Nom complet (optionnel)</Label>
          <Input id="name" placeholder="Nom du patient" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age">Âge *</Label>
            <Input id="age" type="number" placeholder="Âge" required min="0" max="120"
              value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Sexe *</Label>
            <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })} required>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sexe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculin</SelectItem>
                <SelectItem value="F">Féminin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="village">Village</Label>
            <Input id="village" placeholder="Nom du village" value={form.village}
              onChange={(e) => setForm({ ...form, village: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" placeholder="+237 ..." value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label>Centre de santé</Label>
          <Select value={form.health_center_id} onValueChange={(v) => setForm({ ...form, health_center_id: v })}
            disabled={centers.length === 0}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={centers.length === 0 ? "Aucun centre disponible" : "Sélectionner un centre"} />
            </SelectTrigger>
            <SelectContent>
              {centers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}{c.region ? ` — ${c.region}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving || !form.age || !form.sex} className="w-full h-12">
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><QrCode className="w-4 h-4 mr-2" /> Enregistrer le patient</>
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Un code QR et un PIN à 4 chiffres seront générés automatiquement
        </p>
      </form>

      <CredentialsModal
        open={!!credentials}
        credentials={credentials}
        patient={createdPatient}
        onClose={() => { setCredentials(null); setCreatedPatient(null); }}
        onContinue={continueToDiagnostic}
      />
    </div>
  );
}
