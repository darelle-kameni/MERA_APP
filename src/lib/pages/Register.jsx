import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/lib/useTranslation';
import { toast } from 'sonner';
import { Stethoscope, Upload, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'encadreur', message: '' });
  const [signatureFile, setSignatureFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error(t("register.signatureImage", "La signature doit être une image"));
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error(t("register.imageTooLarge", "Image trop volumineuse (max 2 Mo)"));
      return;
    }
    setSignatureFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErr(null);

    if (form.password.length < 6) {
      setErr(t("register.passwordLength", "Le mot de passe doit contenir au moins 6 caractères"));
      return;
    }
    if (form.role === 'medecin' && !signatureFile) {
      setErr(t("register.signatureRequired", "Une signature numérique est obligatoire pour le rôle Médecin"));
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (signatureFile) fd.append('signature', signatureFile);
      await base44.auth.requestRegistration(fd);
      setSent(true);
    } catch (e) {
      if (e.status === 409) setErr(e.data?.message || 'Un compte ou une demande existe déjà avec cet email');
      else setErr(e.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm p-6 text-center space-y-4">
          <div className="inline-flex w-14 h-14 rounded-full bg-green-500/10 items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-heading font-bold">{t("register.sentTitle", "Demande envoyée")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("register.sentMessage", "Un administrateur va examiner votre demande. Vous recevrez votre ID Card une fois validée.")}
            </p>
          </div>
          <Button onClick={() => navigate('/login')} className="w-full">{t("register.backToLogin", "Retour à la connexion")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-1">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-heading font-bold">{t("register.title", "Demande d'accès MERA")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("register.subtitle", "Votre compte sera activé après validation par un administrateur")}
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-blue-800/90">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>{t("register.infoMessage", "L'administrateur vous attribuera une")} <strong>ID Card</strong> {t("register.infoMessage2", "unique que vous utiliserez pour vous connecter.")}</p>
        </div>

        {err && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{err}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="role">{t("register.iAm", "Je suis")}</Label>
            <Select value={form.role} onValueChange={update('role')}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="encadreur">{t("register.encadreur", "Encadreur (parent / infirmier scolaire)")}</SelectItem>
                <SelectItem value="medecin">{t("register.medecin", "Médecin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="full_name">{t("child.name")}</Label>
            <Input id="full_name" required value={form.full_name} onChange={update('full_name')} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={update('email')} className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input id="password" type="password" required minLength={6} autoComplete="new-password"
              value={form.password} onChange={update('password')} className="mt-1.5" />
            <p className="text-[11px] text-muted-foreground mt-1">{t("register.minChars", "Au moins 6 caractères")}</p>
          </div>

          {form.role === 'medecin' && (
            <div>
              <Label>{t("admin.signatureDigital")} <span className="text-destructive">*</span></Label>
              <label className="mt-1.5 cursor-pointer flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:bg-muted/30 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {signatureFile ? signatureFile.name : t("register.chooseImage", "Choisir une image (PNG transparent recommandé)")}
                </span>
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("register.signatureHint", "Sera incrustée sur les comptes-rendus signés (max 2 Mo)")}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="message">{t("register.motivation", "Motivation (optionnel)")}</Label>
            <Textarea id="message" rows={3} value={form.message} onChange={update('message')} className="mt-1.5"
              placeholder={t("register.motivationPlaceholder", "Présentez brièvement votre contexte (établissement, fonction...)")} />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("register.sendRequest", "Envoyer la demande")}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
          {t("register.hasAccount", "Déjà un compte ?")}{' '}<Link to="/login" className="text-primary font-medium hover:underline">{t("login.login")}</Link>
        </p>
      </div>
    </div>
  );
}
