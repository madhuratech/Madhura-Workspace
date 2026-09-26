import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { CalendarDays, Activity, Clock, CheckSquare, ChevronRight, Plus, Users, TrendingUp, Sparkles, LayoutDashboard, ChevronDown, Trash2, X } from 'lucide-react';
import Avatar from '../components/Avatar';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [workspace, setWorkspace] = useState(() => {
    try {
      const cached = localStorage.getItem('active_workspace');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [allWorkspaces, setAllWorkspaces] = useState(() => {
    try {
      const cached = localStorage.getItem('all_workspaces');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceData, setNewWorkspaceData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ tasks: 0, meetings: 0, members: 0 });
  const [myTasks, setMyTasks] = useState([]);
  const [upNext, setUpNext] = useState([]);
  const [activities, setActivities] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ onTime: 0, late: 0, absent: 0, total: 0, rate: 100 });

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async (targetWorkspace = null) => {
    try {
      const res = await axios.get('/workspaces');
      if (res.data && res.data.length > 0) {
        setAllWorkspaces(res.data);
        localStorage.setItem('all_workspaces', JSON.stringify(res.data));
        
        // Ensure we use target workspace, or previously selected workspace if it still exists in list, or first one
        const ws = targetWorkspace || 
                   (workspace && res.data.find(w => w._id === workspace._id)) || 
                   res.data[0];
        
        setWorkspace(ws);
        localStorage.setItem('active_workspace', JSON.stringify(ws));

        const [tasksRes, meetingsRes, attendanceRes] = await Promise.allSettled([
          axios.get(`/workspaces/${ws._id}/my-tasks`),
          axios.get(`/workspaces/${ws._id}/meetings`),
          axios.get(`/workspaces/${ws._id}/attendance`)
        ]);

        const tasks = tasksRes.status === 'fulfilled' ? (tasksRes.value.data || []) : [];
        const meetings = meetingsRes.status === 'fulfilled' ? (meetingsRes.value.data || []) : [];
        const attendance = attendanceRes.status === 'fulfilled' ? (attendanceRes.value.data || []) : [];
        
        setMyTasks(tasks.filter(t => t.status !== 'completed'));
        const todayStr = new Date().toISOString().split('T')[0];
        const todayMeetings = meetings.filter(m => m.date && new Date(m.date).toISOString().split('T')[0] === todayStr);
        setUpNext(todayMeetings.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
        
        // ── Calculate Dynamic & Accurate Attendance Stats ──
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentUserId = (user?._id || user?.id || '').toString();

        const myAttendance = attendance.filter(a => {
          const recordUserId = (a.user?._id || a.user?.id || a.user || '').toString();
          if (recordUserId && currentUserId && recordUserId !== currentUserId) return false;
          if (!a.date) return false;
          
          const parts = typeof a.date === 'string' ? a.date.split('T')[0].split('-') : null;
          if (parts && parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            return m === currentMonth && y === currentYear;
          }
          const aDate = new Date(a.date);
          return aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
        });

        const onTime = myAttendance.filter(a => !a.isLate && (a.status === 'Present' || !a.status)).length;
        const late = myAttendance.filter(a => a.isLate && (a.status === 'Present' || !a.status)).length;
        const totalPresent = onTime + late;

        // Inception date (when user/workspace joined)
        const userJoinDate = user?.createdAt ? new Date(user.createdAt) : (ws?.createdAt ? new Date(ws.createdAt) : now);
        const joinedThisMonth = (userJoinDate.getMonth() === currentMonth && userJoinDate.getFullYear() === currentYear);
        const effectiveStartDay = joinedThisMonth ? Math.max(1, userJoinDate.getDate()) : 1;

        let workingDays = 0;
        for (let d = effectiveStartDay; d <= now.getDate(); d++) {
          const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            if (d === now.getDate()) {
              const hasCheckedInToday = myAttendance.some(a => (typeof a.date === 'string' ? a.date.startsWith(todayStr) : false));
              if (hasCheckedInToday || totalPresent > 0) {
                workingDays++;
              }
            } else {
              workingDays++;
            }
          }
        }

        // Ensure workingDays is at least totalPresent to prevent negative absences
        workingDays = Math.max(workingDays, totalPresent);
        const absent = Math.max(0, workingDays - totalPresent);
        const totalTracked = totalPresent + absent;
        const rate = totalPresent > 0 ? Math.round((onTime / totalPresent) * 100) : (totalTracked === 0 ? 100 : 0);
        
        setAttendanceStats({ onTime, late, absent, total: totalTracked, rate });

        const recentActivities = [
          ...tasks.slice(0, 5).map(t => ({
            id: `task-${t._id}`, type: 'task',
            title: t.status === 'completed' ? `Completed: ${t.title}` : `Task: ${t.title}`,
            time: new Date(t.updatedAt || t.createdAt || Date.now()),
            icon: <CheckSquare size={14} className="text-blue-500" />
          })),
          ...meetings.slice(0, 5).map(m => ({
            id: `meeting-${m._id}`, type: 'meeting',
            title: `Meeting: ${m.title}`,
            time: new Date(m.createdAt || m.date || Date.now()),
            icon: <CalendarDays size={14} className="text-purple-500" />
          }))
        ].sort((a, b) => b.time - a.time).slice(0, 6);
        
        setActivities(recentActivities);
        setStats({ 
          tasks: tasks.filter(t => t.status !== 'completed').length || 0, 
          meetings: todayMeetings.length || 0, 
          members: ws.members?.length || 1 
        });
      } else {
        setAllWorkspaces([]);
        setWorkspace(null);
        localStorage.removeItem('active_workspace');
        localStorage.removeItem('all_workspaces');
      }
    } catch (err) { 
      console.error('Error fetching dashboard data:', err); 
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleCreateWorkspaceSubmit = async (e) => {
    e.preventDefault();
    if (!newWorkspaceData.name.trim()) {
      showToast('Workspace name is required', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await axios.post('/workspaces', newWorkspaceData);
      showToast('Workspace created successfully', 'success');
      setAllWorkspaces([...allWorkspaces, res.data]);
      setWorkspace(res.data); // Switch to the new workspace immediately
      setShowCreateModal(false);
      setNewWorkspaceData({ name: '', description: '' });
      setDropdownOpen(false);
      // Re-fetch data for the newly created empty workspace
      fetchData(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to create workspace', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setDropdownOpen(false);
    setShowCreateModal(true);
  };

  const handleDeleteWorkspace = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) return;
    try {
      await axios.delete(`/workspaces/${id}`);
      showToast('Workspace deleted successfully', 'success');
      const updated = allWorkspaces.filter(w => w._id !== id);
      setAllWorkspaces(updated);
      if (workspace._id === id) {
        if (updated.length > 0) {
          setWorkspace(updated[0]);
          fetchData(updated[0]);
        } else {
          setWorkspace(null);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete workspace', 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-bg-primary">
      <div className="w-10 h-10 border-[4px] border-border border-t-accent-blue dark:border-t-accent-blue rounded-full animate-spin shadow-lg"></div>
    </div>
  );

  if (!workspace) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8 bg-bg-primary">
      <div className="bg-bg-secondary p-8 rounded-3xl shadow-soft border border-border max-w-md w-full glass animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-accent-blue/10 text-accent-blue rounded-2xl flex items-center justify-center mb-4 border border-accent-blue/20 mx-auto">
          <LayoutDashboard size={32} />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2 font-outfit">No Workspace Found</h2>
        <p className="text-text-secondary text-sm mb-6">
          {user?.role === 'super_admin' || allWorkspaces.length === 0
            ? 'Get started by creating a fresh workspace for your team.'
            : 'Please contact your administrator to get assigned to a workspace.'}
        </p>

        {(user?.role === 'super_admin' || allWorkspaces.length === 0) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-indigo text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-accent-blue/25 active:scale-[0.98]"
          >
            <Plus size={18} />
            Create Workspace
          </button>
        )}
      </div>

      {/* CREATE WORKSPACE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 text-left">
          <div className="bg-bg-secondary border border-border/50 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-accent-blue/10 text-accent-blue rounded-2xl flex items-center justify-center mb-4 border border-accent-blue/20">
                <LayoutDashboard size={24} />
              </div>
              <h3 className="text-2xl font-bold text-text-primary font-outfit">Create Workspace</h3>
              <p className="text-sm text-text-secondary mt-1">Set up a new workspace for your team.</p>
            </div>

            <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Workspace Name</label>
                <input 
                  type="text"
                  value={newWorkspaceData.name}
                  onChange={e => setNewWorkspaceData({...newWorkspaceData, name: e.target.value})}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-bg-primary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Description <span className="normal-case font-normal opacity-70">(Optional)</span></label>
                <textarea 
                  value={newWorkspaceData.description}
                  onChange={e => setNewWorkspaceData({...newWorkspaceData, description: e.target.value})}
                  placeholder="What is this workspace for?"
                  rows={3}
                  className="w-full bg-bg-primary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting || !newWorkspaceData.name.trim()}
                  className="w-full bg-accent-blue hover:bg-accent-indigo text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Create Workspace'}
                </button>
              </div>
              
              <p className="text-center text-xs text-text-secondary mt-4">
                You can invite team members to this workspace from the <strong className="text-text-primary">Team</strong> module after creation.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const statCards = [
    { label: 'Open Tasks', value: stats.tasks, icon: <CheckSquare size={22} />, link: '/my-tasks', gradient: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
    { label: 'Today\'s Meetings', value: stats.meetings, icon: <CalendarDays size={22} />, link: '/meetings', gradient: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
    { label: 'Team Members', value: stats.members, icon: <Users size={22} />, link: '/team', gradient: 'from-emerald-500/20 to-teal-500/20', iconColor: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    { label: 'Recent Updates', value: activities.length, icon: <Activity size={22} />, link: '/activity-logs', gradient: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-bg-primary custom-scrollbar">
      {/* Decorative background blur */}
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-accent-blue/5 to-transparent pointer-events-none -z-10"></div>
      
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <p className="text-xs font-bold text-accent-blue uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
              <Sparkles size={12} />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-4xl font-black text-text-primary tracking-tight font-outfit drop-shadow-sm">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-indigo dark:from-blue-400 dark:to-purple-500">{user?.name ? user.name.split(' ')[0] : 'User'}</span>.
            </h1>
          </div>

          {/* Workspace badge with dropdown */}
          <div className="relative">
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 bg-bg-secondary/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl px-5 py-3 shadow-soft hover:shadow-hover transition-all duration-300 animate-in fade-in slide-in-from-right-4 duration-500 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
                <img src="/Madhura-logo.webp" alt="Logo" className="w-full h-full object-contain p-1.5"
                  onError={e => { e.target.style.display='none'; e.target.parentElement.textContent = workspace.name.charAt(0); e.target.parentElement.className += " font-bold text-accent-blue text-lg"; }} />
              </div>
              <div className="flex-1 pr-2">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">Workspace</p>
                <p className="text-[14px] font-extrabold text-text-primary font-outfit leading-none">{workspace.name}</p>
              </div>
              <ChevronDown size={16} className={`text-text-secondary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-bg-secondary border border-border/50 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {allWorkspaces.map(w => (
                    <div 
                      key={w._id} 
                      onClick={() => {
                        setWorkspace(w);
                        setDropdownOpen(false);
                        fetchData(w);
                      }}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-primary transition-colors border-b border-border/30 ${workspace._id === w._id ? 'bg-bg-primary/50' : ''}`}
                    >
                      <span className={`text-sm font-bold ${workspace._id === w._id ? 'text-accent-blue' : 'text-text-primary'}`}>{w.name}</span>
                      <button 
                        onClick={(e) => handleDeleteWorkspace(e, w._id)}
                        className="text-red-500 opacity-60 hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Workspace"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-border/50 bg-bg-primary/30">
                  <button 
                    onClick={openCreateModal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-xl text-sm font-bold hover:bg-accent-indigo transition-colors shadow-sm"
                  >
                    <Plus size={16} /> Create Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <Link key={i} to={s.link} 
              className={`group flex items-center gap-4 p-5 rounded-3xl bg-bg-secondary border border-border/60 hover:border-accent-blue/30 shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shrink-0 ${s.iconColor} group-hover:scale-110 transition-transform duration-300 shadow-inner border ${s.border}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-3xl font-black text-text-primary leading-none font-outfit mb-1">{s.value}</p>
                <p className="text-xs font-semibold text-text-secondary leading-tight">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT — 7 cols */}
          <div className="lg:col-span-7 space-y-6">

            {/* Weekly Activity Bar Chart */}
            <div className="rounded-3xl bg-bg-secondary border border-border/50 p-6 shadow-soft hover:shadow-hover transition-shadow duration-300 glass relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/5 rounded-full blur-3xl -z-10"></div>
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-outfit flex items-center gap-2">
                  <Activity size={16} className="text-accent-blue" /> Activity Overview
                </h2>
                <span className="text-xs font-bold text-text-secondary bg-bg-primary px-3 py-1.5 rounded-full border border-border/50 shadow-sm">This Week</span>
              </div>
              <div className="flex items-end justify-between gap-3 h-32 mt-4 relative">
                {[
                  { day: 'Mon', val: 30 }, { day: 'Tue', val: 70 },
                  { day: 'Wed', val: 45 }, { day: 'Thu', val: 90 },
                  { day: 'Fri', val: 60 }, { day: 'Sat', val: 20 },
                  { day: 'Sun', val: 40 }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group z-10">
                    <div className="w-full h-full flex items-end relative">
                      <div
                        className="w-full bg-[#1b2b4c] dark:bg-[#ffca22] rounded-t-lg opacity-80 group-hover:opacity-100 transition-all duration-300"
                        style={{ height: `${item.val}%`, minHeight: '8px' }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-text-secondary mt-3 uppercase tracking-wider">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* My Priorities */}
            <div className="rounded-3xl bg-bg-secondary border border-border/50 p-6 shadow-soft hover:shadow-hover transition-shadow duration-300 glass">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-outfit flex items-center gap-2">
                  <CheckSquare size={16} className="text-accent-blue" /> My Priorities
                </h2>
                <Link to="/my-tasks" className="text-xs font-bold text-accent-blue hover:text-accent-indigo transition-colors flex items-center gap-1 bg-accent-blue/10 px-3 py-1.5 rounded-full">
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {myTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-60">
                    <CheckSquare size={40} className="text-text-secondary mb-3" />
                    <p className="text-sm font-semibold text-text-secondary">No pending tasks. You're all caught up! 🎉</p>
                  </div>
                ) : myTasks.slice(0, 5).map(task => (
                  <Link to="/my-tasks" key={task._id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-bg-primary/50 hover:bg-bg-primary border border-border/40 hover:border-accent-blue/30 transition-all duration-200 group hover:shadow-sm">
                    <div className="w-5 h-5 rounded-md border-2 border-border group-hover:border-accent-blue shrink-0 transition-colors bg-bg-secondary"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent-blue transition-colors">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${
                          task.priority?.toLowerCase() === 'high' ? 'text-red-600 bg-red-100 border border-red-200 dark:bg-red-900/30 dark:border-red-800' :
                          task.priority?.toLowerCase() === 'medium' ? 'text-amber-600 bg-amber-100 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800' :
                          'text-emerald-600 bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800'
                        }`}>{task.priority || 'Low'}</span>
                        <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
                          <Clock size={12} className="opacity-70" />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Soon'}
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-border shadow-sm">
                      <ChevronRight size={16} className="text-accent-blue" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* My Attendance Donut */}
            <div className="rounded-3xl bg-bg-secondary border border-border/50 p-6 shadow-soft hover:shadow-hover transition-shadow duration-300 glass">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-outfit flex items-center gap-2">
                  <TrendingUp size={16} className="text-accent-blue" /> My Monthly Attendance
                </h2>
                <Link to="/attendance" className="text-xs font-bold text-accent-blue hover:text-accent-indigo transition-colors flex items-center gap-1 bg-accent-blue/10 px-3 py-1.5 rounded-full">
                  View Log <ChevronRight size={14} />
                </Link>
              </div>
              <div className="flex items-center gap-8 bg-bg-primary/30 p-4 rounded-2xl border border-border/40">
                <div className="relative shrink-0 w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90 drop-shadow-md">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border)" strokeWidth="4" className="opacity-40" />
                    {(() => {
                      if (!attendanceStats.total || (attendanceStats.onTime === 0 && attendanceStats.late === 0 && attendanceStats.absent === 0)) {
                        return (
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="4" className="text-accent-blue/20 opacity-40" />
                        );
                      }
                      const total = attendanceStats.total;
                      const onTimePct = (attendanceStats.onTime / total) * 100;
                      const latePct = (attendanceStats.late / total) * 100;
                      const absentPct = (attendanceStats.absent / total) * 100;
                      return (
                        <>
                          {onTimePct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${onTimePct} ${100 - onTimePct}`} strokeLinecap="round" />}
                          {latePct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray={`${latePct} ${100 - latePct}`} strokeDashoffset={`-${onTimePct}`} strokeLinecap="round" />}
                          {absentPct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray={`${absentPct} ${100 - absentPct}`} strokeDashoffset={`-${onTimePct + latePct}`} strokeLinecap="round" />}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-text-primary font-outfit leading-none">{attendanceStats.total}</span>
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-1">Days</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  {[
                    { label: 'On Time', color: 'bg-emerald-500 shadow-emerald-500/40', val: attendanceStats.onTime },
                    { label: 'Late', color: 'bg-amber-500 shadow-amber-500/40', val: attendanceStats.late },
                    { label: 'Absent', color: 'bg-red-500 shadow-red-500/40', val: attendanceStats.absent },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full shadow-sm ${r.color}`}></span>
                        <span className="text-sm font-semibold text-text-secondary group-hover:text-text-primary transition-colors">{r.label}</span>
                      </div>
                      <span className="text-base font-black text-text-primary font-outfit">{r.val}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <TrendingUp size={14} className="text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 tracking-wide">
                      {attendanceStats.total === 0 ? 'No attendance records yet' : `${attendanceStats.rate}% on-time rate this month`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT — 5 cols */}
          <div className="lg:col-span-5 space-y-6">

            {/* Quick Actions */}
            <div className="rounded-3xl bg-bg-secondary border border-border/50 p-6 shadow-soft hover:shadow-hover transition-shadow duration-300 glass relative overflow-hidden">
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent-indigo/5 rounded-full blur-3xl -z-10"></div>
              
              <h2 className="text-sm font-black text-text-primary uppercase tracking-widest mb-5 font-outfit">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { to: '/my-tasks', icon: <Plus size={24} />, label: 'Create Task', gradient: 'from-blue-500 to-indigo-500' },
                  { to: '/meetings', icon: <CalendarDays size={24} />, label: 'Schedule', gradient: 'from-purple-500 to-pink-500' },
                ].map((a, i) => (
                  <Link key={i} to={a.to}
                    className="relative overflow-hidden flex flex-col items-center justify-center gap-3 py-6 rounded-2xl bg-bg-primary border border-border/40 hover:border-transparent group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-lg">
                    {/* Hover Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    
                    <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary group-hover:text-accent-blue shadow-sm border border-border/50 group-hover:border-accent-blue/30 group-hover:scale-110 transition-all duration-300">
                      {a.icon}
                    </div>
                    <span className="text-sm font-bold text-text-primary group-hover:text-accent-blue transition-colors">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Up Next */}
            <div className="rounded-3xl bg-bg-secondary border border-border/50 p-6 shadow-soft hover:shadow-hover transition-shadow duration-300 glass">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-outfit flex items-center gap-2">
                  <Clock size={16} className="text-accent-blue" /> Up Next
                </h2>
                <Link to="/meetings" className="text-xs font-bold text-accent-blue hover:text-accent-indigo transition-colors flex items-center gap-1 bg-accent-blue/10 px-3 py-1.5 rounded-full">
                  Calendar <ChevronRight size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {upNext.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-60">
                    <CalendarDays size={40} className="text-text-secondary mb-3" />
                    <p className="text-sm font-semibold text-text-secondary">No meetings scheduled for today.</p>
                  </div>
                ) : upNext.map(m => (
                  <Link to="/meetings" key={m._id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-bg-primary/50 hover:bg-bg-primary border border-border/40 hover:border-purple-500/30 transition-all duration-200 group hover:shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-center shrink-0 w-16 bg-bg-secondary p-2 rounded-xl border border-border/50 shadow-sm group-hover:border-purple-500/20 transition-colors">
                      <p className="text-lg font-black text-text-primary group-hover:text-purple-600 transition-colors font-outfit">{m.startTime || '10:00'}</p>
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-0.5">AM</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate group-hover:text-purple-600 transition-colors">{m.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-md border border-border/50">
                          <Users size={10} className="text-purple-500" /> {m.participants?.length || 2} attendees
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-border shadow-sm">
                      <ChevronRight size={16} className="text-purple-600" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Workspace Activity */}
            <div className="rounded-3xl bg-bg-secondary border border-border/50 p-6 shadow-soft hover:shadow-hover transition-shadow duration-300 glass">
              <h2 className="text-sm font-black text-text-primary uppercase tracking-widest mb-5 font-outfit">Recent Activity</h2>
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-60">
                  <Activity size={40} className="text-text-secondary mb-3" />
                  <p className="text-sm font-semibold text-text-secondary">No recent activity.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {activities.map((act) => (
                    <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-bg-secondary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 group-hover:scale-110 transition-transform duration-300">
                        {act.icon}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-bg-primary/50 border border-border/40 p-3.5 rounded-2xl hover:bg-bg-primary hover:border-accent-blue/30 hover:shadow-sm transition-all duration-200">
                        <div className="flex flex-col">
                          <p className="text-xs font-bold text-text-primary leading-snug">{act.title}</p>
                          <p className="text-[10px] font-medium text-text-secondary mt-1 flex items-center gap-1">
                            <Clock size={10} className="opacity-70" />
                            {act.time.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* CREATE WORKSPACE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-secondary border border-border/50 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-accent-blue/10 text-accent-blue rounded-2xl flex items-center justify-center mb-4 border border-accent-blue/20">
                <LayoutDashboard size={24} />
              </div>
              <h3 className="text-2xl font-bold text-text-primary font-outfit">Create Workspace</h3>
              <p className="text-sm text-text-secondary mt-1">Set up a new workspace for your team.</p>
            </div>

            <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Workspace Name</label>
                <input 
                  type="text"
                  value={newWorkspaceData.name}
                  onChange={e => setNewWorkspaceData({...newWorkspaceData, name: e.target.value})}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-bg-primary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Description <span className="normal-case font-normal opacity-70">(Optional)</span></label>
                <textarea 
                  value={newWorkspaceData.description}
                  onChange={e => setNewWorkspaceData({...newWorkspaceData, description: e.target.value})}
                  placeholder="What is this workspace for?"
                  rows={3}
                  className="w-full bg-bg-primary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting || !newWorkspaceData.name.trim()}
                  className="w-full bg-accent-blue hover:bg-accent-indigo text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Create Workspace'}
                </button>
              </div>
              
              <p className="text-center text-xs text-text-secondary mt-4">
                You can invite team members to this workspace from the <strong className="text-text-primary">Team</strong> module after creation.
              </p>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
