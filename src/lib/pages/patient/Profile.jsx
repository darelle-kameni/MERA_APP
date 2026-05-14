import { useEffect, useState } from 'react';
import { usePatientAuth } from '@/lib/PatientAuthContext';
import { useTranslation } from '@/lib/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, CreditCard, Phone, MapPin, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientProfile() {
  const { t } = useTranslation();
  const { patient, updateMe } = usePatientAuth();
  const [form, setForm] = useState({ village: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (patient) setForm({ village: patient.village || '', phone: patient.phone || '' });
  }, [patient]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateMe(form);
      toast.success('Informations mises à jour');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  if (!patient) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" /> {t("patient.myInfo")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("patient.editInfo")}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h2 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
          {t("patient.readonlyInfo")}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t("child.name")}</p>
            <p className="font-medium">{patient.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("child.age")}</p>
            <p className="font-medium">{patient.age} ans</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("child.sex")}</p>
            <p className="font-medium">{patient.sex === 'M' ? t("child.masculine") : t("child.feminine")}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
          {t("patient.contactStaff")}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h2 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> {t("child.cardId")}
        </h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono truncate">
            {showCard ? patient.card_id : '••••••••••'}
          </code>
          <Button variant="outline" size="sm" onClick={() => setShowCard((v) => !v)}>
            {showCard ? t("patient.hide") : t("patient.show")}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {t("patient.keepIdSafe", "Conservez cet ID et votre PIN en lieu sûr.")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
          {t("patient.editableInfo")}
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="village" className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> {t("child.village")}
          </Label>
          <Input id="village" placeholder="Nom de votre village" value={form.village}
            onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> {t("patient.phone")}
          </Label>
          <Input id="phone" type="tel" placeholder="+237 ..." value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
        </Button>
      </form>
    </div>
  );
}
