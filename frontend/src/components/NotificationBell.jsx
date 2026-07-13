import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/useTranslation';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, BellRing, Check, AlertTriangle, Inbox, FileSignature, BabyIcon, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const KIND_META = {
  urgent_case:           { Icon: AlertTriangle,  color: 'text-red-600 bg-red-500/10' },
  diagnosis_published:   { Icon: FileSignature,  color: 'text-blue-600 bg-blue-500/10' },
  diagnosis_referral:    { Icon: AlertTriangle,  color: 'text-orange-600 bg-orange-500/10' },
  child_created:         { Icon: BabyIcon,       color: 'text-emerald-600 bg-emerald-500/10' },
  registration_pending:  { Icon: Inbox,          color: 'text-purple-600 bg-purple-500/10' },
  assignment_created:    { Icon: Link2,          color: 'text-cyan-600 bg-cyan-500/10' },
};

const formatTime = (iso) => {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString('fr-FR');
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { items, unread_count } = await base44.notifications.list({ limit: 12 });
      setItems(items);
      setUnread(unread_count);
    } catch {
      // silent — TopBar shouldn't toast on every poll error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const onClickItem = async (n) => {
    setOpen(false);
    try {
      if (!n.read_at) await base44.notifications.markRead(n.id);
    } catch { /* ignore */ }
    if (n.link) navigate(n.link);
    refresh();
  };

  const markAll = async () => {
    try { await base44.notifications.markAllRead(); } catch { /* ignore */ }
    refresh();
  };

  const Icon = unread > 0 ? BellRing : Bell;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lue${unread > 1 ? 's' : ''})` : ''}`}>
        <Icon className={cn("w-4 h-4", unread > 0 && "text-primary")} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-sm font-heading font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAll} className="text-[11px] text-primary hover:underline">
              Tout marquer comme lu
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              {loading ? t("common.loading") : 'Aucune notification'}
            </div>
          )}
          {items.map((n) => {
            const { Icon: KIcon, color } = KIND_META[n.kind] || { Icon: Bell, color: 'text-muted-foreground bg-muted' };
            return (
              <button key={n.id} onClick={() => onClickItem(n)}
                className={cn(
                  "w-full px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted/50 text-left transition-colors border-b border-border last:border-0",
                  !n.read_at && "bg-primary/[0.03]",
                )}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", color)}>
                  <KIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(n.created_date)}</p>
                </div>
              </button>
            );
          })}
        </div>

        {items.length > 0 && unread === 0 && (
          <div className="px-3 py-2 border-t border-border text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> Tout est à jour
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
