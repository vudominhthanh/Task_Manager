import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { Toaster } from "react-hot-toast";

import Home from "./components/user-service/Home";
import AuthPage from "./components/user-service/AuthPage";
import SystemOverview from "./components/left-aside/SystemOverview";
import Notifications from "./components/left-aside/Notification";
import Activities from "./components/left-aside/Activities";
import CalendarView from "./components/left-aside/CalendarView";
import Reports from "./components/left-aside/Reports";
import ProjectLayout from "./components/layout/ProjectLayout";
import KanbanBoard from "./components/main/KanbanBoard";
import ProjectActivities from "./components/main/ProjectActivities";
import ProjectCalendar from "./components/main/ProjectCalendar";
import ProjectFiles from "./components/main/ProjectFiles";
import ProjectOverview from "./components/main/ProjectOverview";
import ProjectSettings from "./components/main/ProjectSettings";
import ProjectList from "./components/main/ProjectList";

import SettingsLayout from "./components/layout/SettingsLayout";
import ProfileSettingsPage from "./components/settings/ProfileSettingsPage";
import SecuritySettingsPage from "./components/settings/SecuritySettingsPage";
import NotificationSettingsPage from "./components/settings/NotificationSettingsPage";
import PreferenceSettingsPage from "./components/settings/PreferenceSettingsPage";

import AdminUsersPage from "./components/settings/AdminUsersPage";
import AdminProjectsPage from "./components/settings/AdminProjectsPage";
import AdminAuditLogsPage from "./components/settings/AdminAuditLogsPage";
import AdminSystemConfigPage from "./components/settings/AdminSystemConfigPage";

function App() {
  const [token, setToken] = useState(localStorage.getItem("accessToken"));

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("accessToken"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const isAuthenticated = !!token;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <AuthPage />} />

        <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} >
          <Route index element={<SystemOverview />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/reports" element={<Reports />} />

          <Route path="project/:projectId" element={<ProjectLayout />} >
            <Route index element={<KanbanBoard />} />
            <Route path="list" element={<ProjectList />} />       
            <Route path="calendar" element={<ProjectCalendar />}/>
            <Route path="overview" element={<ProjectOverview />}/>
            <Route path="activities" element={<ProjectActivities />}/>
            <Route path="files" element={<ProjectFiles />} />    
            <Route path="settings" element={<ProjectSettings />}/>
          </Route>

          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="security" element={<SecuritySettingsPage />} />
            <Route path="notifications" element={<NotificationSettingsPage />} />
            <Route path="preferences" element={<PreferenceSettingsPage />} />

            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/projects" element={<AdminProjectsPage />} />
            <Route path="admin/audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="admin/config" element={<AdminSystemConfigPage />} />
          </Route>

        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          duration: 3500,
          style: {
            fontSize: "13px",
            fontWeight: "500",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#1f2937",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#4f46e5",
              secondary: "#ffffff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
