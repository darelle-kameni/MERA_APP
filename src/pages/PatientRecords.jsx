import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/useTranslation";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, FolderOpen, ChevronRight, UserPlus, Baby, Calendar, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import UrgencyBadge from "../components/shared/UrgencyBadge";

export default function PatientRecords() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [newPin, setNewPin] = useState("");

  const [deleting, setDeleting] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    const [p, s] = await Promise.all([
      base44.entities.Patient.list("-created_date"),
      base44.entities.DiagnosticSession.list("-created_date", 200).catch(() => []),
    ]);
    setPatients(p || []);
    setSessions(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sessionByPatient = {};
  sessions.forEach(s => {
    const pid = s.patient_id;
    if (!sessionByPatient[pid] || new Date(s.created_date) > new Date(sessionByPatient[pid].created_date)) {
      sessionByPatient[pid] = s;
    }
  });

  const patientMap = {};
  patients.forEach(p => { patientMap[p.id] = p; });

  const filteredPatients = patients.filter(p => {
    const nameMatch = !search ||
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.village || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.card_id || "").toLowerCase().includes(search.toLowerCase());
    return nameMatch;
  });

  const openEdit = (patient) => {
    setEditForm({
      full_name: patient.full_name || "",
      age: String(patient.age || ""),
      sex: patient.sex || "",
      village: patient.village || "",
      card_id: patient.card_id || "",
    });
    setNewPin("");
    setEditing(patient);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await base44.entities.Patient.update(editing.id, {
        ...editForm,
        age: parseInt(editForm.age),
        card_id: editForm.card_id.trim().toUpperCase(),
      });
      if (newPin) {
        await base44.patient.regeneratePin(editing.id, { pin: newPin });
        toast.success(t("child.pinUpdated"), { duration: 4000 });
      }
      toast.success(`Enfant ${t("child.modified")}`, { duration: 4000 });
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message || "Erreur lors de la modification");
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingId(deleting.id);
    try {
      await base44.entities.Patient.delete(deleting.id);
      toast.success(`${deleting.full_name || "Enfant"} ${t("child.deleted")}`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-primary" />
            {t("child.records")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {patients.length} {t("child.count")} &middot; {sessions.length} {t("child.sessionsCount")}
          </p>
        </div>
        <Button onClick={() => navigate("/patients/new")}>
          <UserPlus className="w-4 h-4 mr-2" />
          {t("child.newChild")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search", "Rechercher par nom, village ou carte RFID...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

      </div>

      <div className="space-y-2">
        {filteredPatients.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Baby className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("child.noChildren")}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/patients/new")}>
              <UserPlus className="w-4 h-4 mr-2" />
              {t("child.register")}
            </Button>
          </div>
        )}
        {filteredPatients.map((patient) => {
          const lastSession = sessionByPatient[patient.id];
          return (
            <div
              key={patient.id}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-md transition-all group"
            >
              <Link
                to={lastSession ? `/diagnostic/${lastSession.id}` : `/diagnostic?patient_id=${patient.id}`}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(patient.full_name || "?")[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {patient.full_name || "Anonyme"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{patient.age ? `${patient.age} ans` : ""}</span>
                    {patient.sex && <span>&middot; {patient.sex === "M" ? t("child.boy") : t("child.girl")}</span>}
                    {patient.village && <span>&middot; {patient.village}</span>}
                    {patient.card_id && <span>&middot; <span className="font-mono">{patient.card_id}</span></span>}
                    {lastSession ? (
                      <span>&middot; <Calendar className="w-3 h-3 inline" /> {new Date(lastSession.created_date).toLocaleDateString("fr-FR")}</span>
                    ) : (
                      <span className="text-yellow-600">&middot; {t("child.startSession")}</span>
                    )}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {lastSession && <UrgencyBadge level={lastSession.urgency_level} />}
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(patient); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title={t("child.edit")}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleting(patient); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
                  title={t("child.delete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("child.edit")}</DialogTitle>
            <DialogDescription>{t("child.editDescription", "Modifier les informations de l'enfant")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label>{t("child.name")}</Label>
              <Input value={editForm.full_name || ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("child.age")}</Label>
                <Input type="number" value={editForm.age || ""} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} required />
              </div>
              <div>
                <Label>{t("child.sex")}</Label>
                <Select value={editForm.sex} onValueChange={(v) => setEditForm({ ...editForm, sex: v })} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">{t("child.masculine")}</SelectItem>
                    <SelectItem value="F">{t("child.feminine")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("child.cardId")}</Label>
              <Input value={editForm.card_id || ""} onChange={(e) => setEditForm({ ...editForm, card_id: e.target.value })} required className="font-mono" />
            </div>
            <div>
              <Label>{t("child.village")}</Label>
              <Input value={editForm.village || ""} onChange={(e) => setEditForm({ ...editForm, village: e.target.value })} />
            </div>
            <div>
              <Label>{t("child.pin")}</Label>
              <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                placeholder={t("child.pinPlaceholder", "Laisser vide pour conserver l'actuel")}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="font-mono text-center tracking-[0.3em]" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.save") + "..." : t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("child.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.full_name || "Cet enfant"} {t("child.confirmDeleteMsg")} Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!!deletingId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId === deleting?.id ? t("child.delete") + "..." : t("child.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
