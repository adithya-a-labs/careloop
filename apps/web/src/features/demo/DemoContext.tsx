import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PROFILES, type DemoProfile, type DemoProfileId } from '../../lib/mock-data';
import { ensureDemoSession, isRealMode } from '../../lib/supabase';

type AuthStatus = 'loading' | 'authenticated' | 'failed';

interface DemoContextValue {
  activeProfile: DemoProfile;
  setActiveProfile: (id: DemoProfileId) => void;
  isPatientView: boolean;
  authStatus: AuthStatus;
  authError: string | null;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = useState<DemoProfileId>('amma');
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isRealMode ? 'loading' : 'authenticated',
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const activeProfile = PROFILES[profileId];

  useEffect(() => {
    let cancelled = false;
    setAuthStatus(isRealMode ? 'loading' : 'authenticated');
    setAuthError(null);

    ensureDemoSession(profileId)
      .then(() => {
        if (!cancelled) setAuthStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setAuthStatus('failed');
        setAuthError(`CareLoop could not sign in as ${PROFILES[profileId].displayName}.`);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const selectProfile = (id: DemoProfileId) => {
    if (id === profileId) return;
    setAuthStatus(isRealMode ? 'loading' : 'authenticated');
    setAuthError(null);
    setProfileId(id);
  };

  return (
    <DemoContext.Provider
      value={{
        activeProfile,
        setActiveProfile: selectProfile,
        isPatientView: activeProfile.isPatient,
        authStatus,
        authError,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoProfile() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoProfile must be used inside DemoProvider');
  return ctx;
}
