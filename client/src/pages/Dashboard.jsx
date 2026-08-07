import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, CheckCircle2, Users, CalendarDays, Activity, MoreHorizontal, ArrowRight, MessageSquare, Clock, CheckSquare } from 'lucide-react';
import Avatar from '../components/Avatar';

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
  const [myTasks, setMyTasks] = useState([]);
  const [upNext, setUpNext] = useState([]);
  const [activities, setActivities] = useState([]);
  const [reminders, setReminders] = useState([]);
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
        const [projectsRes, tasksRes, meetingsRes, remindersRes] = await Promise.all([
          axios.get(`/workspaces/${ws._id}/projects`).catch(() => ({ data: [] })),
          axios.get('/tasks').catch(() => ({ data: [] })),
          axios.get('/meetings').catch(() => ({ data: [] })),
          axios.get('/reminders').catch(() => ({ data: [] }))
        ]);
        
        const tasks = tasksRes.data || [];
        const meetings = meetingsRes.data || [];
        
        setMyTasks(tasks);
        setUpNext(meetings);
        setReminders(remindersRes.data || []);
        
        // Generate activity feed from tasks and meetings
        const recentActivities = [
          ...tasks.slice(0, 3).map(t => ({
            id: `task-${t._id}`,
            type: 'task',
            title: `Task update: ${t.title}`,
            time: new Date(t.createdAt || Date.now()),
            icon: <CheckCircle2 size={14} />,
            color: 'text-success',
            bg: 'bg-success/10'
          })),
          ...meetings.slice(0, 3).map(m => ({
            id: `meeting-${m._id}`,
            type: 'meeting',
            title: `Meeting scheduled: ${m.title}`,
            time: new Date(m.createdAt || m.date || Date.now()),
            icon: <CalendarDays size={14} />,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
          }))
        ].sort((a, b) => b.time - a.time).slice(0, 5);
        
        setActivities(recentActivities);

        setStats({
          projects: projectsRes.data.length || 0,
          tasks: tasks.length || 0,
          members: ws.members?.length || 1,
          meetings: meetings.length || 0
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
      
      {/* Header Section with dynamic styling */}
      <div className="relative mb-10 p-8 rounded-3xl overflow-hidden bg-gradient-to-r from-bg-secondary to-bg-primary border border-border/50 shadow-sm">
        {/* Abstract decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center space-x-5">
            <Avatar 
              user={user} 
              size="w-16 h-16" 
              textClass="text-2xl" 
              className="shadow-lg transform hover:scale-105 transition-transform duration-300"
              showStatus={false}
            />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-primary/70 mb-1">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-sm text-text-secondary font-medium flex items-center">
                <Activity size={14} className="mr-1.5 text-success" />
                Here's what's happening in your workspace today.
              </p>
            </div>
          </div>
          
          {user?.role === 'super_admin' && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-text-primary text-bg-primary hover:bg-accent-blue hover:text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl font-semibold flex items-center space-x-2 transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              <span>New Workspace</span>
            </button>
          )}
        </div>
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
              className="bg-accent-blue text-white dark:text-text-primary px-6 py-3 rounded-xl hover:bg-accent-indigo font-semibold transition-all shadow-lg inline-flex items-center space-x-2"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { label: 'Active Projects', value: stats.projects, icon: <Briefcase size={22} />, color: 'text-blue-500', bg: 'bg-blue-500/10', borderHover: 'hover:border-blue-500/50', shadowHover: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]' },
                { label: 'Open Tasks', value: stats.tasks, icon: <CheckCircle2 size={22} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', borderHover: 'hover:border-emerald-500/50', shadowHover: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
                { label: 'Team Members', value: stats.members, icon: <Users size={22} />, color: 'text-indigo-500', bg: 'bg-indigo-500/10', borderHover: 'hover:border-indigo-500/50', shadowHover: 'hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]' },
                { label: 'Meetings', value: stats.meetings, icon: <CalendarDays size={22} />, color: 'text-rose-500', bg: 'bg-rose-500/10', borderHover: 'hover:border-rose-500/50', shadowHover: 'hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]' }
              ].map((stat, idx) => (
                <div 
                  key={idx} 
                  className={`relative overflow-hidden bg-bg-secondary p-5 rounded-2xl border border-border/50 ${stat.borderHover} transition-all duration-300 transform hover:-translate-y-1 ${stat.shadowHover} group flex flex-col justify-between`}
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                >
                  {/* Subtle Background Glow */}
                  <div className={`absolute -right-6 -top-6 w-24 h-24 ${stat.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  <div className={`p-2.5 w-fit rounded-xl ${stat.bg} ${stat.color} mb-4 relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                    {stat.icon}
                  </div>
                  <div className="relative z-10">
                    <p className="text-3xl font-extrabold text-text-primary mb-1 tracking-tight">{stat.value}</p>
                    <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workspaces Section */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-extrabold text-text-primary flex items-center tracking-tight">
                  <div className="p-1.5 bg-accent-blue/10 text-accent-blue rounded-lg mr-3">
                    <Briefcase size={18} />
                  </div>
                  Active Workspaces
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {workspaces.map(ws => (
                  <div key={ws._id} className="bg-bg-secondary/50 backdrop-blur-xl p-6 rounded-3xl border border-border/40 hover:border-accent-blue/30 hover:shadow-xl hover:shadow-accent-blue/5 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden transform hover:-translate-y-1" onClick={() => window.location.href = `/workspace/${ws._id}`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-blue to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-bg-primary to-bg-secondary border border-border/50 text-text-primary rounded-xl flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-text-primary group-hover:text-accent-blue transition-colors">
                            {ws.name}
                          </h3>
                          <p className="text-sm text-text-secondary font-medium mt-0.5">{ws.members?.length || 1} members</p>
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
                          className="p-2 text-text-secondary hover:bg-white/10 hover:text-text-primary rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-5 border-t border-border/30 flex items-center justify-between">
                      <div className="flex -space-x-3">
                        {/* Real avatars for members */}
                        {ws.members && ws.members.slice(0, 3).map((m, i) => (
                          <div key={i} className="-ml-2 first:ml-0 hover:z-10 transition-transform hover:scale-110 cursor-pointer">
                            <Avatar user={m.user} size="w-8 h-8" textClass="text-xs" showStatus={false} className="border-2 border-bg-secondary" />
                          </div>
                        ))}
                        {ws.members && ws.members.length > 3 && (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-text-primary bg-bg-primary border-2 border-bg-secondary -ml-2 z-0">
                            +{ws.members.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-accent-blue flex items-center opacity-0 group-hover:opacity-100 transition-all translate-x-[-15px] group-hover:translate-x-0 duration-300 bg-accent-blue/10 px-3 py-1.5 rounded-lg">
                        Open <ArrowRight size={16} className="ml-1.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-bg-secondary/50 backdrop-blur-xl border border-border/40 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-extrabold text-text-primary flex items-center tracking-tight">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl mr-3">
                    <Activity size={20} />
                  </div>
                  Activity Feed
                </h2>
                <button className="text-xs font-bold bg-bg-primary border border-border/50 px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-all shadow-sm">
                  View Timeline
                </button>
              </div>
              
              <div className="space-y-6">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center bg-bg-primary/30 rounded-2xl border border-dashed border-border">
                    <div className="h-16 w-16 rounded-full bg-bg-primary flex items-center justify-center mb-4 border border-border/50 shadow-sm">
                      <Activity size={24} className="text-text-secondary/40" />
                    </div>
                    <p className="text-sm font-semibold text-text-secondary">It's quiet... too quiet.</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Start collaborating to see activity here.</p>
                  </div>
                ) : (
                  activities.map((act, i) => (
                    <div key={act.id} className="flex space-x-5 relative group">
                      <div className={`h-10 w-10 rounded-full ${act.bg} ${act.color} flex items-center justify-center shrink-0 z-10 border-4 border-bg-secondary group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                        {act.icon}
                      </div>
                      {i !== activities.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-[-24px] w-0.5 bg-gradient-to-b from-border to-transparent z-0"></div>
                      )}
                      <div className="pt-2 pb-1 flex-1">
                        <div className="bg-bg-primary/50 border border-border/30 rounded-2xl p-4 group-hover:border-border/80 group-hover:bg-bg-primary transition-all">
                          <p className="text-sm font-semibold text-text-primary leading-relaxed">
                            {act.title}
                          </p>
                          <p className="text-[11px] font-medium text-text-secondary/70 mt-1.5 flex items-center">
                            <Clock size={10} className="mr-1" />
                            {act.time.toLocaleDateString()} at {act.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            
            {/* Upcoming Reminders Card */}
            {reminders.length > 0 && (
              <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border/40 rounded-3xl p-6 shadow-xl shadow-black/5 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-widest flex items-center">
                    <div className="p-1.5 bg-indigo-500/20 text-indigo-500 rounded-lg mr-3">
                      <Clock size={16} />
                    </div>
                    Upcoming Reminders
                  </h2>
                </div>
                
                <div className="space-y-4 relative z-10">
                  {reminders.slice(0, 4).map((rem, i) => {
                    const isMeeting = rem.type === 'meeting';
                    const Icon = isMeeting ? CalendarDays : CheckSquare;
                    const color = isMeeting ? 'text-purple-500' : 'text-amber-500';
                    const bg = isMeeting ? 'bg-purple-500/10' : 'bg-amber-500/10';
                    const hoverBorder = isMeeting ? 'hover:border-purple-500/30' : 'hover:border-amber-500/30';
                    const timeString = ( rem.time ? new Date(rem.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "N/A" );
                    
                    return (
                      <div key={rem._id || i} className={`group p-4 border border-border/30 rounded-2xl bg-gradient-to-b from-bg-primary/50 to-bg-primary ${hoverBorder} hover:shadow-md transition-all cursor-default transform hover:-translate-y-0.5`}>
                        <div className="flex items-start mb-2">
                          <div className={`p-1.5 ${bg} ${color} rounded-lg mr-3 shadow-sm`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-text-primary leading-tight">{rem.title}</h4>
                            <p className="text-[11px] font-semibold text-text-secondary mt-1">{isMeeting ? 'Meeting' : 'Task Deadline'} • {timeString}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Schedule Card */}
            <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border/40 rounded-3xl p-6 shadow-xl shadow-black/5 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-widest flex items-center">
                  <div className="p-1.5 bg-orange-500/20 text-orange-500 rounded-lg mr-3">
                    <Clock size={16} />
                  </div>
                  Up Next
                </h2>
              </div>
              
              <div className="space-y-4 relative z-10">
                {upNext.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-bg-primary flex items-center justify-center mb-3">
                      <CalendarDays size={20} className="text-text-secondary/50" />
                    </div>
                    <p className="text-sm font-medium text-text-secondary">Your schedule is clear</p>
                  </div>
                ) : (
                  upNext.slice(0, 3).map((meeting, i) => (
                    <div key={meeting._id || i} className="group p-4 border border-border/30 rounded-2xl bg-gradient-to-b from-bg-primary/50 to-bg-primary hover:border-orange-500/30 hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5" onClick={() => window.location.href = '/meetings'}>
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm font-bold text-text-primary group-hover:text-orange-500 transition-colors pr-3 leading-tight">{meeting.title}</h4>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-500/10 px-2 py-1 rounded-md whitespace-nowrap shadow-sm">{meeting.startTime || '10:00 AM'}</span>
                      </div>
                      <p className="text-xs font-medium text-text-secondary flex items-center">
                        <div className="flex -space-x-1.5 mr-2">
                          {[1,2].map(x => <div key={x} className="h-5 w-5 rounded-full bg-border border border-bg-primary flex items-center justify-center text-[8px] font-bold text-text-primary">{x}</div>)}
                        </div>
                        {meeting.participants?.length || 2} attendees
                      </p>
                    </div>
                  ))
                )}
              </div>
              
              <Link to="/meetings" className="block text-center w-full mt-6 py-3 text-xs font-bold text-text-primary border border-border/50 rounded-xl hover:bg-bg-primary hover:border-text-primary/30 transition-all relative z-10 shadow-sm">
                Open Calendar
              </Link>
            </div>

            {/* My Tasks Snapshot */}
            <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border/40 rounded-3xl p-6 shadow-xl shadow-black/5 relative overflow-hidden">
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-widest flex items-center">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg mr-3">
                    <CheckSquare size={16} />
                  </div>
                  Action Items
                </h2>
              </div>
              
              <div className="space-y-3 relative z-10">
                {myTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-bg-primary flex items-center justify-center mb-3">
                      <CheckCircle2 size={20} className="text-text-secondary/50" />
                    </div>
                    <p className="text-sm font-medium text-text-secondary">All caught up!</p>
                  </div>
                ) : (
                  myTasks.slice(0, 4).map((task, i) => {
                    const isHigh = task.priority === 'high' || task.priority === 'High';
                    const isMed = task.priority === 'medium' || task.priority === 'Medium';
                    const bg = isHigh ? 'bg-rose-500/10' : isMed ? 'bg-amber-500/10' : 'bg-emerald-500/10';
                    const color = isHigh ? 'text-rose-500' : isMed ? 'text-amber-500' : 'text-emerald-500';
                    const borderColor = isHigh ? 'border-rose-500/20' : isMed ? 'border-amber-500/20' : 'border-emerald-500/20';
                    return (
                      <div key={task._id || i} className={`flex items-center space-x-4 p-3 border border-transparent hover:${borderColor} hover:bg-bg-primary/50 rounded-xl cursor-pointer transition-all group`} onClick={() => window.location.href = '/my-tasks'}>
                        <div className={`h-5 w-5 rounded-md border-2 ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-border group-hover:border-emerald-500'} flex-shrink-0 flex items-center justify-center transition-colors`}>
                          {task.status === 'completed' && <CheckSquare size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold text-text-primary truncate transition-all ${task.status === 'completed' ? 'line-through text-text-secondary' : 'group-hover:text-emerald-500'}`}>{task.title}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${bg} ${color} shadow-sm`}>
                          {task.priority || 'Low'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
              {myTasks.length > 0 && (
                 <Link to="/my-tasks" className="block text-center w-full mt-6 py-3 text-xs font-bold text-text-primary border border-border/50 rounded-xl hover:bg-bg-primary hover:border-text-primary/30 transition-all relative z-10 shadow-sm">
                   View All Tasks
                 </Link>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal for creating workspace */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-md shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-text-primary mb-1">Create Workspace</h3>
              <p className="text-xs text-text-secondary">Set up a new space for your team to collaborate.</p>
            </div>
            <div className="p-6">
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
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-border/50">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20"
                  >
                    Create Space
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal for editing workspace */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-md shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-text-primary mb-1">Manage Workspace</h3>
              <p className="text-xs text-text-secondary">Update details and manage members.</p>
            </div>
            <div className="p-6">
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
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-border/50">
                  <button 
                    type="button" 
                    onClick={() => { setShowEditModal(false); setEditingWorkspace(null); }}
                    className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
