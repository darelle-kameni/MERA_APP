import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const PatientAuthContext = createContext();

export const PatientAuthProvider = ({ children }) => {
  const [patient, setPatient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const me = await base44.patient.me();
      setPatient(me);
      setIsAuthenticated(true);
    } catch (err) {
      setPatient(null);
      setIsAuthenticated(false);
      if (err.status !== 401 && err.status !== 403) {
        setAuthError({ type: 'unknown', message: err.message || 'Auth check failed' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (card_id, pin) => {
    const { patient: me } = await base44.patient.login(card_id, pin);
    setPatient(me);
    setIsAuthenticated(true);
    setAuthError(null);
    return me;
  };

  const logout = async () => {
    try { await base44.auth.logout(null); } catch { /* ignore */ }
    setPatient(null);
    setIsAuthenticated(false);
    window.location.href = '/patient/login';
  };

  const updateMe = async (data) => {
    const updated = await base44.patient.updateMe(data);
    setPatient(updated);
    return updated;
  };

  return (
    <PatientAuthContext.Provider value={{
      patient, isAuthenticated, isLoadingAuth, authError,
      login, logout, updateMe, refresh: checkAuth,
    }}>
      {children}
    </PatientAuthContext.Provider>
  );
};

export const usePatientAuth = () => {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error('usePatientAuth must be used within a PatientAuthProvider');
  return ctx;
};
