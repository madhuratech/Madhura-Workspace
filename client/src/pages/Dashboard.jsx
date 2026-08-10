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
    <div className="h-full overflow-y-auto px-6 py-8 md:px-10 lg:px-12 mx-auto custom-scrollbar font-sans bg-bg-primary">
      
      {/* HEADER - Minimal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-border/60">
        <div>
          <p className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0]}.
          </h1>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-4 bg-bg-secondary py-2 px-4 rounded-xl border border-border/60 shadow-sm">
          <div className="flex flex-col items-end">
            <span className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">Active Workspace</span>
            <span className="font-bold text-text-primary text-sm leading-tight">{workspace.name}</span>
          </div>
          <div className="h-10 w-10 bg-accent-blue text-accent-text font-bold rounded-lg flex items-center justify-center shadow-sm">
            {workspace.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* QUICK STATS - Minimal Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="flex items-center space-x-4 p-5 bg-bg-secondary rounded-2xl border border-border/60 shadow-sm group hover:border-accent-blue/30 transition-colors">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CheckSquare size={20} />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text-primary">{stats.tasks}</p>
            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Open Tasks</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 p-5 bg-bg-secondary rounded-2xl border border-border/60 shadow-sm group hover:border-accent-blue/30 transition-colors">
          <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CalendarDays size={20} />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text-primary">{stats.meetings}</p>
            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Meetings Today</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 p-5 bg-bg-secondary rounded-2xl border border-border/60 shadow-sm group hover:border-accent-blue/30 transition-colors">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text-primary">{activities.length}</p>
            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Recent Updates</p>
          </div>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Priorities */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* My Tasks */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-extrabold text-text-primary uppercase tracking-wide">My Priorities</h2>
              <Link to="/my-tasks" className="text-sm font-bold text-accent-blue hover:underline">View all</Link>
            </div>
            
            <div className="bg-bg-secondary rounded-2xl border border-border/60 shadow-sm overflow-hidden">
              {myTasks.length === 0 ? (
                <div className="p-8 text-center text-text-secondary text-sm font-medium">No pending tasks for today. You're all caught up!</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {myTasks.slice(0, 5).map(task => (
                    <Link to="/my-tasks" key={task._id} className="flex items-start p-4 hover:bg-bg-primary/50 transition-colors cursor-pointer group">
                      <div className="mt-0.5 mr-3">
                        <div className="h-5 w-5 rounded-md border-2 border-border/80 group-hover:border-emerald-500 transition-colors flex items-center justify-center"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-text-primary mb-1 truncate group-hover:text-emerald-500 transition-colors">{task.title}</p>
                        <div className="flex items-center text-xs text-text-secondary space-x-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            task.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 
                            task.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 
                            'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                          }`}>
                            {task.priority || 'Low'}
                          </span>
                          <span className="font-medium">Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Soon'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Schedule */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-extrabold text-text-primary uppercase tracking-wide">Up Next</h2>
              <Link to="/meetings" className="text-sm font-bold text-accent-blue hover:underline">Open Calendar</Link>
            </div>
            
            <div className="space-y-3">
              {upNext.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-bg-secondary/50 text-center text-text-secondary text-sm font-medium">
                  No upcoming meetings scheduled for today.
                </div>
              ) : (
                upNext.map(meeting => (
                  <Link to="/meetings" key={meeting._id} className="flex bg-bg-secondary rounded-2xl border border-border/60 shadow-sm p-4 items-center group hover:border-accent-blue/30 transition-all cursor-pointer">
                    <div className="flex flex-col items-center justify-center pr-5 border-r border-border/60 min-w-[90px]">
                      <span className="text-[15px] font-extrabold text-text-primary">{meeting.startTime || '10:00'}</span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{meeting.startTime?.includes('M') ? '' : 'AM'}</span>
                    </div>
                    <div className="pl-5 flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-text-primary truncate group-hover:text-accent-blue transition-colors">{meeting.title}</p>
                      <p className="text-xs font-medium text-text-secondary mt-1 flex items-center">
                        <Users size={14} className="mr-1.5" />
                        {meeting.participants?.length || 2} attendees
                      </p>
                    </div>
                    <div className="ml-4 p-2 text-text-secondary group-hover:text-accent-blue group-hover:translate-x-1 transition-all">
                      <ChevronRight size={18} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Context & Actions */}
        <div className="lg:col-span-5 space-y-10">
          
          {/* Quick Actions */}
          <section>
            <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/my-tasks" className="flex flex-col items-center justify-center p-5 bg-bg-secondary hover:bg-bg-primary border border-border/60 rounded-2xl transition-all shadow-sm hover:shadow-md hover:border-accent-blue/30 group">
                <div className="h-10 w-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus size={18} strokeWidth={3} />
                </div>
                <span className="text-[13px] font-bold text-text-primary">Create Task</span>
              </Link>
              <Link to="/meetings" className="flex flex-col items-center justify-center p-5 bg-bg-secondary hover:bg-bg-primary border border-border/60 rounded-2xl transition-all shadow-sm hover:shadow-md hover:border-accent-blue/30 group">
                <div className="h-10 w-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <CalendarDays size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[13px] font-bold text-text-primary">Schedule</span>
              </Link>
            </div>
          </section>

          {/* Activity Feed */}
          <section>
            <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-5">Workspace Activity</h2>
            <div className="bg-bg-secondary rounded-2xl border border-border/60 shadow-sm p-6">
              {activities.length === 0 ? (
                <p className="text-center text-sm font-medium text-text-secondary">No recent activity to show.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-border/60">
                  {activities.map((act, i) => (
                    <div key={act.id} className="relative flex items-start group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-bg-secondary border-[3px] border-border shadow-sm flex items-center justify-center mr-4 text-text-secondary group-hover:border-accent-blue group-hover:text-accent-blue transition-colors">
                        {act.icon}
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] font-bold text-text-primary leading-tight">{act.title}</p>
                        <p className="text-[11px] font-medium text-text-secondary mt-1">
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
