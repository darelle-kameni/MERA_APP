import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Plus, X, Check, Search, Loader2, Pencil, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoading, PageError } from '@/components/shared/PageState';
import { formatCountry, COUNTRY_FLAGS } from '@/lib/countries';

const STATUS_META = {
  pending: { label: 'En attente', cls: 'bg-warning/10 text-warning border-warning/20' },
  approved: { label: 'Approuvé', cls: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Rejeté', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const EMPTY_FORM = {
  disease: '',
  plant_name_fr: '',
  plant_name_local: '',
  part_used: '',
  preparation: '',
  dosage_adult: '',
  dosage_child: '',
  precautions: '',
  contre_indications: '',
  max_severity: '',
  evidence_level: 'traditionnel_rapporté',
  source: '',
  source_url: '',
  culture: '',
  country: '',
  contributed_by: '',
  status: 'pending',
};

export default function AdminPharmacopee() {
  const [treatments, setTreatments] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.q = search.trim();
      const [list, c] = await Promise.all([
        base44.admin.listTreatments(params),
        base44.admin.listCultures().catch(() => []),
      ]);
      setTreatments(Array.isArray(list) ? list : []);
      setCultures(Array.isArray(c) ? c : []);
    } catch (err) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = useMemo(() => treatments.filter((t) => t.status === 'pending').length, [treatments]);

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (t) => {
    setEditId(t.id);
    setForm({
      disease: t.disease || '',
      plant_name_fr: t.plant_name_fr || '',
      plant_name_local: t.plant_name_local || '',
      part_used: t.part_used || '',
      preparation: t.preparation || '',
      dosage_adult: t.dosage_adult || '',
      dosage_child: t.dosage_child || '',
      precautions: t.precautions || '',
      contre_indications: t.contre_indications || '',
      max_severity: t.max_severity || '',
      evidence_level: t.evidence_level || 'traditionnel_rapporté',
      source: t.source || '',
      source_url: t.source_url || '',
      culture: t.culture || '',
      country: t.country || '',
      contributed_by: t.contributed_by || '',
      status: t.status || 'pending',
    });
    setShowForm(true);
  };

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.disease.trim() || !form.plant_name_fr.trim()) {
      toast.error('La maladie et la plante sont obligatoires');
      return;
    }
    if (!form.preparation.trim()) {
      toast.error('La préparation est obligatoire');
      return;
    }
    if (!form.contre_indications.trim()) {
      toast.error('Les contre-indications sont obligatoires (DQ-01)');
      return;
    }
    if (!form.source.trim() || !form.source_url.trim()) {
      toast.error('La référence et son URL de source sont obligatoires (DQ-01)');
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await base44.admin.updateTreatment(editId, form);
        toast.success('Traitement mis à jour');
      } else {
        await base44.admin.createTreatment(form);
        toast.success('Contribution ajoutée — en attente de validation');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Échec de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (t, status) => {
    try {
      await base44.admin.updateTreatment(t.id, { status });
      toast.success(`Traitement ${status === 'approved' ? 'approuvé' : status === 'rejected' ? 'rejeté' : 'mis en attente'}`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Échec de la mise à jour');
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Supprimer le traitement "${t.plant_name_fr}" ?`)) return;
    try {
      await base44.admin.deleteTreatment(t.id);
      toast.success('Traitement supprimé');
      await load();
    } catch (err) {
      toast.error(err.message || 'Échec de la suppression');
    }
  };

  if (loading && treatments.length === 0) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <Leaf className="w-6 h-6 text-primary" />
          Pharmacopée traditionnelle
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérer les traitements issus des cultures du monde entier, leurs sources et leur modération
        </p>
      </div>

      {/* Pending moderation */}
      {pendingCount > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold">{pendingCount} contribution(s) en attente de validation</p>
              <p className="text-xs text-muted-foreground">Vérifiez la source avant d'approuver</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setStatusFilter('pending'); setSearch(''); }}>
            Voir
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une maladie, une plante, une culture..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="approved">Approuvés</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="rejected">Rejetés</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> Ajouter un traitement
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-heading font-semibold">
              {editId ? 'Modifier le traitement' : 'Nouveau traitement traditionnel'}
            </p>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!editId && (
            <p className="text-xs text-muted-foreground bg-muted border border-border rounded-lg p-2.5">
              Nouvelle contribution : elle sera créée <strong>en attente</strong> et n'apparaîtra
              dans les vues cliniques qu'après vérification de la source puis approbation.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Maladie / Condition *</label>
              <Input value={form.disease} onChange={(e) => set('disease')(e.target.value)} placeholder="Ex: Paludisme" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Plante (nom scientifique) *</label>
              <Input value={form.plant_name_fr} onChange={(e) => set('plant_name_fr')(e.target.value)} placeholder="Ex: Artemisia annua" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nom local</label>
              <Input value={form.plant_name_local} onChange={(e) => set('plant_name_local')(e.target.value)} placeholder="Ex: Ufiten (fulfulde)" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Partie utilisée</label>
              <Input value={form.part_used} onChange={(e) => set('part_used')(e.target.value)} placeholder="Feuilles, racines, écorce..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Culture / Pays d'origine</label>
              <Input list="cultures-list" value={form.culture} onChange={(e) => set('culture')(e.target.value)} placeholder="Ex: Kenya, Maroc, Inde, Massaï..." />
              <datalist id="cultures-list">
                {cultures.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pays (code ISO, ex: KE)</label>
              <div className="flex items-center gap-2">
                {form.country && <span className="text-lg">{COUNTRY_FLAGS[form.country.toUpperCase()] || ''}</span>}
                <Input
                  list="countries-list"
                  value={form.country}
                  onChange={(e) => set('country')(e.target.value.toUpperCase())}
                  placeholder="Ex: KE, IN, MA"
                />
              </div>
              <datalist id="countries-list">
                {Object.entries(COUNTRY_FLAGS).map(([code, flag]) => (
                  <option key={code} value={code}>{`${flag} ${formatCountry(code)}`}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Contributeur</label>
              <Input value={form.contributed_by} onChange={(e) => set('contributed_by')(e.target.value)} placeholder="Nom ou organisation" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Préparation *</label>
            <Textarea value={form.preparation} onChange={(e) => set('preparation')(e.target.value)} rows={2} placeholder="Méthode de préparation..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Dosage adulte</label>
              <Input value={form.dosage_adult} onChange={(e) => set('dosage_adult')(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Dosage enfant</label>
              <Input value={form.dosage_child} onChange={(e) => set('dosage_child')(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Précautions</label>
              <Input value={form.precautions} onChange={(e) => set('precautions')(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Contre-indications *</label>
              <Input value={form.contre_indications} onChange={(e) => set('contre_indications')(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Source (référence) *</label>
              <Input value={form.source} onChange={(e) => set('source')(e.target.value)} placeholder="Ex: WHO Monograph Vol.2" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Source URL *</label>
              <Input value={form.source_url} onChange={(e) => set('source_url')(e.target.value)} placeholder="https://pubmed.ncbi.nlm.nih.gov/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Niveau d'évidence</label>
                <Select value={form.evidence_level} onValueChange={set('evidence_level')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditionnel_rapporté">Trad. rapporté</SelectItem>
                    <SelectItem value="traditionnel_avéré">Trad. avéré</SelectItem>
                    {editId && (
                      <>
                        <SelectItem value="clinique">Clinique</SelectItem>
                        <SelectItem value="OMS">OMS</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {!editId && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    « Clinique » et « OMS » réservés à la modération après vérification de la source.
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Urgence max</label>
                <Select value={form.max_severity} onValueChange={set('max_severity')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="modere">Modéré</SelectItem>
                    <SelectItem value="eleve">Élevé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={submit} disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
          {treatments.length} traitement(s){pendingCount > 0 ? ` · ${pendingCount} en attente` : ''}
        </p>
        {treatments.length === 0 && !loading && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            Aucun traitement trouvé
          </div>
        )}
        {loading && <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>}

        {treatments.map((t) => {
          const sm = STATUS_META[t.status] || STATUS_META.pending;
          return (
            <div key={t.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-sm">{t.plant_name_fr}</p>
                {t.country && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {formatCountry(t.country)}
                  </Badge>
                )}
                {t.culture && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    🌍 {t.culture}
                  </Badge>
                )}
                <Badge variant="outline" className={sm.cls}>{sm.label}</Badge>
              </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.disease}{t.plant_name_local ? ` · ${t.plant_name_local}` : ''}
                  </p>
                  {t.contributed_by && (
                    <p className="text-[10px] text-muted-foreground mt-1">Contributeur : {t.contributed_by}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {t.status !== 'approved' && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(t, 'approved')} className="gap-1 text-success">
                      <Check className="w-3.5 h-3.5" /> Approuver
                    </Button>
                  )}
                  {t.status !== 'pending' && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(t, 'pending')} className="gap-1">
                      En attente
                    </Button>
                  )}
                  {t.status !== 'rejected' && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(t, 'rejected')} className="gap-1 text-destructive">
                      Rejeter
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t)} className="text-destructive">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {t.preparation && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.preparation}</p>}
              {t.source_url && (
                <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline mt-1 inline-block">
                  Vérifier la source ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
