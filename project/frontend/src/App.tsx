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
import StudentAttendancePage from '@/pages/dashboard/StudentAttendancePage';
import PerformancePage from '@/pages/dashboard/PerformancePage';
import LeaderboardsPage from '@/pages/dashboard/LeaderboardsPage';


// Placeholder Pages for now
import AuthLayout from '@/pages/AuthLayout';
import JobsPage from '@/pages/dashboard/JobsPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';

import { HeaderTitleProvider } from '@/contexts/HeaderTitleContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HeaderTitleProvider>
          <Routes>
            {/* Public Routes wrapped in AuthLayout */}
            <Route element={<AuthLayout />}>
              <Route path="/" element={<TimeInOutPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<HomePage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="attendance" element={<AttendancePage />} />

              {/* Hidden due to issues */}



              <Route path="performance" element={<PerformancePage />} />
              <Route path="leaderboards" element={<LeaderboardsPage />} />
              <Route path="my-attendance" element={<StudentAttendancePage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HeaderTitleProvider>

        <Toaster position="top-center" theme="dark" />
      </AuthProvider>
    </BrowserRouter>
  );
}
