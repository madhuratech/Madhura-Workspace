import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { CheckCircle2, CalendarDays, Activity, MessageSquare, Clock, CheckSquare, ChevronRight, Plus, Users } from 'lucide-react';
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
        
        // Generate minimal activity feed
        const recentActivities = [
          ...tasks.slice(0, 5).map(t => ({
            id: `task-${t._id}`,
            type: 'task',
            title: t.status === 'completed' ? `Completed task: ${t.title}` : `New task: ${t.title}`,
            time: new Date(t.updatedAt || t.createdAt || Date.now()),
            icon: <CheckSquare size={12} />
          })),
          ...meetings.slice(0, 5).map(m => ({
            id: `meeting-${m._id}`,
            type: 'meeting',
            title: `Meeting scheduled: ${m.title}`,
            time: new Date(m.createdAt || m.date || Date.now()),
            icon: <CalendarDays size={12} />
          }))
        ].sort((a, b) => b.time - a.time).slice(0, 6);
        
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
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-primary">
        <div className="w-8 h-8 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto p-8 bg-bg-primary">
        <Activity size={32} className="text-text-secondary mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">No Workspace Found</h2>
        <p className="text-text-secondary text-sm">You are not assigned to any workspace. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8 md:px-10 lg:px-12 mx-auto custom-scrollbar font-sans bg-bg-primary relative">
      {/* Ambient glowing background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-blue/10 dark:bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '10s' }}></div>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 relative z-10">
        <div className="mb-6 md:mb-0">
          <p className="text-[12px] font-bold text-accent-blue/80 dark:text-accent-blue uppercase tracking-widest mb-3 flex items-center">
            <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse mr-2"></span>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 tracking-tight leading-tight">
            {getGreeting()},<br />{user?.name?.split(' ')[0]}.
          </h1>
        </div>
        
        {/* Workspace Badge */}
        <div className="relative group">
          <div className="absolute inset-[-4px] rounded-2xl bg-gradient-to-r from-accent-blue to-purple-500 opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
          <div className="relative flex items-center space-x-4 bg-white/60 dark:bg-bg-secondary/40 backdrop-blur-xl py-3 px-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-xl transition-transform duration-500 group-hover:-translate-y-1">
            <div className="flex flex-col items-end">
              <span className="text-text-secondary text-[9px] font-black uppercase tracking-widest mb-0.5">Workspace</span>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-purple-500 text-[15px] leading-tight">{workspace.name}</span>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-dashed border-accent-blue/40 rounded-xl animate-[spin_10s_linear_infinite]"></div>
              <div className="w-10 h-10 bg-gradient-to-tr from-accent-blue to-purple-500 text-white font-black rounded-lg flex items-center justify-center shadow-lg text-lg">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14 relative z-10">
        
        <div className="relative group p-[2px] rounded-[24px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center space-x-4 p-5 bg-white/70 dark:bg-bg-secondary/60 backdrop-blur-xl rounded-[22px] border border-gray-100 dark:border-white/5 shadow-lg group-hover:bg-white/90 dark:group-hover:bg-bg-secondary/90 transition-colors duration-500">
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              <CheckSquare size={20} className="text-blue-500 z-10 group-hover:scale-110 group-hover:animate-bounce transition-all duration-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-text-primary tracking-tight">{stats.tasks}</p>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Open Tasks</p>
            </div>
          </div>
        </div>

        <div className="relative group p-[2px] rounded-[24px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center space-x-4 p-5 bg-white/70 dark:bg-bg-secondary/60 backdrop-blur-xl rounded-[22px] border border-gray-100 dark:border-white/5 shadow-lg group-hover:bg-white/90 dark:group-hover:bg-bg-secondary/90 transition-colors duration-500">
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-orange-900/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              <CalendarDays size={20} className="text-orange-500 z-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-text-primary tracking-tight">{stats.meetings}</p>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Meetings Today</p>
            </div>
          </div>
        </div>

        <div className="relative group p-[2px] rounded-[24px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center space-x-4 p-5 bg-white/70 dark:bg-bg-secondary/60 backdrop-blur-xl rounded-[22px] border border-gray-100 dark:border-white/5 shadow-lg group-hover:bg-white/90 dark:group-hover:bg-bg-secondary/90 transition-colors duration-500">
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              <div className="absolute inset-0 border-2 border-dashed border-emerald-400/30 rounded-xl animate-[spin_8s_linear_infinite_reverse]"></div>
              <Activity size={20} className="text-emerald-500 z-10 group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-text-primary tracking-tight">{activities.length}</p>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Recent Updates</p>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
        
        {/* LEFT COLUMN: Priorities */}
        <div className="lg:col-span-7 space-y-12">
          
          {/* Weekly Activity Chart (CSS Bar Chart) */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[14px] font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-gray-200 dark:to-gray-400 uppercase tracking-[0.2em]">Activity Overview</h2>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider bg-bg-secondary px-3 py-1 rounded-full border border-border shadow-sm">This Week</span>
            </div>
            
            <div className="bg-white/60 dark:bg-bg-secondary/40 backdrop-blur-xl rounded-[24px] border border-gray-100 dark:border-white/5 shadow-lg p-6 group">
              <div className="flex items-end justify-between h-44 gap-2 sm:gap-4 mt-2">
                {[
                  { day: 'Mon', val: 30 }, { day: 'Tue', val: 70 }, 
                  { day: 'Wed', val: 45 }, { day: 'Thu', val: 90 }, 
                  { day: 'Fri', val: 60 }, { day: 'Sat', val: 20 }, 
                  { day: 'Sun', val: 40 }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 h-full justify-end cursor-pointer">
                    <div className="w-full relative bg-gray-100 dark:bg-bg-primary rounded-t-xl h-full flex items-end overflow-hidden group-hover:bg-gray-200/50 dark:group-hover:bg-bg-primary/70 transition-colors">
                      <div 
                        className="w-full bg-gradient-to-t from-accent-blue/80 to-purple-500/80 rounded-t-xl hover:opacity-100 hover:from-accent-blue hover:to-purple-500 transition-all duration-300 shadow-[0_-5px_15px_rgba(59,130,246,0.2)]"
                        style={{ height: `${item.val}%`, minHeight: '10%' }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-text-secondary mt-3 uppercase tracking-wider">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* My Tasks */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[14px] font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-gray-200 dark:to-gray-400 uppercase tracking-[0.2em]">My Priorities</h2>
              <Link to="/my-tasks" className="text-xs font-bold text-accent-blue bg-accent-blue/10 px-4 py-1.5 rounded-full hover:bg-accent-blue hover:text-white transition-colors duration-300">View all</Link>
            </div>
            
            <div className="space-y-4">
              {myTasks.length === 0 ? (
                <div className="p-10 rounded-[24px] bg-white/40 dark:bg-bg-secondary/40 backdrop-blur-xl border border-dashed border-gray-200 dark:border-white/10 text-center shadow-inner">
                   <p className="text-text-secondary text-sm font-bold">No pending tasks for today. You're all caught up! 🎉</p>
                </div>
              ) : (
                myTasks.slice(0, 5).map(task => (
                  <Link to="/my-tasks" key={task._id} className="relative block group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500 -z-10"></div>
                    <div className="flex items-start p-5 bg-white/80 dark:bg-bg-secondary/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm group-hover:shadow-md group-hover:border-accent-blue/30 group-hover:translate-x-2 transition-all duration-500">
                      <div className="mt-1 mr-4">
                        <div className="h-6 w-6 rounded-lg border-2 border-border/80 group-hover:border-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors flex items-center justify-center"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-text-primary mb-2 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent-blue group-hover:to-purple-500 transition-colors">{task.title}</p>
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            task.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 
                            task.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 
                            'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                          }`}>
                            {task.priority?.toLowerCase() === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                            <span>{task.priority || 'Low'}</span>
                          </div>
                          <span className="text-xs font-medium text-text-secondary flex items-center">
                            <Clock size={12} className="mr-1.5 opacity-70" />
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], {month:'short', day:'numeric'}) : 'Soon'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Schedule */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[14px] font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-gray-200 dark:to-gray-400 uppercase tracking-[0.2em]">Up Next</h2>
              <Link to="/meetings" className="text-xs font-bold text-purple-500 bg-purple-500/10 px-4 py-1.5 rounded-full hover:bg-purple-500 hover:text-white transition-colors duration-300">Open Calendar</Link>
            </div>
            
            <div className="space-y-4">
              {upNext.length === 0 ? (
                <div className="p-10 rounded-[24px] bg-white/40 dark:bg-bg-secondary/40 backdrop-blur-xl border border-dashed border-gray-200 dark:border-white/10 text-center shadow-inner">
                   <p className="text-text-secondary text-sm font-bold">No upcoming meetings scheduled for today.</p>
                </div>
              ) : (
                upNext.map(meeting => (
                  <Link to="/meetings" key={meeting._id} className="relative block group">
                     <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-red-500/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500 -z-10"></div>
                     <div className="flex bg-white/80 dark:bg-bg-secondary/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm p-4 items-center group-hover:shadow-lg group-hover:border-orange-500/30 group-hover:-translate-y-1 transition-all duration-500 cursor-pointer">
                      <div className="flex flex-col items-center justify-center pr-6 border-r border-border/60 min-w-[100px]">
                        <span className="text-lg font-black text-text-primary group-hover:text-orange-500 transition-colors">{meeting.startTime || '10:00'}</span>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{meeting.startTime?.includes('M') ? '' : 'AM'}</span>
                      </div>
                      <div className="pl-6 flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-text-primary truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-red-500 transition-all">{meeting.title}</p>
                        <p className="text-xs font-semibold text-text-secondary mt-1.5 flex items-center">
                          <Users size={14} className="mr-2 text-text-secondary/70 group-hover:text-orange-500/70 transition-colors" />
                          {meeting.participants?.length || 2} attendees
                        </p>
                      </div>
                      <div className="ml-4 w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Context & Actions */}
        <div className="lg:col-span-5 space-y-12">
          
          {/* Quick Actions */}
          <section>
            <h2 className="text-[14px] font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-gray-200 dark:to-gray-400 uppercase tracking-[0.2em] mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-5">
              <Link to="/my-tasks" className="relative group overflow-hidden rounded-[24px]">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-purple-500/10 group-hover:opacity-100 opacity-50 transition-opacity duration-500"></div>
                <div className="relative flex flex-col items-center justify-center p-6 bg-white/60 dark:bg-bg-secondary/60 backdrop-blur-xl border border-gray-100 dark:border-white/5 transition-all shadow-md group-hover:shadow-xl group-hover:border-accent-blue/40 h-full">
                  <div className="relative mb-4">
                     <div className="absolute inset-[-8px] rounded-full border border-dashed border-accent-blue/50 animate-[spin_10s_linear_infinite] group-hover:border-accent-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent-blue to-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                       <Plus size={22} strokeWidth={3} />
                     </div>
                  </div>
                  <span className="text-[14px] font-black text-text-primary tracking-wide">Create Task</span>
                </div>
              </Link>

              <Link to="/meetings" className="relative group overflow-hidden rounded-[24px]">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 group-hover:opacity-100 opacity-50 transition-opacity duration-500"></div>
                <div className="relative flex flex-col items-center justify-center p-6 bg-white/60 dark:bg-bg-secondary/60 backdrop-blur-xl border border-gray-100 dark:border-white/5 transition-all shadow-md group-hover:shadow-xl group-hover:border-orange-500/40 h-full">
                  <div className="relative mb-4">
                     <div className="absolute inset-[-8px] rounded-full border border-dashed border-orange-500/50 animate-[spin_10s_linear_infinite_reverse] group-hover:border-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                       <CalendarDays size={20} strokeWidth={2.5} />
                     </div>
                  </div>
                  <span className="text-[14px] font-black text-text-primary tracking-wide">Schedule</span>
                </div>
              </Link>
            </div>
          </section>

          {/* Activity Feed */}
          <section>
            <h2 className="text-[14px] font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-gray-200 dark:to-gray-400 uppercase tracking-[0.2em] mb-6">Workspace Activity</h2>
            <div className="bg-white/60 dark:bg-bg-secondary/40 backdrop-blur-xl rounded-[24px] border border-gray-100 dark:border-white/5 shadow-lg p-8">
              {activities.length === 0 ? (
                <p className="text-center text-sm font-bold text-text-secondary py-4">No recent activity to show.</p>
              ) : (
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-accent-blue/50 before:via-purple-500/50 before:to-transparent">
                  {activities.map((act, i) => (
                    <div key={act.id} className="relative flex items-start group">
                      <div className="relative z-10 w-8 h-8 rounded-full bg-white dark:bg-bg-secondary border-4 border-white dark:border-bg-secondary shadow-[0_0_10px_rgba(59,130,246,0.3)] flex items-center justify-center mr-5 text-accent-blue group-hover:scale-125 transition-transform duration-500">
                        {/* Inner glowing dot */}
                        <div className="w-full h-full bg-gradient-to-br from-accent-blue to-purple-500 rounded-full flex items-center justify-center text-white p-1.5">
                           {act.icon}
                        </div>
                      </div>
                      <div className="pt-1.5 flex-1 bg-white/50 dark:bg-bg-primary/50 p-3 -mt-3 rounded-xl border border-gray-50 dark:border-white/5 shadow-sm group-hover:shadow-md group-hover:translate-x-1 transition-all duration-300">
                        <p className="text-[14px] font-bold text-text-primary leading-tight group-hover:text-accent-blue transition-colors">{act.title}</p>
                        <p className="text-[11px] font-bold text-text-secondary mt-1.5 flex items-center opacity-70">
                          <Clock size={10} className="mr-1" />
                          {act.time.toLocaleDateString([], {month:'short', day:'numeric'})} • {act.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
