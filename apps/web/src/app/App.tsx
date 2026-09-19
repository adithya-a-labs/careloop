import { Navigate, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../features/demo/DemoContext';
import { AppShell } from '../components/layout/AppShell';
import { PatientHomePage } from '../pages/PatientHome';
import { FamilyHomePage } from '../pages/FamilyHome';
import { VoicePage } from '../pages/VoicePage';
import { TimelinePage } from '../pages/TimelinePage';
import { TasksPage } from '../pages/TasksPage';
import { MemoryBoxPage } from '../pages/MemoryBoxPage';
import { CareCirclePage } from '../pages/CareCirclePage';
import {
  WelcomePage, CreateCirclePage, JoinCirclePage,
  ProfileSetupPage, AgePreferencesPage,
  HealthWellbeingPage, SettingsPage,
} from '../pages';

export function App() {
  return (
    <DemoProvider>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/create-circle" element={<CreateCirclePage />} />
        <Route path="/join-circle" element={<JoinCirclePage />} />
        <Route path="/profile" element={<ProfileSetupPage />} />
        <Route path="/preferences" element={<AgePreferencesPage />} />
        <Route element={<AppShell />}>
          <Route path="/home" element={<PatientHomePage />} />
          <Route path="/family" element={<FamilyHomePage />} />
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
