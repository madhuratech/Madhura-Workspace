import React, { Suspense, lazy, useContext, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import SplashScreen from './components/AnimatedLoader';

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
const Tickets = lazy(() => import('./pages/Tickets'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Notes = lazy(() => import('./pages/Notes'));
const UserProfile = lazy(() => import('./pages/UserProfile'));

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Minimal fallback for lazy route switches (not the splash)
const PageLoader = () => (
  <div className="flex min-h-screen w-full items-center justify-center bg-bg-primary">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/30 border-t-accent-blue"></div>
  </div>
);

function App() {
  // Only show splash on the very first load of the session
  const [showSplash, setShowSplash] = useState(() => {
    const seen = sessionStorage.getItem('splashShown');
    if (!seen) {
      sessionStorage.setItem('splashShown', '1');
      return true;
    }
    return false;
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  return (
    <ToastProvider>
      <NotificationProvider>
        {/* Splash screen sits on top; removed after fade completes */}
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes wrapped in Layout (Sidebar + Navbar) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tl-dashboard" element={<TeamLeaderDashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<ProjectDetails />} />
              <Route path="/my-tasks" element={<MyTasks />} />
              <Route path="/team" element={<Team />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/email" element={<Email />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/workspace/:id" element={<WorkspaceOverview />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/attendance" element={<AttendanceLeave />} />
              <Route path="/analytics" element={<AnalyticsReports />} />
              <Route path="/activity-logs" element={<ActivityLogs />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/profile/:id" element={<UserProfile />} />
            </Route>
        </Routes>
      </Suspense>
      </NotificationProvider>
    </ToastProvider>
  );
}

export default App;
