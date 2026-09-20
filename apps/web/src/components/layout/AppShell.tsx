import { HeartHandshake, Home, Clock, Users, ListChecks, BookHeart } from 'lucide-react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ProfileSwitcher } from '../navigation/ProfileSwitcher';
import { useDemoProfile } from '../../features/demo/DemoContext';
import { canAccessMemoryBox, getHomeRoute } from '../../features/demo/role-experience';

const navLinks = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/timeline', label: 'Timeline', icon: Clock },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/memories', label: 'Memories', icon: BookHeart },
  { to: '/circle', label: 'Circle', icon: Users },
] as const;

export function AppShell() {
  const { activeProfile, authStatus, authError } = useDemoProfile();
  const location = useLocation();
  const homeRoute = getHomeRoute(activeProfile);
  const visibleNavLinks = canAccessMemoryBox(activeProfile)
    ? navLinks
    : navLinks.filter((link) => link.to !== '/memories');

  if (!canAccessMemoryBox(activeProfile) && location.pathname === '/memories') {
    return <Navigate to={homeRoute} replace />;
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <NavLink to={homeRoute} className="brand">
          <HeartHandshake size={24} />
          <span>CareLoop</span>
        </NavLink>
        <ProfileSwitcher />
      </header>

      {authError && <p className="form-error" role="alert">{authError}</p>}
      <main key={activeProfile.id} className="page-wrap" id="main-content" tabIndex={-1}
        aria-busy={authStatus === 'loading'} {...(authStatus !== 'authenticated' ? { inert: '' } : {})}>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {visibleNavLinks.map(({ to, label, icon: Icon }) => {
          const effectiveTo = to === '/home' ? homeRoute : to;
          return (
            <NavLink key={to} to={effectiveTo}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
