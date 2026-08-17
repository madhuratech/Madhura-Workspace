import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  BarChart3, TrendingUp, Users, FolderKanban, CheckCircle2,
  Calendar, AlertCircle, Award, ArrowUpRight, Search,
  RefreshCw, CheckSquare, Zap, Target, PieChart, Activity, ChevronDown
} from 'lucide-react';
import {
  PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

// ── Teams-style status badge ──
const STATUS_MAP = {
  Active:  { label: 'Available',      color: '#92C353', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:12,height:12,flexShrink:0}}><circle cx="8" cy="8" r="7.5" fill="#92C353" stroke="#92C353"/><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  Busy:    { label: 'Busy',           color: '#C4314B', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:12,height:12,flexShrink:0}}><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B"/><circle cx="8" cy="8" r="3" fill="white"/></svg> },
  Break:   { label: 'Do not disturb', color: '#C4314B', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:12,height:12,flexShrink:0}}><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B"/><rect x="4" y="7" width="8" height="2" rx="1" fill="white"/></svg> },
  Lunch:   { label: 'Be right back',  color: '#F8B739', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:12,height:12,flexShrink:0}}><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739"/><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  Away:    { label: 'Appear away',    color: '#F8B739', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:12,height:12,flexShrink:0}}><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739"/><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3.5" fill="#605E5C" stroke="white" strokeWidth="1"/><rect x="11" y="11" width="2" height="2" rx="0.5" fill="white"/></svg> },
  Leave:   { label: 'Appear offline', color: '#8A8886', icon: <svg viewBox="0 0 16 16" fill="none" style={{width:12,height:12,flexShrink:0}}><circle cx="8" cy="8" r="7.5" fill="none" stroke="#8A8886" strokeWidth="1.5"/><circle cx="8" cy="8" r="4" fill="#8A8886"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg> },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.Active;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:20, background:`${s.color}15`, border:`1px solid ${s.color}30`, fontSize:11, fontWeight:600, color:s.color, whiteSpace:'nowrap', backdropFilter:'blur(4px)' }}>
      {s.icon}{s.label}
    </span>
  );
};

// ── Recharts Chart Components ──
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-secondary/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
        <p className="text-xs font-bold text-text-primary mb-1">{payload[0].payload.name || payload[0].payload.date}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs font-semibold" style={{ color: entry.color || entry.fill }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Main Component ──
const AnalyticsReports = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'employees', 'projects'
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchAnalytics(selectedWorkspace._id);
    }
  }, [selectedWorkspace]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/workspaces');
      setWorkspaces(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedWorkspace(res.data[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      showToast('Failed to load workspace data', 'error');
      setLoading(false);
    }
  };

  const fetchAnalytics = async (workspaceId, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await axios.get(`/workspaces/${workspaceId}/analytics`);
      setAnalyticsData(res.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('Could not load analytics reports', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getProductivityBadge = (score) => {
    if (score >= 90) return { label: 'Elite', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]', icon: Award };
    if (score >= 75) return { label: 'High Performing', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]', icon: Zap };
    if (score >= 60) return { label: 'On Track', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]', icon: Target };
    return { label: 'Needs Attention', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]', icon: AlertCircle };
  };

  const formatInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading && !analyticsData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px] bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <p className="text-sm font-semibold text-text-secondary tracking-wide">Compiling Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!selectedWorkspace || !analyticsData) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center h-full flex flex-col justify-center items-center bg-bg-primary">
        <div className="bg-bg-secondary/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-12 max-w-lg shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-br from-bg-primary to-bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/5">
            <BarChart3 size={40} className="text-text-secondary/50" />
          </div>
          <h3 className="text-2xl font-black text-text-primary mb-3 font-outfit">No Analytics Available</h3>
          <p className="text-sm text-text-secondary mb-8 leading-relaxed">Workspace intelligence cannot be generated at this time. Please join or create an active workspace to unlock reporting.</p>
        </div>
      </div>
    );
  }

  const { summary, taskProgress, attendanceTrends, employeePerformance, projectsPerformance } = analyticsData;
  const filteredEmployees = (employeePerformance || []).filter(emp =>
    emp.role !== 'super_admin' && (
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Data for Recharts
  const taskChartData = [
    { name: 'Completed', value: taskProgress.byStatus['Done'] || 0, color: '#10B981' }, // Emerald
    { name: 'In Progress', value: taskProgress.byStatus['In Progress'] || 0, color: '#3B82F6' }, // Blue
    { name: 'Pending', value: taskProgress.byStatus['To Do'] || 0, color: '#64748B' }, // Slate
  ].filter(d => d.value > 0);

  const hasTaskData = taskChartData.length > 0;

  const attendanceChartData = (attendanceTrends.dailyTrend || []).map(day => ({
    date: day.date.slice(5),
    Present: day.present,
    Absent: day.absent
  }));

  return (
    <div className="p-6 md:p-8 w-full h-full bg-bg-primary overflow-y-auto custom-scrollbar flex flex-col font-sans relative">
      
      {/* Absolute Decorative Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[30%] bg-accent-blue/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto w-full space-y-8 relative z-10">
        
        {/* Top Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-accent-blue/20 text-accent-blue uppercase tracking-widest border border-accent-blue/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                Live Intelligence
              </span>
              {workspaces.length > 1 && (
                <div className="relative inline-block">
                  <select
                    className="appearance-none bg-bg-secondary/60 backdrop-blur-md text-text-primary text-xs font-bold px-4 py-1.5 pr-8 rounded-full border border-white/10 outline-none cursor-pointer hover:border-white/20 transition-colors shadow-sm"
                    value={selectedWorkspace._id}
                    onChange={(e) => {
                      const ws = workspaces.find(w => w._id === e.target.value);
                      if (ws) setSelectedWorkspace(ws);
                    }}
                  >
                    {workspaces.map(w => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight flex items-center gap-4 font-outfit drop-shadow-md">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-transparent border border-accent-blue/20">
                <BarChart3 className="text-accent-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" size={32} strokeWidth={2.5} />
              </div>
              Command Center
            </h1>
            <p className="text-sm text-text-secondary mt-2 max-w-xl leading-relaxed">
              Real-time telemetry on workforce productivity, active project trajectories, and daily attendance trends.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchAnalytics(selectedWorkspace._id, true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-white/10 to-transparent hover:from-white/15 text-text-primary rounded-full border border-white/10 text-sm font-bold transition-all duration-300 shadow-lg backdrop-blur-md disabled:opacity-50 group"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-accent-blue' : 'text-text-secondary group-hover:text-white transition-colors'} strokeWidth={2.5} />
              {refreshing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-bg-secondary/40 backdrop-blur-xl border border-white/5 rounded-2xl w-fit mx-auto md:mx-0 shadow-inner">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }`}
          >
            <PieChart size={18} strokeWidth={2.5} />
            Telemetry
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === 'employees'
                ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }`}
          >
            <Users size={18} strokeWidth={2.5} />
            Workforce ({employeePerformance?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === 'projects'
                ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }`}
          >
            <FolderKanban size={18} strokeWidth={2.5} />
            Projects ({projectsPerformance?.length || 0})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & TRENDS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="relative overflow-hidden bg-bg-secondary/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 shadow-2xl group hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Task Velocity</span>
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-emerald-500/20">
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-white font-outfit tracking-tighter">{summary.completionRate}%</span>
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                      <ArrowUpRight size={12} strokeWidth={3} /> Live
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-text-secondary/70 mt-2">Overall completion of {summary.totalTasks} tasks</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="relative overflow-hidden bg-bg-secondary/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 shadow-2xl group hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Avg Presence</span>
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-blue-500/20">
                    <Calendar size={20} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-white font-outfit tracking-tighter">{summary.overallAttendanceRate}%</span>
                    <span className="text-xs font-extrabold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      Monthly
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-text-secondary/70 mt-2">Attendance retention rate</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="relative overflow-hidden bg-bg-secondary/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 shadow-2xl group hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-colors pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Critical Alerts</span>
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] border border-rose-500/20">
                    <AlertCircle size={20} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-white font-outfit tracking-tighter">{summary.overdueTasks}</span>
                    <span className="text-xs font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      Overdue
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-text-secondary/70 mt-2">Tasks past deadline</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="relative overflow-hidden bg-bg-secondary/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 shadow-2xl group hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Capacity</span>
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] border border-purple-500/20">
                    <Users size={20} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-white font-outfit tracking-tighter">{summary.totalMembers}</span>
                    <span className="text-xs font-extrabold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-text-secondary/70 mt-2">Spanning {summary.totalProjects} projects</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Donut Task Progress */}
              <div className="bg-bg-secondary/30 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 shadow-2xl flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 font-outfit drop-shadow-sm">
                      Workflow Trajectory
                    </h3>
                    <p className="text-xs text-text-secondary/80 font-medium mt-1">Live distribution of active tasks</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary">
                    <CheckSquare size={18} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] relative">
                  {!hasTaskData ? (
                    <div className="text-center text-text-secondary/70 text-sm font-semibold">No task data to visualize</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                          <Pie
                            data={taskChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={6}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={8}
                          >
                            {taskChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      {/* Center text for donut */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-white font-outfit">{summary.totalTasks}</span>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Tasks</span>
                      </div>
                    </>
                  )}
                </div>

                {hasTaskData && (
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-6 border-t border-white/5">
                    {taskChartData.map((stat, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-default">
                        <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: stat.color, boxShadow: `0 0 8px ${stat.color}` }}></span>
                        <span className="text-xl font-bold text-white font-outfit">{stat.value}</span>
                        <span className="text-[10px] font-bold text-text-secondary uppercase">{stat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chart 2: Area Attendance Trends */}
              <div className="bg-bg-secondary/30 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 shadow-2xl flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 font-outfit drop-shadow-sm">
                      Presence Analytics
                    </h3>
                    <p className="text-xs text-text-secondary/80 font-medium mt-1">Rolling attendance volume over time</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary">
                    <Activity size={18} />
                  </div>
                </div>

                <div className="flex-1 min-h-[250px] w-full">
                  {attendanceChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-text-secondary/70 text-sm font-semibold">No attendance history available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={attendanceChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} dx={-10} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                        <Area type="monotone" dataKey="Present" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Present</span>
                    <span className="text-xl font-black text-emerald-400 font-outfit">{attendanceTrends.summary.Present || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Total Absent</span>
                    <span className="text-xl font-black text-rose-400 font-outfit">{attendanceTrends.summary.Absent || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EMPLOYEE PERFORMANCE & PRODUCTIVITY */}
        {activeTab === 'employees' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-bg-secondary/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl">
              <div>
                <h3 className="text-xl font-black text-white font-outfit">Workforce Registry</h3>
                <p className="text-xs text-text-secondary/80 font-medium mt-1">Live telemetry of individual contributor performance metrics.</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/70" size={16} />
                <input
                  type="text"
                  placeholder="Filter by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/20 backdrop-blur-md text-white text-sm font-semibold pl-11 pr-4 py-3 rounded-2xl border border-white/10 outline-none focus:border-accent-blue/50 focus:bg-black/40 transition-all placeholder-white/30 shadow-inner"
                />
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="bg-bg-secondary/30 backdrop-blur-xl border border-white/10 rounded-[2rem] p-16 text-center shadow-2xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Search size={24} className="text-text-secondary" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">No matching personnel</h4>
                <p className="text-sm text-text-secondary/70">Adjust your filter criteria to find specific members.</p>
              </div>
            ) : (
              <div className="bg-bg-secondary/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-black/20 border-b border-white/10">
                        <th className="py-5 px-6 text-[10px] font-black text-text-secondary uppercase tracking-widest">Personnel</th>
                        <th className="py-5 px-4 text-center text-[10px] font-black text-text-secondary uppercase tracking-widest">Clearance / Status</th>
                        <th className="py-5 px-4 text-center text-[10px] font-black text-text-secondary uppercase tracking-widest">Output</th>
                        <th className="py-5 px-4 text-center text-[10px] font-black text-text-secondary uppercase tracking-widest">Delays</th>
                        <th className="py-5 px-4 text-center text-[10px] font-black text-text-secondary uppercase tracking-widest">Presence</th>
                        <th className="py-5 px-6 text-right text-[10px] font-black text-text-secondary uppercase tracking-widest">Net Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredEmployees.map((emp, idx) => {
                        const badge = getProductivityBadge(emp.productivityScore);
                        const Icon = badge.icon;

                        return (
                          <tr key={emp._id || idx} className="hover:bg-white/[0.04] transition-colors group">
                            
                            {/* Employee Info */}
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-4">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-accent-indigo/80 to-accent-blue/80 flex items-center justify-center font-black text-white shadow-lg text-sm shrink-0 border border-white/20 group-hover:scale-105 transition-transform">
                                  {formatInitials(emp.name)}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-sm">{emp.name}</p>
                                  <p className="text-[11px] font-medium text-text-secondary/80 mt-0.5">{emp.designation || emp.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Role & Presence */}
                            <td className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black capitalize bg-white/5 text-text-secondary border border-white/10 tracking-wider shadow-inner">
                                  {emp.role?.replace('_', ' ') || 'Employee'}
                                </span>
                                <StatusBadge status={emp.presenceStatus || 'Active'} />
                              </div>
                            </td>

                            {/* Tasks Completed */}
                            <td className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-lg font-black text-white font-outfit">
                                  {emp.tasks.completed} <span className="text-sm text-text-secondary/50 font-sans">/ {emp.tasks.assigned}</span>
                                </span>
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                                  {emp.tasks.completionRate}% Rate
                                </span>
                              </div>
                            </td>

                            {/* Overdue Tasks */}
                            <td className="py-4 px-4 text-center">
                              {emp.tasks.overdue > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                                  <AlertCircle size={14} strokeWidth={2.5} /> {emp.tasks.overdue}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-text-secondary/70 border border-white/5">
                                  <CheckCircle2 size={14} /> Zero
                                </span>
                              )}
                            </td>

                            {/* Attendance */}
                            <td className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-base font-black text-white font-outfit">{emp.attendance.rate}%</span>
                                <span className="text-[10px] text-text-secondary/70 font-bold tracking-widest uppercase mt-0.5">
                                  {emp.attendance.present}P {emp.attendance.absent}A
                                </span>
                              </div>
                            </td>

                            {/* Productivity Score */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badge.color}`}>
                                    <Icon size={12} strokeWidth={2.5} />
                                    {badge.label}
                                  </span>
                                  <span className="text-2xl font-black text-white font-outfit w-12 text-right tracking-tighter">
                                    {emp.productivityScore}
                                  </span>
                                </div>
                                <div className="w-32 h-2 bg-black/30 rounded-full overflow-hidden shadow-inner p-0.5">
                                  <div
                                    style={{ width: `${emp.productivityScore}%` }}
                                    className={`h-full rounded-full shadow-lg ${emp.productivityScore >= 75 ? 'bg-accent-blue' : emp.productivityScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROJECTS MILESTONES & PERFORMANCE */}
        {activeTab === 'projects' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="bg-bg-secondary/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
              <div>
                <h3 className="text-xl font-black text-white font-outfit">Active Operations</h3>
                <p className="text-xs text-text-secondary/80 font-medium mt-1">Cross-project velocity, milestone tracking, and delivery timelines.</p>
              </div>
              <span className="text-xs font-black text-accent-blue bg-accent-blue/10 px-4 py-2 rounded-xl border border-accent-blue/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] uppercase tracking-wider">
                {projectsPerformance?.length || 0} Registered Projects
              </span>
            </div>

            {(!projectsPerformance || projectsPerformance.length === 0) ? (
              <div className="bg-bg-secondary/30 backdrop-blur-xl border border-white/10 rounded-[2rem] p-16 text-center shadow-2xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <FolderKanban size={24} className="text-text-secondary" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">No Active Projects</h4>
                <p className="text-sm text-text-secondary/70">Project telemetry will populate once teams begin operations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectsPerformance.map((proj) => (
                  <div key={proj._id} className="relative overflow-hidden bg-bg-secondary/40 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-300 rounded-[2rem] p-7 shadow-2xl flex flex-col justify-between group hover:-translate-y-1">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent-blue/5 rounded-full blur-3xl group-hover:bg-accent-blue/10 transition-colors pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 text-white flex items-center justify-center font-bold shadow-lg">
                          <FolderKanban size={22} strokeWidth={2} />
                        </div>
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                          proj.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                        }`}>
                          {proj.status}
                        </span>
                      </div>

                      <h4 className="text-xl font-bold text-white mb-1.5 line-clamp-1 group-hover:text-accent-blue transition-colors font-outfit drop-shadow-sm">
                        {proj.title}
                      </h4>
                      <p className="text-xs text-text-secondary/70 line-clamp-2 mb-8 h-8 leading-relaxed font-medium">
                        {proj.description || 'No operational specifications provided for this project.'}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-2 mb-6 bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                          <span className="text-text-secondary">Milestone Alpha</span>
                          <span className="text-accent-blue drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{proj.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden shadow-inner">
                          <div
                            style={{ width: `${proj.progress}%` }}
                            className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)] ${proj.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-accent-indigo to-accent-blue'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="pt-5 border-t border-white/10 flex items-center justify-between text-xs font-bold relative z-10">
                      <div className="flex items-center gap-2 text-text-secondary/90 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        <CheckSquare size={14} className="text-emerald-400" strokeWidth={2.5} />
                        <span>{proj.tasksDone} / {proj.tasksCount}</span>
                      </div>

                      {proj.overdue > 0 ? (
                        <span className="text-rose-400 flex items-center gap-1.5 font-black bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]">
                          <AlertCircle size={14} strokeWidth={2.5} /> {proj.overdue} Late
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-black bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">On Track</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsReports;
