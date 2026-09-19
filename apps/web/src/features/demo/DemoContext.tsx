import { createContext, useContext, useState, type ReactNode } from 'react';
import { PROFILES, type DemoProfile, type DemoProfileId } from '../../lib/mock-data';

interface DemoContextValue {
  activeProfile: DemoProfile;
  setActiveProfile: (id: DemoProfileId) => void;
  isPatientView: boolean;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = useState<DemoProfileId>('amma');
  const activeProfile = PROFILES[profileId];

  return (
    <DemoContext.Provider
      value={{
        activeProfile,
        setActiveProfile: setProfileId,
        isPatientView: activeProfile.isPatient,
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
