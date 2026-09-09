  import { useState } from "react";
  import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
  import "./App.css";
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
  import CreateProjectPage from "./components/function/CreateProjectPage";
  import CreateTaskPage from "./components/function/CreateTaskPage";
  import ManageMembersModal from "./components/function/ManageMembersModal";

  function App() {
    const isAuthenticated = !!localStorage.getItem("accessToken");

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

          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  export default App;
