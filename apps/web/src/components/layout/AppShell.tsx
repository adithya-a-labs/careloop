import { HeartHandshake, Home, Clock, Mic, Users, ListChecks, BookHeart, MoreHorizontal } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ProfileSwitcher } from '../navigation/ProfileSwitcher';
import { useDemoProfile } from '../../features/demo/DemoContext';

const navLinks = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/timeline', label: 'Timeline', icon: Clock },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/memories', label: 'Memories', icon: BookHeart },
  { to: '/circle', label: 'Circle', icon: Users },
] as const;

export function AppShell() {
  const { isPatientView, activeProfile } = useDemoProfile();
  const location = useLocation();

  // Decide which "home" route to redirect to based on role
  const homeRoute = isPatientView ? '/home' : '/family';

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to={homeRoute} className="brand">
          <HeartHandshake size={24} />
          <span>CareLoop</span>
        </NavLink>
        <ProfileSwitcher />
      </header>

      <main className="page-wrap">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navLinks.map(({ to, label, icon: Icon }) => {
          // Swap /home for /family when in family view
          const effectiveTo = to === '/home' ? homeRoute : to;
          const effectiveLabel = to === '/home' && !isPatientView ? 'Family' : label;
          return (
            <NavLink key={to} to={effectiveTo}>
              <Icon size={20} />
              <span>{effectiveLabel}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
