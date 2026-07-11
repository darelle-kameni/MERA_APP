import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/useTranslation';

export const PageLoading = ({ label }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-2">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      {(label || t("common.loading")) && (
        <p className="text-xs text-muted-foreground">{label || t("common.loading")}</p>
      )}
    </div>
  );
};

export const PageError = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <div>
        <p className="text-sm font-medium">{t("common.loadingError")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{message || t("common.loadFailed")}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> {t("common.retry")}
        </Button>
      )}
    </div>
  );
};
