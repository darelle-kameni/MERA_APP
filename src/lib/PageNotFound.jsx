import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Home, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const location = useLocation();
  const { user } = useAuth();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="space-y-1">
          <div className="inline-flex w-14 h-14 rounded-full bg-muted items-center justify-center">
            <Compass className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-5xl font-light text-muted-foreground/50">404</h1>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-heading font-semibold">Page introuvable</h2>
          <p className="text-sm text-muted-foreground">
            La page <span className="font-medium text-foreground">"{pageName}"</span> n'existe pas.
          </p>
        </div>
        {user?.role === 'admin' && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <span className="font-medium">Note admin :</span> cette route n'est pas montée dans <code>App.jsx</code>.
          </p>
        )}
        <Button asChild>
          <Link to="/" className="gap-1.5">
            <Home className="w-4 h-4" /> Retour au tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  );
}
