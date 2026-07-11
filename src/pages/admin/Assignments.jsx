import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, X, Plus, Stethoscope, UserCog, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoading, PageError } from '@/components/shared/PageState';
import { useTranslation } from '@/lib/useTranslation';

export default function AdminAssignments() {
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doctor, setDoctor] = useState('');
  const [encadreur, setEncadreur] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, a] = await Promise.all([base44.admin.listUsers(), base44.admin.listAssignments()]);
      setUsers(u);
      setAssignments(a);
    } catch (err) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doctors = useMemo(() => users.filter((u) => u.role === 'medecin' && u.status === 'active'), [users]);
  const encadreurs = useMemo(() => users.filter((u) => u.role === 'encadreur' && u.status === 'active'), [users]);

  const create = async () => {
    if (!doctor || !encadreur) return;
    setSubmitting(true);
    try {
      await base44.admin.createAssignment(doctor, encadreur);
      toast.success('Association créée');
      setDoctor(''); setEncadreur('');
      await load();
    } catch (err) {
      toast.error(err.message || 'Échec de l\'association');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await base44.admin.deleteAssignment(id);
      toast.success('Association supprimée');
      await load();
    } catch (err) {
      toast.error(err.message || 'Échec de la suppression');
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <Link2 className="w-6 h-6 text-primary" />
          Associations Médecin ↔ Encadreur
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Le médecin pourra voir les enfants des encadreurs qui lui sont associés
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-heading font-semibold">Créer une association</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-end gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" /> {t("dashboard.medecins")}
            </p>
            <Select value={doctor} onValueChange={setDoctor}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un médecin" /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name || d.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Link2 className="w-4 h-4 text-muted-foreground hidden md:block self-center" />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <UserCog className="w-3.5 h-3.5" /> {t("dashboard.encadreurs")}
            </p>
            <Select value={encadreur} onValueChange={setEncadreur}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un encadreur" /></SelectTrigger>
              <SelectContent>
                {encadreurs.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name || e.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={create} disabled={!doctor || !encadreur || submitting} className="gap-1.5">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Associer
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
          Associations existantes ({assignments.length})
        </p>
        {assignments.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            Aucune association
          </div>
        )}
        {assignments.map((a) => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("dashboard.medecins")}</p>
                <p className="font-medium text-sm truncate">{a.doctor.full_name || a.doctor.email}</p>
              </div>
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("dashboard.encadreurs")}</p>
                <p className="font-medium text-sm truncate">{a.encadreur.full_name || a.encadreur.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(a.id)} className="text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
