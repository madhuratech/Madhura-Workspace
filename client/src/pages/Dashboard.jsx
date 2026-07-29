import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, CheckCircle2, Users, CalendarDays, Activity, MoreHorizontal, ArrowRight, MessageSquare, Clock } from 'lucide-react';

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
    <div className="h-full overflow-y-auto pr-2 pb-10 custom-scrollbar font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-1">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-secondary">
            Here's what's happening in your workspace today.
          </p>
        </div>
        
        {user?.role === 'super_admin' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-accent-blue text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-md font-medium flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Workspace</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
          <div className="w-10 h-10 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
          <p className="text-text-secondary text-sm font-medium">Syncing workspace...</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-2xl p-12 text-center max-w-2xl mx-auto mt-10 shadow-sm">
          <div className="h-20 w-20 bg-accent-blue/10 text-accent-blue rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase size={40} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            {user?.role === 'super_admin' ? 'Create Your First Workspace' : 'Welcome to MadhuraWS'}
          </h2>
          <p className="text-text-secondary mb-8 text-sm">
            {user?.role === 'super_admin'
              ? 'Workspaces help you organize teams, projects, and communication in one place.'
              : 'You are not assigned to any workspace yet. Please contact your administrator.'}
          </p>
          {user?.role === 'super_admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent-blue text-white px-6 py-3 rounded-xl hover:bg-blue-600 font-semibold transition-all shadow-lg inline-flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Create Workspace</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Feed Column */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Quick Stats Grid (Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Projects', value: stats.projects, icon: <Briefcase size={20} />, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
                { label: 'Tasks', value: stats.tasks, icon: <CheckCircle2 size={20} />, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Members', value: stats.members, icon: <Users size={20} />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Meetings', value: stats.meetings, icon: <CalendarDays size={20} />, color: 'text-orange-500', bg: 'bg-orange-500/10' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-bg-secondary p-4 rounded-2xl border border-border/60 hover:border-border transition-colors shadow-sm flex flex-col justify-between">
                  <div className={`p-2 w-fit rounded-lg ${stat.bg} ${stat.color} mb-3`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                    <p className="text-xs text-text-secondary font-medium">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workspaces Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-primary flex items-center">
                  <Briefcase size={18} className="mr-2 text-text-secondary" />
                  Your Workspaces
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspaces.map(ws => (
                  <div key={ws._id} className="bg-bg-secondary p-5 rounded-2xl border border-border/60 hover:border-accent-blue/50 hover:shadow-md transition-all group flex flex-col h-full cursor-pointer relative overflow-hidden" onClick={() => window.location.href = `/workspace/${ws._id}`}>
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-accent-blue/10 text-accent-blue rounded-xl flex items-center justify-center font-bold text-lg">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-text-primary group-hover:text-accent-blue transition-colors">
                            {ws.name}
                          </h3>
                          <p className="text-xs text-text-secondary">{ws.members?.length || 1} team members</p>
                        </div>
                      </div>
                      
                      {user?.role === 'super_admin' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWorkspace(ws);
                            setNewWorkspaceName(ws.name);
                            setSelectedMembers(
                              (ws.members || [])
                                .filter(m => m.user && m.user._id !== user._id)
                                .map(m => m.user._id || m.user)
                            );
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-text-secondary hover:bg-bg-primary hover:text-text-primary rounded-md transition-colors"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {/* Mock avatars for members */}
                        {[1,2,3].slice(0, ws.members?.length || 1).map(i => (
                          <div key={i} className="h-7 w-7 rounded-full bg-border flex items-center justify-center text-[10px] font-bold text-text-secondary border-2 border-bg-secondary">
                            M{i}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs font-medium text-accent-blue flex items-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                        Enter Workspace <ArrowRight size={14} className="ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-bg-secondary border border-border/60 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-text-primary flex items-center">
                  <Activity size={18} className="mr-2 text-text-secondary" />
                  Activity Feed
                </h2>
                <button className="text-xs text-accent-blue font-medium hover:underline">View All</button>
              </div>
              
              <div className="space-y-6">
                {/* Placeholder Activity Items */}
                <div className="flex space-x-4 relative">
                  <div className="h-8 w-8 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center shrink-0 z-10">
                    <MessageSquare size={14} />
                  </div>
                  <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border z-0"></div>
                  <div>
                    <p className="text-sm text-text-primary">
                      <span className="font-bold">System</span> posted a new announcement in <span className="font-bold text-accent-blue cursor-pointer">General</span>
                    </p>
                    <p className="text-xs text-text-secondary mt-1">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex space-x-4 relative">
                  <div className="h-8 w-8 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 z-10">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border z-0"></div>
                  <div>
                    <p className="text-sm text-text-primary">
                      You completed the task <span className="font-bold text-text-primary">Update Dashboard UI</span>
                    </p>
                    <p className="text-xs text-text-secondary mt-1">Yesterday at 4:30 PM</p>
                  </div>
                </div>

                <div className="flex space-x-4 relative">
                  <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 z-10">
                    <CalendarDays size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">
                      Meeting <span className="font-bold text-text-primary">Weekly Sync</span> scheduled
                    </p>
                    <p className="text-xs text-text-secondary mt-1">Oct 12, 10:00 AM</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Upcoming Schedule Card */}
            <div className="bg-bg-secondary border border-border/60 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center">
                <Clock size={16} className="mr-2 text-text-secondary" />
                Up Next
              </h2>
              
              <div className="space-y-3">
                <div className="p-3 border border-border/50 rounded-xl bg-bg-primary hover:border-accent-blue/30 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-bold text-text-primary">Design Review</h4>
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">10:30 AM</span>
                  </div>
                  <p className="text-xs text-text-secondary flex items-center">
                    <Users size={12} className="mr-1"/> 4 attendees
                  </p>
                </div>
                
                <div className="p-3 border border-border/50 rounded-xl bg-bg-primary hover:border-accent-blue/30 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-bold text-text-primary">Client Sync</h4>
                    <span className="text-[10px] font-bold text-text-secondary bg-bg-secondary px-2 py-0.5 rounded">2:00 PM</span>
                  </div>
                  <p className="text-xs text-text-secondary flex items-center">
                    <Users size={12} className="mr-1"/> 2 attendees
                  </p>
                </div>
              </div>
              
              <button className="w-full mt-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary border border-border/50 rounded-lg hover:bg-bg-primary transition-colors">
                View Calendar
              </button>
            </div>

            {/* My Tasks Snapshot */}
            <div className="bg-bg-secondary border border-border/60 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center">
                <CheckSquare size={16} className="mr-2 text-text-secondary" />
                My Tasks
              </h2>
              
              <div className="space-y-2">
                {[
                  { title: 'Update dependencies', priority: 'High', color: 'text-danger', bg: 'bg-danger/10' },
                  { title: 'Write documentation', priority: 'Medium', color: 'text-warning', bg: 'bg-warning/10' },
                  { title: 'Review PR #42', priority: 'Low', color: 'text-success', bg: 'bg-success/10' }
                ].map((task, i) => (
                  <div key={i} className="flex items-center space-x-3 p-2 hover:bg-bg-primary rounded-lg cursor-pointer transition-colors group">
                    <div className="h-4 w-4 rounded border border-border group-hover:border-accent-blue flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{task.title}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${task.bg} ${task.color}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal for creating workspace */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-text-primary mb-1">Create Workspace</h3>
            <p className="text-xs text-text-secondary mb-6">Set up a new space for your team to collaborate.</p>
            <form onSubmit={createWorkspace}>
              <div className="mb-5">
                <label className="block text-sm font-bold text-text-primary mb-2">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                  placeholder="e.g. Design Team, Q3 Planning..."
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-text-primary mb-2">Invite Members</label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-bg-primary space-y-1 custom-scrollbar">
                  {allUsers.filter(u => u._id !== user._id).map(u => (
                    <label key={u._id} className="flex items-center space-x-3 p-2.5 hover:bg-bg-secondary rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border/50">
                      <input 
                        type="checkbox" 
                        className="accent-accent-blue w-4 h-4 rounded"
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
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">{u.role?.replace('_', ' ')}</span>
                      </div>
                    </label>
                  ))}
                  {allUsers.length <= 1 && <p className="text-xs text-text-secondary text-center p-4">No other users found.</p>}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2 border-t border-border/50 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-text-secondary hover:text-text-primary font-medium rounded-xl hover:bg-bg-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-accent-blue text-white rounded-xl hover:bg-blue-600 font-medium transition-all shadow-md"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for editing workspace */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-text-primary mb-1">Manage Workspace</h3>
            <p className="text-xs text-text-secondary mb-6">Update details and manage members.</p>
            <form onSubmit={updateWorkspace}>
              <div className="mb-5">
                <label className="block text-sm font-bold text-text-primary mb-2">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-text-primary mb-2">Manage Members</label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-bg-primary space-y-1 custom-scrollbar">
                  {allUsers.filter(u => u._id !== user._id).map(u => (
                    <label key={u._id} className="flex items-center space-x-3 p-2.5 hover:bg-bg-secondary rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border/50">
                      <input 
                        type="checkbox" 
                        className="accent-accent-blue w-4 h-4 rounded"
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
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">{u.role?.replace('_', ' ')}</span>
                      </div>
                    </label>
                  ))}
                  {allUsers.length <= 1 && <p className="text-xs text-text-secondary text-center p-4">No other users found.</p>}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2 border-t border-border/50 mt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setEditingWorkspace(null); }}
                  className="px-5 py-2.5 text-text-secondary hover:text-text-primary font-medium rounded-xl hover:bg-bg-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-accent-blue text-white rounded-xl hover:bg-blue-600 font-medium transition-all shadow-md"
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
