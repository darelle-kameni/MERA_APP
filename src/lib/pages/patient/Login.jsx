import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { usePatientAuth } from '@/lib/PatientAuthContext';
import { useTranslation } from '@/lib/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CreditCard, Lock, Stethoscope } from 'lucide-react';

export default function PatientLogin() {
  const { t } = useTranslation();
  const { login } = usePatientAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') || '/patient';

  const [cardId, setCardId] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!cardId || pin.length !== 4) return;
    setSubmitting(true);
    try {
      await login(cardId.trim(), pin);
      toast.success('Bienvenue');
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(err.status === 401 ? 'ID de carte ou PIN incorrect' : 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-amber-50">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary items-center justify-center">
            <Stethoscope className="w-7 h-7 text-primary-foreground" />
          </div>
<h1 className="text-xl font-heading font-bold">{t("login.patient", "Espace enfant")}</h1>
           <p className="text-xs text-muted-foreground">{t("login.accessRecord", "Accédez à votre dossier médical")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="card_id" className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> {t("login.cardId", "ID Carte")}
            </Label>
            <Input id="card_id" placeholder="Numéro de la carte RFID" autoComplete="off"
              value={cardId} onChange={(e) => setCardId(e.target.value)}
              className="font-mono text-sm" required />
            <p className="text-[10px] text-muted-foreground">{t("login.cardId")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin" className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> {t("login.pin", "Code PIN (4 chiffres)")}
            </Label>
            <Input id="pin" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
              placeholder="••••" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="text-center font-mono text-lg tracking-[0.5em]" required />
          </div>

          <Button type="submit" disabled={submitting || pin.length !== 4 || !cardId} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("login.accessRecord", "Accéder à mon dossier")}
          </Button>
        </form>

        <div className="text-center space-y-1">
          <p className="text-[11px] text-muted-foreground">
            {t("login.staffPrompt")}
          </p>
          <Link to="/login" className="text-xs text-primary font-medium hover:underline">
            {t("login.staffLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
