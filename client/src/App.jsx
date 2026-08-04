import React, { Suspense, lazy, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import Layout from './components/Layout';

// Lazy-loaded Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Projects = lazy(() => import('./pages/Projects'));
const Team = lazy(() => import('./pages/Team'));
const Meetings = lazy(() => import('./pages/Meetings'));
const Documents = lazy(() => import('./pages/Documents'));
const Settings = lazy(() => import('./pages/Settings'));
const Email = lazy(() => import('./pages/Email'));
const WorkspaceOverview = lazy(() => import('./pages/WorkspaceOverview'));
const Chat = lazy(() => import('./pages/Chat'));
const TeamLeaderDashboard = lazy(() => import('./pages/TeamLeaderDashboard'));
const AttendanceLeave = lazy(() => import('./pages/AttendanceLeave'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const AnalyticsReports = lazy(() => import('./pages/AnalyticsReports'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Minimalist Loading Fallback
const PageLoader = () => (
  <div className="flex h-full w-full items-center justify-center bg-bg-primary">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/30 border-t-accent-blue"></div>
  </div>
);

function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes wrapped in Layout (Sidebar + Navbar) */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<AnalyticsReports />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="projects" element={<Projects />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="team" element={<Team />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="documents" element={<Documents />} />
            <Route path="settings" element={<Settings />} />
            <Route path="chat" element={<Chat />} />
            <Route path="attendance" element={<AttendanceLeave />} />
            <Route path="email" element={<Email />} />
            <Route path="workspace/:id" element={<WorkspaceOverview />} />
            <Route path="project/:id" element={<ProjectDetails />} />
            <Route path="tl-dashboard" element={<TeamLeaderDashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}

export default App;
