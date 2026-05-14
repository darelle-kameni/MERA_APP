import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/lib/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CreditCard, Baby, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PatientRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    sex: "",
    card_id: "",
    village: "",
    health_center_id: "",
  });

  const isPediatric = form.age && parseInt(form.age) < 15;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.card_id.trim()) { toast.error(t("child.cardIdRequired")); return; }
    setSaving(true);
    try {
      const res = await base44.patient.register({
        ...form,
        age: parseInt(form.age),
        card_id: form.card_id.trim().toUpperCase(),
      });
      const { patient, credentials } = res;
      const name = patient.full_name || form.full_name || "Nouvel enfant";
      setSaving(false);
      toast.success(`${name} ${t("child.registered")}`, {
        description: `Carte: ${credentials.card_id} · PIN: ${credentials.pin}`,
        duration: 8000,
      });
      setTimeout(() => navigate(`/diagnostic?patient_id=${patient.id}`), 2500);
    } catch (err) {
      const msg = err.status === 409 ? t("child.cardUsed") : err.message || t("common.error", "Erreur");
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          {t("child.newChild")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("child.register", "Enregistrer un enfant")}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
        {isPediatric && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Baby className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{t("child.pediatricMode")}</span>
          </div>
        )}

        <div>
          <Label htmlFor="name">{t("child.name", "Nom complet")} (optionnel)</Label>
          <Input
            id="name"
            placeholder="Nom du patient"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age">{t("child.age", "Âge")} *</Label>
            <Input
              id="age"
              type="number"
              placeholder="Âge"
              required
              min="0"
              max="120"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>{t("child.sex", "Sexe")} *</Label>
            <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })} required>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sexe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">{t("child.masculine", "Masculin")}</SelectItem>
                <SelectItem value="F">{t("child.feminine", "Féminin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="card_id">{t("child.cardId", "ID Carte RFID")} *</Label>
          <Input
            id="card_id"
            placeholder="Numéro de la carte RFID"
            required
            value={form.card_id}
            onChange={(e) => setForm({ ...form, card_id: e.target.value })}
            className="mt-1.5 font-mono uppercase"
          />
        </div>

        <div>
          <Label htmlFor="village">{t("child.village", "Village")}</Label>
          <Input
            id="village"
            placeholder="Nom du village"
            value={form.village}
            onChange={(e) => setForm({ ...form, village: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>{t("child.healthCenter", "Centre de santé")}</Label>
          <Select value={form.health_center_id} onValueChange={(v) => setForm({ ...form, health_center_id: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={t("child.selectCenter", "Sélectionner un centre")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="douala">CSI Douala</SelectItem>
              <SelectItem value="bafoussam">HD Bafoussam</SelectItem>
              <SelectItem value="maroua">CSI Maroua</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button type="submit" disabled={saving || !form.age || !form.sex || !form.card_id.trim()} className="flex-1 h-12">
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t("child.registerAndStart", "Enregistrer et démarrer diagnostic")}
              </>
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          L'ID de carte RFID servira d'identifiant pour le patient
        </p>
      </form>
    </div>
  );
}