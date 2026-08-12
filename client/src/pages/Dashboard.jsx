import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { CalendarDays, Activity, Clock, CheckSquare, ChevronRight, Plus, Users, TrendingUp } from 'lucide-react';
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
        
        // Count working days (Mon-Fri) from 1st of month to today
        let workingDays = 0;
        for (let d = 1; d <= now.getDate(); d++) {
          const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++; // Skip Sunday (0) and Saturday (6)
        }
        
        // Filter my attendance for current month
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
            icon: <CheckSquare size={11} />
          })),
          ...meetings.slice(0, 5).map(m => ({
            id: `meeting-${m._id}`, type: 'meeting',
            title: `Meeting: ${m.title}`,
            time: new Date(m.createdAt || m.date || Date.now()),
            icon: <CalendarDays size={11} />
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
      <div className="w-7 h-7 border-[3px] border-border border-t-accent-blue dark:border-t-[#ffca22] rounded-full animate-spin"></div>
    </div>
  );

  if (!workspace) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-bg-primary">
      <Activity size={28} className="text-text-secondary mb-3 opacity-40" />
      <h2 className="text-lg font-semibold text-text-primary mb-1">No Workspace Found</h2>
      <p className="text-text-secondary text-sm">Contact your administrator.</p>
    </div>
  );

  const statCards = [
    { label: 'Open Tasks', value: stats.tasks, icon: <CheckSquare size={18} />, link: '/my-tasks', color: 'text-[#1b2b4c] dark:text-[#ffca22]', bg: 'bg-[#1b2b4c]/5 dark:bg-[#ffca22]/10' },
    { label: 'Today\'s Meetings', value: stats.meetings, icon: <CalendarDays size={18} />, link: '/meetings', color: 'text-[#1b2b4c] dark:text-[#ffca22]', bg: 'bg-[#1b2b4c]/5 dark:bg-[#ffca22]/10' },
    { label: 'Team Members', value: stats.members, icon: <Users size={18} />, link: '/team', color: 'text-[#1b2b4c] dark:text-[#ffca22]', bg: 'bg-[#1b2b4c]/5 dark:bg-[#ffca22]/10' },
    { label: 'Recent Updates', value: activities.length, icon: <Activity size={18} />, link: '/activity-logs', color: 'text-[#1b2b4c] dark:text-[#ffca22]', bg: 'bg-[#1b2b4c]/5 dark:bg-[#ffca22]/10' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-bg-primary custom-scrollbar">
      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold text-[#1b2b4c]/60 dark:text-[#ffca22]/60 uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">
              {getGreeting()}, <span className="text-[#1b2b4c] dark:text-[#ffca22]">{user?.name?.split(' ')[0]}</span>.
            </h1>
          </div>

          {/* Workspace badge with logo */}
          <div className="flex items-center gap-3 bg-bg-secondary/60 rounded-2xl px-4 py-2.5">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden">
              <img src="/Madhura-logo.webp" alt="Logo" className="w-full h-full object-contain p-1"
                onError={e => { e.target.style.display='none'; e.target.parentElement.textContent = workspace.name.charAt(0); }} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-0.5">Workspace</p>
              <p className="text-[13px] font-extrabold text-[#1b2b4c] dark:text-[#ffca22] leading-none">{workspace.name}</p>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((s, i) => (
            <Link key={i} to={s.link} className="group flex items-center gap-3 p-4 rounded-2xl bg-bg-secondary/50 hover:bg-bg-secondary transition-colors duration-200">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0 ${s.color} group-hover:scale-105 transition-transform duration-200`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-black text-text-primary leading-none">{s.value}</p>
                <p className="text-[10px] font-semibold text-text-secondary mt-0.5 leading-tight">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* LEFT — 7 cols */}
          <div className="lg:col-span-7 space-y-4">

            {/* Weekly Activity Bar Chart */}
            <div className="rounded-2xl bg-bg-secondary/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[12px] font-black text-text-primary uppercase tracking-widest">Activity Overview</h2>
                <span className="text-[10px] font-semibold text-text-secondary bg-bg-primary px-2.5 py-1 rounded-full">This Week</span>
              </div>
              <div className="flex items-end justify-between gap-2" style={{ height: 110 }}>
                {[
                  { day: 'Mon', val: 30 }, { day: 'Tue', val: 70 },
                  { day: 'Wed', val: 45 }, { day: 'Thu', val: 90 },
                  { day: 'Fri', val: 60 }, { day: 'Sat', val: 20 },
                  { day: 'Sun', val: 40 }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
                    <div className="w-full h-full flex items-end">
                      <div
                        className="w-full bg-[#1b2b4c] dark:bg-[#ffca22] rounded-t-lg opacity-80 hover:opacity-100 transition-opacity duration-200"
                        style={{ height: `${item.val}%`, minHeight: 6 }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-text-secondary mt-2 uppercase">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* My Attendance Donut */}
            <div className="rounded-2xl bg-bg-secondary/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[12px] font-black text-text-primary uppercase tracking-widest">My Monthly Attendance</h2>
                <Link to="/attendance" className="text-[10px] font-bold text-[#1b2b4c] dark:text-[#ffca22] hover:underline">View Log</Link>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative shrink-0 w-24 h-24">
                  <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                    {(() => {
                      const total = attendanceStats.total || 1;
                      const onTimePct = (attendanceStats.onTime / total) * 100;
                      const latePct = (attendanceStats.late / total) * 100;
                      const absentPct = (attendanceStats.absent / total) * 100;
                      return (
                        <>
                          {onTimePct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeDasharray={`${onTimePct} ${100 - onTimePct}`} strokeLinecap="round" />}
                          {latePct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray={`${latePct} ${100 - latePct}`} strokeDashoffset={`-${onTimePct}`} strokeLinecap="round" />}
                          {absentPct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray={`${absentPct} ${100 - absentPct}`} strokeDashoffset={`-${onTimePct + latePct}`} strokeLinecap="round" />}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-text-primary">{attendanceStats.total}</span>
                    <span className="text-[9px] font-bold text-text-secondary uppercase">Days</span>
                  </div>
                </div>
                <div className="space-y-2.5 flex-1">
                  {[
                    { label: 'On Time', color: 'bg-emerald-500', val: attendanceStats.onTime },
                    { label: 'Late', color: 'bg-amber-400', val: attendanceStats.late },
                    { label: 'Absent', color: 'bg-red-400', val: attendanceStats.absent },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${r.color}`}></span>
                        <span className="text-xs font-semibold text-text-secondary">{r.label}</span>
                      </div>
                      <span className="text-sm font-black text-text-primary">{r.val}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    <TrendingUp size={11} className="text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600">{attendanceStats.rate}% on-time rate this month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* My Priorities */}
            <div className="rounded-2xl bg-bg-secondary/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[12px] font-black text-text-primary uppercase tracking-widest">My Priorities</h2>
                <Link to="/my-tasks" className="text-[10px] font-bold text-[#1b2b4c] dark:text-[#ffca22] hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {myTasks.length === 0 ? (
                  <p className="text-sm font-semibold text-text-secondary text-center py-6">No pending tasks. You're all caught up! 🎉</p>
                ) : myTasks.slice(0, 5).map(task => (
                  <Link to="/my-tasks" key={task._id}
                    className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-bg-primary transition-colors duration-150 group">
                    <div className="w-5 h-5 rounded-md border-2 border-border group-hover:border-[#1b2b4c] dark:group-hover:border-[#ffca22] shrink-0 transition-colors"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          task.priority?.toLowerCase() === 'high' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' :
                          task.priority?.toLowerCase() === 'medium' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' :
                          'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                        }`}>{task.priority || 'Low'}</span>
                        <span className="text-[10px] text-text-secondary flex items-center gap-1">
                          <Clock size={9} />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Soon'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — 5 cols */}
          <div className="lg:col-span-5 space-y-4">

            {/* Quick Actions */}
            <div className="rounded-2xl bg-bg-secondary/50 p-5">
              <h2 className="text-[12px] font-black text-text-primary uppercase tracking-widest mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { to: '/my-tasks', icon: <Plus size={20} />, label: 'Create Task' },
                  { to: '/meetings', icon: <CalendarDays size={20} />, label: 'Schedule' },
                ].map((a, i) => (
                  <Link key={i} to={a.to}
                    className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-bg-primary hover:bg-[#1b2b4c] dark:hover:bg-[#ffca22] group transition-colors duration-200">
                    <span className="text-text-secondary group-hover:text-white dark:group-hover:text-[#1b2b4c] transition-colors">{a.icon}</span>
                    <span className="text-[12px] font-bold text-text-secondary group-hover:text-white dark:group-hover:text-[#1b2b4c] transition-colors">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Up Next */}
            <div className="rounded-2xl bg-bg-secondary/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[12px] font-black text-text-primary uppercase tracking-widest">Up Next</h2>
                <Link to="/meetings" className="text-[10px] font-bold text-[#1b2b4c] dark:text-[#ffca22] hover:underline">Open Calendar</Link>
              </div>
              <div className="space-y-2">
                {upNext.length === 0 ? (
                  <p className="text-sm font-semibold text-text-secondary text-center py-6">No meetings today.</p>
                ) : upNext.map(m => (
                  <Link to="/meetings" key={m._id}
                    className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-bg-primary transition-colors duration-150 group">
                    <div className="text-center shrink-0 w-14">
                      <p className="text-[15px] font-black text-text-primary group-hover:text-[#1b2b4c] dark:group-hover:text-[#ffca22] transition-colors">{m.startTime || '10:00'}</p>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase">AM</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate">{m.title}</p>
                      <p className="text-[10px] text-text-secondary flex items-center gap-1 mt-0.5">
                        <Users size={9} /> {m.participants?.length || 2} attendees
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Workspace Activity */}
            <div className="rounded-2xl bg-bg-secondary/50 p-5">
              <h2 className="text-[12px] font-black text-text-primary uppercase tracking-widest mb-4">Workspace Activity</h2>
              {activities.length === 0 ? (
                <p className="text-sm font-semibold text-text-secondary text-center py-6">No recent activity.</p>
              ) : (
                <div className="space-y-1">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-bg-primary transition-colors duration-150 group">
                      <div className="w-7 h-7 rounded-lg bg-[#1b2b4c]/10 dark:bg-[#ffca22]/10 flex items-center justify-center shrink-0 text-[#1b2b4c] dark:text-[#ffca22] mt-0.5">
                        {act.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-text-primary leading-snug">{act.title}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-1">
                          <Clock size={9} />
                          {act.time.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
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
