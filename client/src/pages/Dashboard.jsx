import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { CheckCircle2, CalendarDays, Activity, MessageSquare, Clock, CheckSquare, ChevronRight, Plus, Users, Sparkles, TrendingUp, Zap } from 'lucide-react';
import Avatar from '../components/Avatar';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tasks: 0, meetings: 0, members: 0 });
  const [myTasks, setMyTasks] = useState([]);
  const [upNext, setUpNext] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/workspaces');
      if (res.data.length > 0) {
        const ws = res.data[0];
        setWorkspace(ws);
        
        const [tasksRes, meetingsRes] = await Promise.all([
          axios.get('/tasks').catch(() => ({ data: [] })),
          axios.get(`/workspaces/${ws._id}/meetings`).catch(() => ({ data: [] }))
        ]);
        
        const tasks = tasksRes.data || [];
        const meetings = meetingsRes.data || [];
        
        setMyTasks(tasks.filter(t => t.status !== 'completed'));
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todayMeetings = meetings.filter(m => {
          if (!m.date) return false;
          return new Date(m.date).toISOString().split('T')[0] === todayStr;
        });
        
        setUpNext(todayMeetings.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
        
        const recentActivities = [
          ...tasks.slice(0, 4).map(t => ({
            id: `task-${t._id}`,
            type: 'task',
            title: t.status === 'completed' ? `Completed task: ${t.title}` : `New task added: ${t.title}`,
            time: new Date(t.updatedAt || t.createdAt || Date.now()),
            icon: <CheckSquare size={14} />,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20'
          })),
          ...meetings.slice(0, 4).map(m => ({
            id: `meeting-${m._id}`,
            type: 'meeting',
            title: `Meeting scheduled: ${m.title}`,
            time: new Date(m.createdAt || m.date || Date.now()),
            icon: <CalendarDays size={14} />,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10 border-purple-500/20'
          }))
        ].sort((a, b) => b.time - a.time).slice(0, 5);
        
        setActivities(recentActivities);

        setStats({
          tasks: tasks.filter(t => t.status !== 'completed').length || 0,
          meetings: todayMeetings.length || 0,
          members: ws.members?.length || 1
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-primary relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-blue/20 blur-[100px] rounded-full"></div>
        <div className="w-12 h-12 border-[4px] border-border border-t-accent-blue rounded-full animate-spin mb-4 relative z-10 shadow-[0_0_15px_rgba(var(--accent-color),0.5)]"></div>
        <p className="text-text-secondary font-medium tracking-wide animate-pulse">Initializing Workspace...</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto p-8 bg-bg-primary">
        <div className="w-24 h-24 bg-bg-secondary border border-border/50 rounded-3xl shadow-xl flex items-center justify-center mb-6">
          <Activity size={40} className="text-text-secondary opacity-50" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">No Workspace Found</h2>
        <p className="text-text-secondary text-sm">You are not assigned to any workspace yet. Contact your administrator to get started.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8 md:px-10 lg:px-12 mx-auto custom-scrollbar font-sans bg-[#f8fafc] dark:bg-[#0a0e17] relative">
      
      {/* Decorative Background Elements for Premium Feel */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-accent-blue/5 to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent-blue/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

      <div className="relative z-10">
        {/* ULTRA-PREMIUM HEADER */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end group">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-full mb-4 shadow-sm">
              <Sparkles size={14} className="text-accent-blue" />
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-text-primary via-text-primary to-accent-blue">
              {getGreeting()}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-text-secondary mt-2 text-sm font-medium">Here's a quick overview of your day.</p>
          </div>
          
          <div className="mt-6 md:mt-0 flex items-center space-x-4 p-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-transform hover:scale-[1.02]">
            <div className="h-12 w-12 bg-gradient-to-br from-accent-blue to-purple-600 text-white font-bold rounded-xl flex items-center justify-center shadow-inner text-xl">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="pr-4">
              <span className="block text-[10px] font-extrabold text-text-secondary uppercase tracking-widest mb-0.5">Workspace</span>
              <span className="block font-bold text-text-primary text-sm">{workspace.name}</span>
            </div>
          </div>
        </div>

        {/* FLOATING STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Active Tasks', value: stats.tasks, icon: <CheckSquare size={22} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', gradient: 'from-emerald-500/20' },
            { label: 'Meetings Today', value: stats.meetings, icon: <CalendarDays size={22} />, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', gradient: 'from-purple-500/20' },
            { label: 'Recent Updates', value: activities.length, icon: <Zap size={22} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', gradient: 'from-amber-500/20' }
          ].map((stat, idx) => (
            <div key={idx} className="relative overflow-hidden p-6 bg-white/70 dark:bg-[#141a27]/70 backdrop-blur-xl rounded-[24px] border border-white/40 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
              <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${stat.gradient} to-transparent rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
              <div className="relative flex items-center justify-between z-10">
                <div>
                  <p className="text-3xl font-black text-text-primary tracking-tighter">{stat.value}</p>
                  <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
                <div className={`h-14 w-14 rounded-[16px] ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm border border-white/50 dark:border-white/5`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TWO COLUMN PREMIUM LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Deep Focus */}
          <div className="xl:col-span-7 space-y-8">
            
            {/* Action Items / Tasks */}
            <section className="bg-white/60 dark:bg-[#141a27]/60 backdrop-blur-2xl rounded-[32px] border border-white/40 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
              <div className="p-8 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent-blue/10 rounded-xl text-accent-blue">
                    <TrendingUp size={20} />
                  </div>
                  <h2 className="text-lg font-extrabold text-text-primary tracking-tight">Your Priorities</h2>
                </div>
                <Link to="/my-tasks" className="text-sm font-bold text-accent-blue hover:text-accent-indigo transition-colors flex items-center">
                  View all <ChevronRight size={16} className="ml-1" />
                </Link>
              </div>
              
              <div className="p-4">
                {myTasks.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4 border border-border/50">
                      <CheckCircle2 size={28} className="text-emerald-500 opacity-80" />
                    </div>
                    <p className="text-text-primary font-bold text-lg">All caught up!</p>
                    <p className="text-text-secondary text-sm mt-1">Enjoy your free time or start a new project.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myTasks.slice(0, 5).map((task, i) => (
                      <Link to="/my-tasks" key={task._id} className="flex items-center p-4 bg-transparent hover:bg-white dark:hover:bg-white/5 rounded-2xl transition-all duration-200 group border border-transparent hover:border-border/30 hover:shadow-sm">
                        <div className="mr-4 mt-0.5">
                          <div className="h-6 w-6 rounded-lg border-2 border-border group-hover:border-accent-blue transition-colors flex items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-accent-blue scale-0 group-hover:scale-100 opacity-10 transition-transform rounded-lg"></div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-[15px] font-bold text-text-primary mb-1 truncate group-hover:text-accent-blue transition-colors">{task.title}</p>
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                              task.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 
                              task.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 
                              'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                            }`}>
                              {task.priority || 'Low'}
                            </span>
                            <span className="text-[12px] font-semibold text-text-secondary">
                              Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Soon'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN: Context & Schedule */}
          <div className="xl:col-span-5 space-y-8">
            
            {/* Schedule / Up Next */}
            <section className="bg-gradient-to-br from-accent-blue to-purple-600 rounded-[32px] p-1 shadow-xl shadow-accent-blue/20">
              <div className="bg-white/95 dark:bg-[#0a0e17]/95 backdrop-blur-2xl rounded-[30px] h-full overflow-hidden">
                <div className="p-7 flex items-center justify-between border-b border-border/20">
                  <h2 className="text-lg font-extrabold text-text-primary tracking-tight flex items-center">
                    <Clock size={18} className="mr-2 text-accent-blue" /> Up Next
                  </h2>
                </div>
                <div className="p-5 space-y-3">
                  {upNext.length === 0 ? (
                    <div className="p-6 bg-bg-secondary/50 rounded-2xl border border-dashed border-border text-center">
                      <p className="text-text-secondary text-sm font-medium">Your schedule is clear today.</p>
                    </div>
                  ) : (
                    upNext.map(meeting => (
                      <Link to="/meetings" key={meeting._id} className="flex bg-bg-secondary/80 hover:bg-bg-primary rounded-[20px] border border-border/40 hover:border-accent-blue/30 shadow-sm p-4 items-center group transition-all">
                        <div className="flex flex-col items-center justify-center pr-5 border-r border-border/50 min-w-[80px]">
                          <span className="text-[16px] font-black text-text-primary">{meeting.startTime || '10:00'}</span>
                          <span className="text-[10px] font-bold text-accent-blue uppercase tracking-widest">{meeting.startTime?.includes('M') ? '' : 'AM'}</span>
                        </div>
                        <div className="pl-5 flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-text-primary truncate group-hover:text-accent-blue transition-colors">{meeting.title}</p>
                          <p className="text-xs font-semibold text-text-secondary mt-1.5 flex items-center">
                            <Users size={12} className="mr-1.5 opacity-70" />
                            {meeting.participants?.length || 2} attendees
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                  <Link to="/meetings" className="block text-center pt-3 pb-1 text-sm font-bold text-accent-blue hover:text-accent-indigo transition-colors">
                    Open Full Calendar
                  </Link>
                </div>
              </div>
            </section>

            {/* Premium Activity Feed */}
            <section className="bg-white/60 dark:bg-[#141a27]/60 backdrop-blur-2xl rounded-[32px] border border-white/40 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8">
              <h2 className="text-sm font-extrabold text-text-secondary uppercase tracking-widest mb-6 flex items-center">
                <Activity size={16} className="mr-2" /> Workspace Pulse
              </h2>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent">
                {activities.length === 0 ? (
                  <p className="text-sm text-text-secondary font-medium">No recent activity detected.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="relative flex items-start group">
                      <div className={`relative z-10 w-8 h-8 rounded-xl ${act.bg} border shadow-sm flex items-center justify-center mr-4 ${act.color} group-hover:scale-110 transition-transform duration-300`}>
                        {act.icon}
                      </div>
                      <div className="pt-1 flex-1 bg-white/40 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm">
                        <p className="text-[13px] font-bold text-text-primary leading-tight">{act.title}</p>
                        <p className="text-[11px] font-semibold text-text-secondary mt-1 opacity-80">
                          {act.time.toLocaleDateString([], {month:'short', day:'numeric'})} at {act.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
