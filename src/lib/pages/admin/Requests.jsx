import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Inbox, FileSignature, Mail, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoading, PageError } from '@/components/shared/PageState';
import { useTranslation } from '@/lib/useTranslation';

const STATUS_COLORS = {
  pending: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  approved: 'bg-green-500/10 text-green-700 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/30',
};

export default function AdminRequests() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [acting, setActing] = useState(null);
  const [signatureModal, setSignatureModal] = useState(null);
  const [cardIdInput, setCardIdInput] = useState('');
  const { t } = useTranslation();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.admin.listRequests(statusFilter);
      setRequests(data);
    } catch (err) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setActing(id);
    try {
      const res = await base44.admin.approveRequest(id, { id_card: cardIdInput.trim() || undefined });
      const card = res.user.id_card;
      toast.success(`Compte créé — ID Card : ${card}`);
      setCardIdInput('');
      await load();
      setExpandedId(null);
    } catch (err) {
      toast.error(err.message || 'Échec de la validation');
    } finally {
      setActing(null);
    }
  };

  const reject = async (id) => {
    setActing(id);
    try {
      await base44.admin.rejectRequest(id, rejectionReason);
      toast.success('Demande rejetée');
      setRejectionReason('');
      await load();
      setExpandedId(null);
    } catch (err) {
      toast.error(err.message || 'Échec du rejet');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
            <Inbox className="w-6 h-6 text-primary" />
            {t("admin.requests")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {requests.length} demande(s) {statusFilter !== 'all' ? `(${statusFilter})` : ''}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t("admin.filterPending")}</SelectItem>
            <SelectItem value="approved">{t("admin.filterApproved")}</SelectItem>
            <SelectItem value="rejected">{t("admin.filterRejected")}</SelectItem>
            <SelectItem value="all">{t("admin.filterAll")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {requests.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{t("admin.noRequests")}</p>
        </div>
      )}

      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {r.role === 'medecin' ? <FileSignature className="w-5 h-5 text-primary" /> : <Mail className="w-5 h-5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.full_name || r.email}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    {r.email} · <span className="capitalize">{r.role}</span>
                    <Calendar className="w-3 h-3 ml-1" /> {new Date(r.created_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {expandedId === r.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                {r.message && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("admin.motivation")}</p>
                    <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                  </div>
                )}

                {r.signature_url && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("admin.signatureDigital")}</p>
                    <div className="p-3 rounded-lg bg-white border border-border inline-block">
                      <button onClick={() => setSignatureModal(`/api${r.signature_url}`)}>
                        <img src={`/api${r.signature_url}`} alt="Signature"
                          className="max-h-24 max-w-full cursor-pointer hover:opacity-80 transition-opacity" />
                      </button>
                    </div>
                  </div>
                )}

                {r.status === 'rejected' && r.rejection_reason && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-red-600 mb-1">{t("admin.reason")}</p>
                    <p className="text-sm">{r.rejection_reason}</p>
                  </div>
                )}

                {r.status === 'pending' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("admin.idCardRfid")}</p>
                      <Input placeholder={t("admin.idCardAuto")}
                        value={expandedId === r.id ? cardIdInput : ''}
                        onChange={(e) => setCardIdInput(e.target.value)}
                        className="font-mono" />
                    </div>
                    <Textarea placeholder={t("admin.reason") + " (optionnel, requis si rejet)..."}
                      value={expandedId === r.id ? rejectionReason : ''}
                      onChange={(e) => setRejectionReason(e.target.value)} rows={2} />
                    <div className="flex gap-2">
                      <Button onClick={() => approve(r.id)} disabled={!!acting} className="flex-1 gap-1.5">
                        {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {t("admin.approve")}
                      </Button>
                      <Button onClick={() => reject(r.id)} disabled={!!acting} variant="destructive" className="flex-1 gap-1.5">
                        <XCircle className="w-4 h-4" /> {t("admin.reject")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Signature modal */}
      <Dialog open={!!signatureModal} onOpenChange={(o) => !o && setSignatureModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.signatureDigital")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 bg-white rounded-lg">
            {signatureModal && (
              <img src={signatureModal} alt="Signature" className="max-h-[70vh] max-w-full object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
