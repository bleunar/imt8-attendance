/**
 * Main Application Component
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';

// Pages
import TimeInOutPage from '@/pages/TimeInOutPage';
import LoginPage from '@/pages/LoginPage';
import DashboardLayout from '@/pages/dashboard/DashboardLayout';
import HomePage from '@/pages/dashboard/HomePage';
import AccountsPage from '@/pages/dashboard/AccountsPage';
import AttendancePage from '@/pages/dashboard/AttendancePage';
import PerformancePage from '@/pages/dashboard/PerformancePage';
// import SchedulePage from '@/pages/dashboard/SchedulePage';

// Placeholder Pages for now
import JobsPage from '@/pages/dashboard/JobsPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<TimeInOutPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<HomePage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="attendance" element={<AttendancePage />} />

            {/* Hidden due to issues */}
            {/* <Route path="schedule" element={<SchedulePage />} /> */}


            <Route path="performance" element={<PerformancePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster position="top-center" theme="dark" />
      </AuthProvider>
    </BrowserRouter>
  );
}
