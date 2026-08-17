import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { CalendarDays, Activity, Clock, CheckSquare, ChevronRight, Plus, Users, TrendingUp, Sparkles, LayoutDashboard } from 'lucide-react';
import Avatar from '../components/Avatar';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tasks: 0, meetings: 0, members: 0 });
  const [myTasks, setMyTasks] = useState([]);
  const [upNext, setUpNext] = useState([]);
  const [activities, setActivities] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ onTime: 0, late: 0, absent: 0, total: 0, rate: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/workspaces');
      if (res.data.length > 0) {
        const ws = res.data[0];
        setWorkspace(ws);
        const [tasksRes, meetingsRes, attendanceRes] = await Promise.all([
          axios.get('/tasks').catch(() => ({ data: [] })),
          axios.get(`/workspaces/${ws._id}/meetings`).catch(() => ({ data: [] })),
          axios.get(`/workspaces/${ws._id}/attendance`).catch(() => ({ data: [] }))
        ]);
        const tasks = tasksRes.data || [];
        const meetings = meetingsRes.data || [];
        const attendance = attendanceRes.data || [];
        
        setMyTasks(tasks.filter(t => t.status !== 'completed'));
        const todayStr = new Date().toISOString().split('T')[0];
        const todayMeetings = meetings.filter(m => m.date && new Date(m.date).toISOString().split('T')[0] === todayStr);
        setUpNext(todayMeetings.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
        
        // Calculate My Attendance Stats (Current Month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let workingDays = 0;
        for (let d = 1; d <= now.getDate(); d++) {
          const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
        }
        
        const myAttendance = attendance.filter(a => {
          if (a.user?._id && a.user._id !== user._id && a.user !== user._id) return false;
          if (!a.date) return false;
          const aDate = new Date(a.date);
          return aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
        });

        const late = myAttendance.filter(a => a.isLate).length;
        const totalPresent = myAttendance.length;
        const onTime = totalPresent - late;
        const absent = Math.max(0, workingDays - totalPresent);
        const rate = workingDays > 0 ? Math.round((totalPresent / workingDays) * 100) : 100;
        
        setAttendanceStats({ onTime, late, absent, total: workingDays, rate });

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
        setStats({ tasks: tasks.filter(t => t.status !== 'completed').length || 0, meetings: todayMeetings.length || 0, members: ws.members?.length || 1 });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-bg-primary">
      <div className="w-10 h-10 border-[4px] border-border border-t-accent-blue dark:border-t-accent-blue rounded-full animate-spin shadow-lg"></div>
    </div>
  );

  if (!workspace) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-bg-primary">
      <div className="bg-bg-secondary p-8 rounded-3xl shadow-soft border border-border max-w-md w-full glass">
        <LayoutDashboard size={48} className="text-text-secondary mb-4 opacity-40 mx-auto" />
        <h2 className="text-2xl font-bold text-text-primary mb-2 font-outfit">No Workspace Found</h2>
        <p className="text-text-secondary text-sm">Please contact your administrator to get assigned to a workspace.</p>
      </div>
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
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-indigo dark:from-blue-400 dark:to-purple-500">{user?.name?.split(' ')[0]}</span>.
            </h1>
          </div>

          {/* Workspace badge with glassmorphism */}
          <div className="flex items-center gap-3 bg-bg-secondary/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl px-5 py-3 shadow-soft hover:shadow-hover transition-all duration-300 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <img src="/Madhura-logo.webp" alt="Logo" className="w-full h-full object-contain p-1.5"
                onError={e => { e.target.style.display='none'; e.target.parentElement.textContent = workspace.name.charAt(0); e.target.parentElement.className += " font-bold text-accent-blue text-lg"; }} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">Workspace</p>
              <p className="text-[14px] font-extrabold text-text-primary font-outfit leading-none">{workspace.name}</p>
            </div>
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
                {/* Chart Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="w-full border-b border-border border-dashed h-0"></div>
                  <div className="w-full border-b border-border border-dashed h-0"></div>
                  <div className="w-full border-b border-border border-dashed h-0"></div>
                </div>

                {[
                  { day: 'Mon', val: 30 }, { day: 'Tue', val: 70 },
                  { day: 'Wed', val: 45 }, { day: 'Thu', val: 90 },
                  { day: 'Fri', val: 60 }, { day: 'Sat', val: 20 },
                  { day: 'Sun', val: 40 }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group z-10">
                    <div className="w-full h-full flex items-end relative">
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-bg-primary text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                        {item.val}% Activity
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-accent-indigo to-accent-blue dark:from-accent-blue/80 dark:to-accent-blue rounded-t-xl opacity-80 group-hover:opacity-100 transition-all duration-300"
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
                      const total = attendanceStats.total || 1;
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
                    <span className="text-xs font-bold text-emerald-600 tracking-wide">{attendanceStats.rate}% on-time rate this month</span>
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
    </div>
  );
};

export default Dashboard;
