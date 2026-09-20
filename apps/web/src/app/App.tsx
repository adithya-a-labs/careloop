import { Navigate, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../features/demo/DemoContext';
import { AppShell } from '../components/layout/AppShell';
import { RoleAwareHomePage } from '../pages/RoleAwareHome';
import { VoicePage } from '../pages/VoicePage';
import { TimelinePage } from '../pages/TimelinePage';
import { TasksPage } from '../pages/TasksPage';
import { MemoryBoxPage } from '../pages/MemoryBoxPage';
import { CareCirclePage } from '../pages/CareCirclePage';
import { HealthWellbeingPage, SettingsPage } from '../pages';

export function App() {
  return (
    <DemoProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<RoleAwareHomePage />} />
          <Route path="/home" element={<RoleAwareHomePage />} />
          <Route path="/family" element={<RoleAwareHomePage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/memories" element={<MemoryBoxPage />} />
          <Route path="/circle" element={<CareCirclePage />} />
          <Route path="/wellbeing" element={<HealthWellbeingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DemoProvider>
  );
}
