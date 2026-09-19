import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import {
  AgePreferencesPage, CareCirclePage, CreateCirclePage, FamilyHomePage, HealthWellbeingPage,
  JoinCirclePage, MemoryBoxPage, PatientHomePage, ProfileSetupPage, SettingsPage, TasksPage,
  TimelinePage, VoicePage, WelcomePage,
} from '../pages';

export function App() {
  return <Routes>
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
  </Routes>;
}
