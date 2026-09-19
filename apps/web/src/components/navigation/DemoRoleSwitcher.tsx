import { useState } from 'react';
import type { CareRole } from '@careloop/shared';

export function DemoRoleSwitcher() {
  const [role, setRole] = useState<CareRole>('family');
  return <label className="role-switcher"><span>Demo as</span><select value={role} onChange={(event) => setRole(event.target.value as CareRole)}>
    <option value="care-recipient">Care recipient</option><option value="family">Family member</option><option value="coordinator">Coordinator</option>
  </select></label>;
}
