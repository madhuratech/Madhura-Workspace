import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Team from './pages/Team';
import Meetings from './pages/Meetings';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import Email from './pages/Email';
import WorkspaceOverview from './pages/WorkspaceOverview';
import Chat from './pages/Chat';
import TeamLeaderDashboard from './pages/TeamLeaderDashboard';
import AttendanceLeave from './pages/AttendanceLeave';
import MyTasks from './pages/MyTasks';
import AnalyticsReports from './pages/AnalyticsReports';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <ToastProvider>
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
          {/* We can add tasks and documents nested inside project or separate */}
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;
