import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/useTranslation';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users, Shield, Stethoscope, UserCog, Search, MoreVertical, UserPlus, Copy, Check,
  PauseCircle, PlayCircle, Key, Trash2, Pencil, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageLoading, PageError } from '@/components/shared/PageState';

const ROLE_ICON = { admin: Shield, medecin: Stethoscope, encadreur: UserCog };
const STATUS_COLORS = {
  active: 'bg-green-500/10 text-green-700 border-green-500/30',
  pending: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  suspended: 'bg-red-500/10 text-red-700 border-red-500/30',
};

const CredentialsCard = ({ label, value, onCopy }) => (
  <div className="bg-muted/50 rounded-lg p-3 border-2 border-dashed border-border">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <div className="flex items-center justify-between gap-2">
      <code className="font-mono text-sm font-bold truncate flex-1">{value}</code>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}>
        <Copy className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>
);

const CreateUserDialog = ({ open, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', full_name: '', role: 'encadreur', id_card: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [creds, setCreds] = useState(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const copy = (val) => navigator.clipboard.writeText(val).then(() => toast.success('Copié'));

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.id_card) delete payload.id_card;
      const result = await base44.admin.createUser(payload);
      setCreds(result.credentials);
      onCreated();
      toast.success('Compte créé');
    } catch (err) {
      const msg = err.status === 409 ? (err.data?.error === 'id_card_taken' ? 'ID de carte déjà utilisé' : 'Email déjà utilisé') : err.message || 'Erreur';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({ email: '', full_name: '', role: 'encadreur', id_card: '', password: '' });
    setCreds(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        {creds ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("admin.accountCreated")}</DialogTitle>
              <DialogDescription>
                Communiquez ces identifiants à l'utilisateur. <strong>Le mot de passe ne sera plus affiché.</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <CredentialsCard label="ID Card" value={creds.id_card} onCopy={() => copy(creds.id_card)} />
              <CredentialsCard label="Mot de passe" value={creds.password} onCopy={() => copy(creds.password)} />
            </div>
            <DialogFooter>
              <Button onClick={() => { reset(); onClose(); }} className="w-full">{t("common.close")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("admin.createUser")}</DialogTitle>
              <DialogDescription>Le compte sera actif immédiatement, sans demande préalable.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="cu-name">{t("child.name")}</Label>
                <Input id="cu-name" required value={form.full_name} onChange={update('full_name')} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cu-email">{t("login.email")}</Label>
                <Input id="cu-email" type="email" required value={form.email} onChange={update('email')} className="mt-1.5" />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={update('role')}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("dashboard.admins")}</SelectItem>
                    <SelectItem value="medecin">{t("dashboard.medecins")}</SelectItem>
                    <SelectItem value="encadreur">{t("dashboard.encadreurs")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cu-card">{t("admin.idCardRfid")}</Label>
                <Input id="cu-card" value={form.id_card} onChange={update('id_card')}
                  placeholder={t("admin.idCardAuto")} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cu-pwd">{t("login.password")}</Label>
                <Input id="cu-pwd" type="text" minLength={6} value={form.password} onChange={update('password')}
                  placeholder="Vide = généré automatiquement" className="mt-1.5" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le compte'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const EditUserDialog = ({ user, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    role: user?.role || 'encadreur',
    status: user?.status || 'active',
    id_card: user?.id_card || '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name || '', role: user.role, status: user.status, id_card: user.id_card || '' });
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.id_card) delete payload.id_card;
      await base44.admin.updateUser(user.id, payload);
      toast.success('Utilisateur mis à jour');
      onUpdated();
      onClose();
    } catch (err) {
      const msg = err.data?.error === 'cannot_demote_self' ? 'Vous ne pouvez pas vous rétrograder vous-même'
        : err.data?.error === 'cannot_suspend_self' ? 'Vous ne pouvez pas vous suspendre vous-même'
        : err.data?.error === 'id_card_taken' ? 'Cet ID de carte est déjà utilisé'
        : err.message || 'Erreur';
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  if (!user) return null;
  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("child.edit")} l'utilisateur</DialogTitle>
          <DialogDescription>{user.email} · <code className="font-mono">{user.id_card}</code></DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="eu-name">{t("child.name")}</Label>
            <Input id="eu-name" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t("dashboard.admins")}</SelectItem>
                <SelectItem value="medecin">{t("dashboard.medecins")}</SelectItem>
                <SelectItem value="encadreur">{t("dashboard.encadreurs")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="eu-card">{t("admin.idCard")}</Label>
            <Input id="eu-card" value={form.id_card}
              onChange={(e) => setForm({ ...form, id_card: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ResultDialog = ({ open, title, value, label, onClose }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Ne sera plus affiché par la suite. Copiez-le maintenant.</DialogDescription>
        </DialogHeader>
        <CredentialsCard label={label} value={value || ''}
          onCopy={() => navigator.clipboard.writeText(value).then(() => toast.success('Copié'))} />
        <DialogFooter>
          <Button onClick={onClose} className="w-full">{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ConfirmDialog = ({ open, title, message, danger, confirmLabel, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">{t("common.cancel")}</Button>
          <Button variant={danger ? 'destructive' : 'default'} onClick={onConfirm} className="flex-1">
            {confirmLabel || t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminUsers() {
  const { t } = useTranslation();
  const ROLE_LABEL = { admin: t("dashboard.admins"), medecin: t("dashboard.medecins"), encadreur: t("dashboard.encadreurs") };
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setUsers(await base44.admin.listUsers()); }
    catch (err) { setError(err.message || 'Erreur réseau'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = (u) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    setConfirm({
      title: nextStatus === 'suspended' ? 'Suspendre cet utilisateur ?' : 'Réactiver cet utilisateur ?',
      message: nextStatus === 'suspended'
        ? `${u.full_name || u.email} ne pourra plus se connecter.`
        : `${u.full_name || u.email} pourra à nouveau se connecter.`,
      danger: nextStatus === 'suspended',
      confirmLabel: nextStatus === 'suspended' ? 'Suspendre' : 'Réactiver',
      action: async () => {
        try {
          await base44.admin.updateUser(u.id, { status: nextStatus });
          toast.success(nextStatus === 'suspended' ? 'Utilisateur suspendu' : 'Utilisateur réactivé');
          await load();
        } catch (err) {
          toast.error(err.data?.error === 'cannot_suspend_self' ? 'Vous ne pouvez pas vous suspendre vous-même' : err.message);
        }
      },
    });
  };

  const resetPassword = (u) => setConfirm({
    title: `Réinitialiser le mot de passe de ${u.full_name || u.email} ?`,
    message: 'Un nouveau mot de passe sera généré et affiché une seule fois.',
    confirmLabel: 'Réinitialiser',
    action: async () => {
      try {
        const { password } = await base44.admin.resetPassword(u.id);
        setResult({ title: 'Nouveau mot de passe', label: 'Mot de passe', value: password });
      } catch (err) { toast.error(err.message || 'Erreur'); }
    },
  });

  const deleteUser = (u) => setConfirm({
    title: `Supprimer ${u.full_name || u.email} ?`,
    message: 'Cette action est irréversible. Tous les enfants rattachés perdront leur tuteur.',
    danger: true,
    confirmLabel: 'Supprimer définitivement',
    action: async () => {
      try {
        await base44.admin.deleteUser(u.id);
        toast.success('Utilisateur supprimé');
        await load();
      } catch (err) {
        toast.error(err.data?.error === 'cannot_delete_self' ? 'Vous ne pouvez pas vous supprimer vous-même' : err.message);
      }
    },
  });

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  const q = search.toLowerCase();
  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!q) return true;
    return [u.email, u.full_name, u.id_card].some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            {t("admin.users")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} comptes enregistrés</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <UserPlus className="w-4 h-4" /> {t("admin.createUser")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher nom, email, ID Card..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="admin">{t("dashboard.admins")}</SelectItem>
            <SelectItem value="medecin">{t("dashboard.medecins")}</SelectItem>
            <SelectItem value="encadreur">{t("dashboard.encadreurs")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((u) => {
          const Icon = ROLE_ICON[u.role] || UserCog;
          const isMe = u.id === me?.id;
          return (
            <div key={u.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{u.full_name || u.email}</p>
                  <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[u.role]}</Badge>
                  {isMe && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">vous</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {u.email} · <code className="font-mono text-[10px]">{u.id_card || '—'}</code>
                </p>
              </div>
              <Badge variant="outline" className={STATUS_COLORS[u.status]}>{u.status}</Badge>

              <DropdownMenu>
                <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setEditing(u)} className="gap-2">
                    <Pencil className="w-3.5 h-3.5" /> {t("child.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleStatus(u)} disabled={isMe && u.status === 'active'} className="gap-2">
                    {u.status === 'active'
                      ? <><PauseCircle className="w-3.5 h-3.5" /> Suspendre</>
                      : <><PlayCircle className="w-3.5 h-3.5" /> Réactiver</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => resetPassword(u)} className="gap-2">
                    <Key className="w-3.5 h-3.5" /> Réinitialiser mot de passe
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => deleteUser(u)} disabled={isMe}
                    className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> {t("child.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">Aucun utilisateur ne correspond</div>
        )}
      </div>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} onUpdated={load} />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        danger={confirm?.danger}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={async () => { await confirm?.action?.(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
      <ResultDialog open={!!result} title={result?.title} label={result?.label} value={result?.value}
        onClose={() => setResult(null)} />
    </div>
  );
}
