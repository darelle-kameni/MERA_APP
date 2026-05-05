import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Clock, ChevronRight } from "lucide-react";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function RecentSessions({ sessions = [] }) {
  if (!sessions.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">Sessions récentes</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Aucune session</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Sessions récentes</h3>
        <Link to="/patients" className="text-xs text-primary hover:underline">Voir tout</Link>
      </div>
      <div className="space-y-3">
        {sessions.slice(0, 6).map((session) => (
          <Link 
            key={session.id} 
            to={`/diagnostic/${session.id}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(session.patient_name || "?")[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{session.patient_name || "Patient anonyme"}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{session.session_date || new Date(session.created_date).toLocaleDateString("fr-FR")}</span>
                  <span>•</span>
                  <span>{session.patient_age ? `${session.patient_age} ans` : "—"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UrgencyBadge level={session.urgency_level} />
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}