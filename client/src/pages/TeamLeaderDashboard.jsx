import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, Users, ArrowRight, BarChart3 } from 'lucide-react';
import Avatar from '../components/Avatar';

const TeamLeaderDashboard = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        const projRes = await axios.get(`/workspaces/${ws._id}/projects`);
        setProjects(projRes.data);

        // Fetch task stats for each project
        const stats = {};
        await Promise.all(
          projRes.data.map(async (proj) => {
            try {
              const taskRes = await axios.get(`/workspaces/${ws._id}/projects/${proj._id}/tasks`);
              const tasks = taskRes.data;
              stats[proj._id] = {
                total: tasks.length,
                todo: tasks.filter(t => t.status === 'To Do').length,
                inProgress: tasks.filter(t => t.status === 'In Progress').length,
                done: tasks.filter(t => t.status === 'Done').length,
              };
            } catch {
              stats[proj._id] = { total: 0, todo: 0, inProgress: 0, done: 0 };
            }
          })
        );
        setProjectStats(stats);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="h-full overflow-y-auto font-sans pb-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Team Leader Dashboard</h1>
        <p className="text-text-secondary mt-1">Monitor all projects and assign tasks to your team.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-secondary border border-border rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-accent-blue/10 rounded-xl text-accent-blue"><FolderKanban size={24} /></div>
          <div>
            <p className="text-sm text-text-secondary">Total Projects</p>
            <p className="text-2xl font-bold text-text-primary">{projects.length}</p>
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-orange-400/10 rounded-xl text-orange-400"><Clock size={24} /></div>
          <div>
            <p className="text-sm text-text-secondary">Tasks In Progress</p>
            <p className="text-2xl font-bold text-text-primary">
              {Object.values(projectStats).reduce((acc, s) => acc + s.inProgress, 0)}
            </p>
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-success/10 rounded-xl text-success"><CheckCircle2 size={24} /></div>
          <div>
            <p className="text-sm text-text-secondary">Tasks Completed</p>
            <p className="text-2xl font-bold text-text-primary">
              {Object.values(projectStats).reduce((acc, s) => acc + s.done, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Projects with Task Status */}
      <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center">
        <BarChart3 className="mr-2 text-accent-blue" size={20} />
        Project Status Overview
      </h2>

      {projects.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-2xl p-12 text-center text-text-secondary">
          <FolderKanban size={48} className="mx-auto mb-4 opacity-20" />
          <p>No projects assigned yet. Contact your MD or HR.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {projects.map(project => {
            const stats = projectStats[project._id] || { total: 0, todo: 0, inProgress: 0, done: 0 };
            const donePercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

            return (
              <div key={project._id} className="bg-bg-secondary border border-border rounded-2xl p-5 hover:border-accent-blue transition-all group">
                {/* Project Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent-blue/10 rounded-lg text-accent-blue">
                      <FolderKanban size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary group-hover:text-accent-blue transition-colors">{project.title}</h3>
                      {project.description && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    project.status === 'Completed' ? 'text-success bg-success/10' : 'text-accent-blue bg-accent-blue/10'
                  }`}>
                    {project.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                    <span>Progress</span>
                    <span className="font-bold text-text-primary">{donePercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-bg-primary rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-accent-blue rounded-full transition-all duration-500"
                      style={{ width: `${donePercent}%` }}
                    />
                  </div>
                </div>

                {/* Task Status Chips */}
                <div className="flex space-x-2 mb-4">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-bg-primary border border-border rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-text-secondary">To Do <strong className="text-text-primary">{stats.todo}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-bg-primary border border-border rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-accent-blue"></div>
                    <span className="text-xs text-text-secondary">In Progress <strong className="text-text-primary">{stats.inProgress}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-bg-primary border border-border rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-text-secondary">Done <strong className="text-text-primary">{stats.done}</strong></span>
                  </div>
                </div>

                {/* Assigned Members */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-1.5">
                      {project.members?.slice(0, 5).map(m => (
                        <div key={m._id} title={m.name} className="hover:z-10 transition-transform">
                          <Avatar user={m} size="w-7 h-7" textClass="text-xs" showStatus={false} className="border-2 border-bg-secondary" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-text-secondary">{project.members?.length || 0} member{project.members?.length !== 1 ? 's' : ''}</span>
                  </div>
                  <Link
                    to={`/project/${project._id}`}
                    className="flex items-center space-x-1 text-accent-blue text-sm font-medium hover:underline"
                  >
                    <span>Open Board</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamLeaderDashboard;
