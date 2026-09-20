import { useDemoProfile } from '../features/demo/DemoContext';
import { getCareExperience } from '../features/demo/role-experience';
import { CaregiverHomePage } from './CaregiverHome';
import { FamilyHomePage } from './FamilyHome';
import { PatientHomePage } from './PatientHome';

export function RoleAwareHomePage() {
  const { activeProfile } = useDemoProfile();
  const experience = getCareExperience(activeProfile);

  if (experience === 'patient') return <PatientHomePage />;
  if (experience === 'caregiver') return <CaregiverHomePage />;
  return <FamilyHomePage />;
}
