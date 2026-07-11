import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Stethoscope, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const next = new URLSearchParams(location.search).get('next') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMessage, setErrMessage] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setSubmitting(true);
    setErrMessage(null);
    try {
      await login(identifier.trim(), password);
      toast.success('Connexion réussie');
      navigate(next, { replace: true });
    } catch (err) {
      if (err.status === 403 && err.data?.error === 'account_inactive') {
        setErrMessage(err.data.message || 'Compte non actif');
      } else {
        setErrMessage(err.status === 401
          ? 'Identifiant ou mot de passe incorrect'
          : 'Erreur de connexion');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-1">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-heading font-bold">MERA</h1>
          <p className="text-xs text-muted-foreground">Médical  Evaluation  Robotique  Assistant</p>
        </div>

        {errMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs">{errMessage}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="identifier">{t("login.identifier", "Email ou ID Card")}</Label>
            <Input id="identifier" type="text" autoComplete="username" value={identifier}
              placeholder="vous@example.com ou EN-XXXX-XXXX"
              onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("login.password", "Mot de passe")}</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("login.login", "Se connecter")}
          </Button>
        </form>

        <div className="text-center space-y-1.5 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {t("login.noAccount", "Pas encore de compte ?")}{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              {t("login.requestAccess")}
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("login.childPrompt")}{' '}
            <Link to="/patient/login" className="text-primary font-medium hover:underline">
              {t("login.patient")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
