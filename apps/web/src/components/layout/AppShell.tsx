import { HeartHandshake, Home, ListChecks, Mic, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { DemoRoleSwitcher } from '../navigation/DemoRoleSwitcher';

const links = [
  ['/home', 'Home', Home], ['/tasks', 'Care', ListChecks], ['/voice', 'Talk', Mic], ['/circle', 'Circle', Users],
] as const;

export function AppShell() {
  return <div className="app-shell">
    <header className="topbar"><NavLink to="/home" className="brand"><HeartHandshake /> CareLoop</NavLink><DemoRoleSwitcher /></header>
    <main className="page-wrap"><Outlet /></main>
    <nav className="bottom-nav" aria-label="Primary navigation">{links.map(([to, label, Icon]) =>
      <NavLink key={to} to={to}><Icon size={21} /><span>{label}</span></NavLink>)}</nav>
  </div>;
}
