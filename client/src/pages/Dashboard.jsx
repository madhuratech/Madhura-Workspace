import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, CheckCircle2, Users, CalendarDays, Activity } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [stats, setStats] = useState({ projects: 0, tasks: 0, members: 0, meetings: 0 });
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/workspaces');
      setWorkspaces(res.data);
      if (user?.role === 'super_admin') {
        const usersRes = await axios.get('/users').catch(() => ({ data: [] }));
        setAllUsers(usersRes.data);
      }
      if (res.data.length > 0) {
        const ws = res.data[0];
        const [projectsRes, tasksRes, meetingsRes] = await Promise.all([
          axios.get(`/workspaces/${ws._id}/projects`).catch(() => ({ data: [] })),
          axios.get('/tasks').catch(() => ({ data: [] })),
          axios.get('/meetings').catch(() => ({ data: [] }))
        ]);
        setStats({
          projects: projectsRes.data.length || 0,
          tasks: tasksRes.data.length || 0,
          members: ws.members?.length || 1,
          meetings: meetingsRes.data.length || 0
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/workspaces', { name: newWorkspaceName, members: selectedMembers });
      setNewWorkspaceName('');
      setSelectedMembers([]);
      setShowModal(false);
      showToast('Workspace created successfully!', 'success');
      fetchWorkspaces();
    } catch (error) {
      console.error(error);
      showToast('Failed to create workspace.', 'error');
    }
  };

  const updateWorkspace = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/workspaces/${editingWorkspace._id}`, { name: newWorkspaceName, members: selectedMembers });
      setNewWorkspaceName('');
      setSelectedMembers([]);
      setShowEditModal(false);
      setEditingWorkspace(null);
      showToast('Workspace updated successfully!', 'success');
      fetchWorkspaces();
    } catch (error) {
      console.error(error);
      showToast('Failed to update workspace.', 'error');
    }
  };

  return (
    <div className="text-text-primary h-full overflow-y-auto pr-2 pb-10 custom-scrollbar font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-2xl font-bold tracking-wide">Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              user?.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
              user?.role === 'hr' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' :
              user?.role === 'team_leader' ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20' :
              'bg-success/10 text-success border border-success/20'
            }`}>
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-text-secondary mt-1">
            {user?.role === 'super_admin' && 'Manage your organization, teams, and workspaces.'}
            {user?.role === 'hr' && 'Overview of all projects, meetings, and team activities.'}
            {user?.role === 'team_leader' && 'Assign tasks, track progress, and lead your team.'}
            {user?.role === 'employee' && "Here's what's assigned to you today."}
          </p>
        </div>
        {user?.role === 'super_admin' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Workspace</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
          <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
          <p className="text-text-secondary font-medium">Loading your workspace...</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            {user?.role === 'super_admin' ? 'Welcome to MadhuraWS!' : 'You are not in a workspace yet'}
          </h2>
          <p className="text-text-secondary mb-8">
            {user?.role === 'super_admin'
              ? 'Get started by creating your first workspace.'
              : 'Ask your Super Admin to add you to a workspace.'}
          </p>
          {user?.role === 'super_admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent-blue text-white px-6 py-3 rounded-xl hover:bg-blue-600 font-semibold transition-all shadow-md inline-flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Create Workspace</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map(ws => (
            <div key={ws._id} className="bg-bg-secondary p-6 rounded-2xl border border-border hover:border-accent-blue transition-all group shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-text-primary group-hover:text-accent-blue transition-colors">
                  {ws.name}
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-accent-blue/10 text-accent-blue rounded">
                  {ws.members?.length || 1} member(s)
                </span>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                No description provided.
              </p>
              
              <div className="flex -space-x-2 mb-6">
                <div className="h-8 w-8 rounded-full bg-accent-blue flex items-center justify-center text-white text-xs font-bold border-2 border-bg-secondary shadow-sm">
                  A
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => window.location.href = `/workspace/${ws._id}`}
                  className="flex-1 py-2.5 bg-bg-primary text-text-primary font-medium rounded-lg hover:bg-accent-blue hover:text-white transition-colors border border-border hover:border-accent-blue"
                >
                  Open
                </button>
                {user?.role === 'super_admin' && (
                  <button 
                    onClick={() => {
                      setEditingWorkspace(ws);
                      setNewWorkspaceName(ws.name);
                      setSelectedMembers(
                        (ws.members || [])
                          .filter(m => m.user && m.user._id !== user._id)
                          .map(m => m.user._id || m.user)
                      );
                      setShowEditModal(true);
                    }}
                    className="flex-1 py-2.5 bg-bg-primary text-text-primary font-medium rounded-lg hover:bg-bg-secondary transition-colors border border-border"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {user?.role === 'super_admin' && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-bg-primary border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-text-secondary hover:text-accent-blue hover:border-accent-blue hover:bg-accent-blue/5 transition-all p-6 shadow-sm min-h-[200px]"
            >
              <Plus size={32} className="mb-2" />
              <span className="font-medium">Create New Workspace</span>
            </button>
          )}
        </div>
      )}

      {/* UPGRADED DASHBOARD SECTIONS */}
      {workspaces.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 mt-8">
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-accent-blue/10 rounded-xl text-accent-blue"><Briefcase size={28} /></div>
              <div><p className="text-sm text-text-secondary">Total Projects</p><p className="text-2xl font-bold text-text-primary">{stats.projects}</p></div>
            </div>
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-success/10 rounded-xl text-success"><CheckCircle2 size={28} /></div>
              <div><p className="text-sm text-text-secondary">Active Tasks</p><p className="text-2xl font-bold text-text-primary">{stats.tasks}</p></div>
            </div>
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-purple-500/10 rounded-xl text-purple-500"><Users size={28} /></div>
              <div><p className="text-sm text-text-secondary">Team Members</p><p className="text-2xl font-bold text-text-primary">{stats.members}</p></div>
            </div>
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-orange-500/10 rounded-xl text-orange-500"><CalendarDays size={28} /></div>
              <div><p className="text-sm text-text-secondary">Upcoming Meetings</p><p className="text-2xl font-bold text-text-primary">{stats.meetings}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center"><Activity className="mr-2 text-accent-blue" size={20}/> Recent Activity</h3>
              <div className="space-y-4 text-center py-6">
                <p className="text-sm text-text-secondary">No recent activity.</p>
              </div>
            </div>

            <div className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center"><CalendarDays className="mr-2 text-accent-blue" size={20}/> Upcoming</h3>
              <div className="space-y-4 text-center py-6">
                <p className="text-sm text-text-secondary">No upcoming meetings.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal for creating workspace */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-text-primary mb-4">Create Workspace</h3>
            <form onSubmit={createWorkspace}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">Assign Members</label>
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-bg-primary space-y-2">
                  {allUsers.filter(u => u._id !== user._id).map(u => (
                    <label key={u._id} className="flex items-center space-x-3 p-2 hover:bg-bg-secondary rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="accent-accent-blue"
                        checked={selectedMembers.includes(u._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, u._id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== u._id));
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary">{u.name}</span>
                        <span className="text-xs text-text-secondary">{u.email} - {u.role?.replace('_', ' ')}</span>
                      </div>
                    </label>
                  ))}
                  {allUsers.length <= 1 && <p className="text-xs text-text-secondary text-center p-2">No other users found.</p>}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for editing workspace */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-text-primary mb-4">Manage Workspace</h3>
            <form onSubmit={updateWorkspace}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">Manage Members</label>
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-bg-primary space-y-2">
                  {allUsers.filter(u => u._id !== user._id).map(u => (
                    <label key={u._id} className="flex items-center space-x-3 p-2 hover:bg-bg-secondary rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="accent-accent-blue"
                        checked={selectedMembers.includes(u._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, u._id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== u._id));
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary">{u.name}</span>
                        <span className="text-xs text-text-secondary">{u.email} - {u.role?.replace('_', ' ')}</span>
                      </div>
                    </label>
                  ))}
                  {allUsers.length <= 1 && <p className="text-xs text-text-secondary text-center p-2">No other users found.</p>}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setEditingWorkspace(null); }}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
