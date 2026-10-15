import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

class ErrorBoundaryInner extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { t } = this.props;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-card rounded-xl border border-border shadow-sm p-6 text-center space-y-4">
          <div className="inline-flex w-12 h-12 rounded-full bg-destructive/10 items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold">{t('error.title', "Une erreur est survenue")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('error.message', "L'application a rencontré un problème inattendu.")}
            </p>
          </div>
          <pre className="text-[11px] text-left bg-muted/50 rounded-lg p-3 overflow-x-auto">
            {this.state.error.message || String(this.state.error)}
          </pre>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={this.reset}>{t('error.retry', "Réessayer")}</Button>
            <Button onClick={this.reload} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> {t('error.reload', "Recharger")}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default function ErrorBoundary(props) {
  const { t } = useTranslation();
  return <ErrorBoundaryInner {...props} t={t} />;
}
