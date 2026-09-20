import { HeartHandshake } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { PROFILES, type DemoProfile, type DemoProfileId } from '../../lib/mock-data';
import { bootstrapDemoSession, ensureDemoSession, isRealMode } from '../../lib/supabase';

type AuthStatus = 'loading' | 'authenticated' | 'failed';

interface DemoContextValue {
  activeProfile: DemoProfile;
  setActiveProfile: (id: DemoProfileId) => Promise<boolean>;
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
  const [isBootstrapping, setIsBootstrapping] = useState(isRealMode);
  const [hasBootstrapped, setHasBootstrapped] = useState(!isRealMode);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const switchRequest = useRef(0);
  const activeProfile = PROFILES[profileId];

  useEffect(() => {
    if (!isRealMode) return;
    let cancelled = false;
    setIsBootstrapping(true);
    setAuthStatus('loading');
    setAuthError(null);

    bootstrapDemoSession('amma')
      .then((authenticatedProfileId) => {
        if (cancelled) return;
        setProfileId(authenticatedProfileId);
        setAuthStatus('authenticated');
        setHasBootstrapped(true);
        setIsBootstrapping(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthStatus('failed');
        setAuthError("CareLoop couldn't start the demo.");
        setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt]);

  const selectProfile = async (id: DemoProfileId) => {
    if (id === profileId && authStatus === 'authenticated') return true;
    const requestId = ++switchRequest.current;
    setAuthStatus(isRealMode ? 'loading' : 'authenticated');
    setAuthError(null);
    try {
      await ensureDemoSession(id);
      if (requestId !== switchRequest.current) return false;
      setProfileId(id);
      setAuthStatus('authenticated');
      return true;
    } catch {
      if (requestId !== switchRequest.current) return false;
      setAuthStatus('failed');
      setAuthError(`CareLoop could not switch to ${PROFILES[id].displayName}. Try again.`);
      return false;
    }
  };

  if (isBootstrapping) {
    return (
      <main className="demo-bootstrap" aria-live="polite" aria-busy="true">
        <HeartHandshake size={42} aria-hidden="true" />
        <strong>CareLoop</strong>
        <span>Getting things ready…</span>
      </main>
    );
  }

  if (isRealMode && authStatus === 'failed' && !hasBootstrapped) {
    return (
      <main className="demo-bootstrap" role="alert">
        <HeartHandshake size={42} aria-hidden="true" />
        <strong>CareLoop couldn't start the demo.</strong>
        <button
          type="button"
          className="primary-button"
          onClick={() => setBootstrapAttempt((value) => value + 1)}
        >
          Try again
        </button>
      </main>
    );
  }

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
