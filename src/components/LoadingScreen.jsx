import { useTranslation } from '@/lib/useTranslation';
import { Stethoscope } from 'lucide-react';

export default function LoadingScreen({ label }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Stethoscope className="w-7 h-7 text-primary" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
      <p className="text-xs text-muted-foreground tracking-wide uppercase">{label || t("common.loading")}</p>
    </div>
  );
}
