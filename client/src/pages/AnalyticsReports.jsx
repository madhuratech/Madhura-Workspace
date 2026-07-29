import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  BarChart3, TrendingUp, Users, FolderKanban, CheckCircle2, Clock,
  Calendar, AlertCircle, Award, ArrowUpRight, ArrowDownRight, Search,
  RefreshCw, FileText, ChevronDown, CheckSquare, Zap, Target, PieChart
} from 'lucide-react';

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
    if (score >= 90) return { label: 'Elite', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: Award };
    if (score >= 75) return { label: 'High Performing', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30', icon: Zap };
    if (score >= 60) return { label: 'On Track', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: Target };
    return { label: 'Needs Attention', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: AlertCircle };
  };

  const formatInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading && !analyticsData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-text-secondary">Generating live analytical reports...</p>
        </div>
      </div>
    );
  }

  if (!selectedWorkspace || !analyticsData) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center">
        <div className="bg-bg-card border border-white/5 rounded-3xl p-12 max-w-md mx-auto shadow-xl">
          <BarChart3 size={48} className="text-text-secondary/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary mb-2">No Analytics Available</h3>
          <p className="text-sm text-text-secondary mb-6">Please join or create a workspace to view reports and team performance.</p>
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

  return (
    <div className="absolute inset-6 flex flex-col font-sans bg-transparent">
      
      {/* Top Header & Controls */}
      <div className="relative mb-8 p-6 rounded-3xl overflow-hidden bg-gradient-to-r from-bg-secondary to-bg-primary border border-border/50 shadow-[0_0_40px_rgba(0,0,0,0.03)] z-10 shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shadow-sm uppercase tracking-widest">
                Live Reports
              </span>
              {workspaces.length > 1 && (
                <div className="relative inline-block">
                  <select
                    className="bg-bg-primary/50 backdrop-blur-md text-text-primary text-xs font-bold px-4 py-1.5 rounded-xl border border-border/50 outline-none cursor-pointer focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 transition-all shadow-sm"
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
                </div>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary tracking-tight flex items-center gap-3 font-outfit mt-2">
              Analytics & Reports Dashboard
            </h1>
            <p className="text-sm text-text-secondary mt-1.5 font-medium">
              Comprehensive track of employee productivity, project milestones, and attendance trends.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAnalytics(selectedWorkspace._id, true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-bg-primary/50 backdrop-blur-md hover:bg-bg-primary text-text-primary rounded-xl border border-border/50 text-sm font-bold transition-all duration-300 shadow-sm disabled:opacity-50 group hover:shadow-md hover:border-accent-blue/30"
            >
              <RefreshCw size={18} className={`${refreshing ? 'animate-spin text-accent-blue' : 'text-text-secondary group-hover:text-accent-blue transition-colors'}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Navigation Tabs */}
        <div className="flex bg-bg-secondary/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 shadow-sm w-max mb-6 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-md transform -translate-y-0.5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'
            }`}
          >
            <PieChart size={18} />
            Overview & Trends
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'employees'
                ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-md transform -translate-y-0.5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'
            }`}
          >
            <Users size={18} />
            Employee Performance ({employeePerformance?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-md transform -translate-y-0.5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'
            }`}
          >
            <FolderKanban size={18} />
            Project Milestones ({projectsPerformance?.length || 0})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 pr-2">
          {/* TAB 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-[0_5px_30px_rgba(0,0,0,0.05)] flex flex-col justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest">Task Completion</span>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <div className="mt-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-text-primary font-outfit">{summary.completionRate}%</span>
                  <span className="text-xs font-bold text-emerald-500 flex items-center bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <ArrowUpRight size={14} className="mr-0.5" /> Live Rate
                  </span>
                </div>
                <p className="text-sm font-medium text-text-secondary mt-2">Of {summary.totalTasks} total workspace tasks</p>
              </div>
            </div>

            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-[0_5px_30px_rgba(0,0,0,0.05)] flex flex-col justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest">Attendance Trend</span>
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                  <Calendar size={24} />
                </div>
              </div>
              <div className="mt-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-text-primary font-outfit">{summary.overallAttendanceRate}%</span>
                  <span className="text-xs font-bold text-blue-500 flex items-center bg-blue-500/10 px-2 py-0.5 rounded-md">Avg Presence</span>
                </div>
                <p className="text-sm font-medium text-text-secondary mt-2">Present vs Absent logs</p>
              </div>
            </div>

            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-[0_5px_30px_rgba(0,0,0,0.05)] flex flex-col justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-colors pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest">Overdue Alerts</span>
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform shadow-sm">
                  <AlertCircle size={24} />
                </div>
              </div>
              <div className="mt-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-rose-500 font-outfit">{summary.overdueTasks}</span>
                  <span className="text-xs font-bold text-rose-500 flex items-center bg-rose-500/10 px-2 py-0.5 rounded-md">Delayed</span>
                </div>
                <p className="text-sm font-medium text-text-secondary mt-2">Tasks past scheduled due date</p>
              </div>
            </div>

            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-[0_5px_30px_rgba(0,0,0,0.05)] flex flex-col justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-colors pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest">Team Strength</span>
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform shadow-sm">
                  <Users size={24} />
                </div>
              </div>
              <div className="mt-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-text-primary font-outfit">{summary.totalMembers}</span>
                  <span className="text-xs font-bold text-purple-500 flex items-center bg-purple-500/10 px-2 py-0.5 rounded-md">Active Members</span>
                </div>
                <p className="text-sm font-medium text-text-secondary mt-2">Across {summary.totalProjects} active projects</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Task Progress & Status Breakdown */}
            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-[0_5px_30px_rgba(0,0,0,0.05)] space-y-8 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-accent-blue/10 transition-colors"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary flex items-center gap-3 font-outfit">
                    <div className="p-2 bg-accent-blue/10 rounded-xl text-accent-blue shadow-sm"><CheckSquare size={20} /></div>
                    Task Progress Distribution
                  </h3>
                  <p className="text-sm font-medium text-text-secondary mt-1">Breakdown by current workflow stage</p>
                </div>
                <span className="text-sm font-extrabold text-accent-blue px-4 py-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20 shadow-sm">
                  {summary.totalTasks} Tasks
                </span>
              </div>

              {summary.totalTasks === 0 ? (
                <div className="p-12 text-center text-text-secondary font-medium relative z-10 bg-bg-primary/50 rounded-2xl border border-border/50">No tasks assigned in this workspace yet.</div>
              ) : (
                <div className="space-y-8 relative z-10">
                  {/* Visual Multi-Segment Bar */}
                  <div className="space-y-4">
                    <div className="h-6 w-full bg-bg-primary/80 rounded-full overflow-hidden flex gap-1 p-1 shadow-inner border border-border/50">
                      <div
                        style={{ width: `${(taskProgress.byStatus['Done'] / summary.totalTasks) * 100}%` }}
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        title="Done"
                      />
                      <div
                        style={{ width: `${(taskProgress.byStatus['In Progress'] / summary.totalTasks) * 100}%` }}
                        className="bg-blue-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        title="In Progress"
                      />
                      <div
                        style={{ width: `${(taskProgress.byStatus['To Do'] / summary.totalTasks) * 100}%` }}
                        className="bg-slate-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(100,116,139,0.5)]"
                        title="To Do"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-extrabold uppercase tracking-widest">
                      <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">Done ({Math.round((taskProgress.byStatus['Done'] / summary.totalTasks) * 100 || 0)}%)</span>
                      <span className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">In Progress ({Math.round((taskProgress.byStatus['In Progress'] / summary.totalTasks) * 100 || 0)}%)</span>
                      <span className="text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md">To Do ({Math.round((taskProgress.byStatus['To Do'] / summary.totalTasks) * 100 || 0)}%)</span>
                    </div>
                  </div>

                  {/* Individual Status Bars */}
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center shadow-sm transform hover:-translate-y-1 transition-transform">
                      <span className="text-3xl font-black text-emerald-500 font-outfit">{taskProgress.byStatus['Done'] || 0}</span>
                      <p className="text-[11px] font-extrabold text-emerald-500/70 mt-1 uppercase tracking-widest">Completed</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center shadow-sm transform hover:-translate-y-1 transition-transform">
                      <span className="text-3xl font-black text-blue-500 font-outfit">{taskProgress.byStatus['In Progress'] || 0}</span>
                      <p className="text-[11px] font-extrabold text-blue-500/70 mt-1 uppercase tracking-widest">In Progress</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-center shadow-sm transform hover:-translate-y-1 transition-transform">
                      <span className="text-3xl font-black text-slate-400 font-outfit">{taskProgress.byStatus['To Do'] || 0}</span>
                      <p className="text-[11px] font-extrabold text-slate-400/70 mt-1 uppercase tracking-widest">Pending</p>
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="pt-6 bg-bg-primary/30 p-5 rounded-2xl border border-border/50">
                    <h4 className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest mb-4">By Priority Level</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-3 font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-lg w-max">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span> High Priority
                        </span>
                        <span className="font-extrabold text-text-primary">{taskProgress.byPriority['High'] || 0} tasks</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-3 font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-lg w-max">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span> Medium Priority
                        </span>
                        <span className="font-extrabold text-text-primary">{taskProgress.byPriority['Medium'] || 0} tasks</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-3 font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg w-max">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> Low Priority
                        </span>
                        <span className="font-extrabold text-text-primary">{taskProgress.byPriority['Low'] || 0} tasks</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Attendance Trends & Rate */}
            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-[0_5px_30px_rgba(0,0,0,0.05)] space-y-8 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary flex items-center gap-3 font-outfit">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shadow-sm"><TrendingUp size={20} /></div>
                    Attendance Trends
                  </h3>
                  <p className="text-sm font-medium text-text-secondary mt-1">Workforce presence and availability logs</p>
                </div>
                <span className="text-sm font-extrabold text-emerald-500 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                  {summary.overallAttendanceRate}% Rate
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 relative z-10">
                <div className="p-5 rounded-2xl bg-bg-primary/50 border border-border/50 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[11px] font-extrabold text-text-secondary mb-2 uppercase tracking-widest">Present</span>
                  <span className="text-3xl font-black text-emerald-500 font-outfit">{attendanceTrends.summary.Present || 0}</span>
                </div>
                <div className="p-5 rounded-2xl bg-bg-primary/50 border border-border/50 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[11px] font-extrabold text-text-secondary mb-2 uppercase tracking-widest">Half-Day</span>
                  <span className="text-3xl font-black text-amber-500 font-outfit">{attendanceTrends.summary['Half-Day'] || 0}</span>
                </div>
                <div className="p-5 rounded-2xl bg-bg-primary/50 border border-border/50 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[11px] font-extrabold text-text-secondary mb-2 uppercase tracking-widest">Absent</span>
                  <span className="text-3xl font-black text-rose-500 font-outfit">{attendanceTrends.summary.Absent || 0}</span>
                </div>
              </div>

              {/* Daily Trend Visual Chart */}
              <div className="pt-4 relative z-10">
                <h4 className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest mb-6">Recent Daily Presence Activity</h4>
                
                {(!attendanceTrends.dailyTrend || attendanceTrends.dailyTrend.length === 0) ? (
                  <div className="p-10 bg-bg-primary/50 rounded-2xl border border-border/50 text-center text-sm font-medium text-text-secondary">
                    No historical attendance logs recorded for recent dates yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="h-40 flex items-end justify-between gap-3 pt-6 pb-3 px-3 border-b border-border/50 bg-bg-primary/20 rounded-2xl">
                      {attendanceTrends.dailyTrend.map((day, idx) => {
                        const totalDay = (day.present + day.absent + day.halfDay) || 1;
                        const presentHeight = Math.max(15, Math.min(100, Math.round((day.present / totalDay) * 100)));
                        
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-10 bg-bg-secondary border border-border/50 text-text-primary text-[11px] font-extrabold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl transform group-hover:-translate-y-1">
                              {day.date}: {day.present} Present / {day.absent} Absent
                            </div>
                            <div className="w-full max-w-[32px] bg-bg-primary rounded-t-xl h-full flex flex-col justify-end overflow-hidden border border-border/30 shadow-inner">
                              <div
                                style={{ height: `${presentHeight}%` }}
                                className="bg-gradient-to-t from-blue-600 to-accent-blue w-full rounded-t-lg transition-all duration-700 group-hover:brightness-125 shadow-[0_-5px_15px_rgba(59,130,246,0.5)]"
                              />
                            </div>
                            <span className="text-[10px] text-text-secondary font-bold truncate max-w-[40px] uppercase">
                              {day.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-text-secondary px-3">
                      <span className="bg-bg-primary/50 px-3 py-1.5 rounded-lg border border-border/30">Timeline: Last {attendanceTrends.dailyTrend.length} recorded days</span>
                      <span className="flex items-center gap-2 text-accent-blue bg-accent-blue/10 px-3 py-1.5 rounded-lg border border-accent-blue/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span> Present Proportion
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEE PERFORMANCE & PRODUCTIVITY */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-secondary/60 backdrop-blur-md border border-border/50 p-6 rounded-3xl shadow-sm">
            <div>
              <h3 className="text-lg font-extrabold text-text-primary font-outfit">Workforce Productivity Scoreboard</h3>
              <p className="text-sm font-medium text-text-secondary mt-1">Real-time performance ranking based on tasks completion, deadline adherence, and attendance.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search employee or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-primary border border-border/50 text-text-primary text-sm font-bold pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-accent-blue focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all"
              />
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-16 text-center text-sm font-medium text-text-secondary">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              No employees found matching your filter criteria.
            </div>
          ) : (
            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-[0_5px_30px_rgba(0,0,0,0.05)]">
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-primary/30 backdrop-blur-md text-[11px] font-extrabold text-text-secondary uppercase tracking-widest">
                      <th className="py-4 px-6 rounded-tl-xl">Employee</th>
                      <th className="py-4 px-4 text-center">Role / Status</th>
                      <th className="py-4 px-4 text-center">Tasks Done</th>
                      <th className="py-4 px-4 text-center">Overdue</th>
                      <th className="py-4 px-4 text-center">Attendance</th>
                      <th className="py-4 px-6 text-right rounded-tr-xl">Productivity Score</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {filteredEmployees.map((emp, idx) => {
                      const badge = getProductivityBadge(emp.productivityScore);
                      const Icon = badge.icon;

                      return (
                        <tr key={emp._id || idx} className="hover:bg-bg-primary/50 transition-colors border-b border-border/30 group">
                          
                          {/* Employee Info */}
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-blue to-purple-500 flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0 group-hover:scale-110 transition-transform">
                                {formatInitials(emp.name)}
                              </div>
                              <div>
                                <p className="font-extrabold text-text-primary text-base font-outfit">{emp.name}</p>
                                <p className="text-xs font-semibold text-text-secondary mt-0.5">{emp.designation || emp.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role & Presence */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest bg-bg-primary border border-border/50 text-text-primary shadow-sm">
                                {emp.role?.replace('_', ' ') || 'Employee'}
                              </span>
                              <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5 bg-bg-primary/50 px-2 py-0.5 rounded-md">
                                <span className={`w-2 h-2 rounded-full ${emp.presenceStatus === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></span>
                                {emp.presenceStatus || 'Active'}
                              </span>
                            </div>
                          </td>

                          {/* Tasks Completed */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center bg-bg-primary/30 p-2 rounded-xl border border-border/30">
                              <span className="font-black text-text-primary text-base font-outfit">
                                {emp.tasks.completed} / {emp.tasks.assigned}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 mt-1">
                                {emp.tasks.completionRate}% Rate
                              </span>
                            </div>
                          </td>

                          {/* Overdue Tasks */}
                          <td className="py-4 px-4 text-center">
                            {emp.tasks.overdue > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-sm">
                                {emp.tasks.overdue} Delayed
                              </span>
                            ) : (
                              <span className="text-[11px] font-extrabold uppercase tracking-widest text-text-secondary/60 bg-bg-primary px-3 py-1.5 rounded-lg border border-border/30 shadow-sm">On Time</span>
                            )}
                          </td>

                          {/* Attendance */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center bg-bg-primary/30 p-2 rounded-xl border border-border/30">
                              <span className="font-black text-text-primary text-base font-outfit">{emp.attendance.rate}%</span>
                              <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest mt-1">
                                {emp.attendance.present}P / {emp.attendance.absent}A
                              </span>
                            </div>
                          </td>

                          {/* Productivity Score */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${badge.color}`}>
                                  <Icon size={14} />
                                  {badge.label}
                                </span>
                                <span className="text-2xl font-black text-text-primary font-outfit w-12 text-right">
                                  {emp.productivityScore}
                                </span>
                              </div>
                              <div className="w-32 h-2 bg-bg-primary rounded-full overflow-hidden shadow-inner border border-border/30">
                                <div
                                  style={{ width: `${emp.productivityScore}%` }}
                                  className={`h-full rounded-full transition-all duration-1000 shadow-sm ${emp.productivityScore >= 75 ? 'bg-gradient-to-r from-blue-500 to-accent-blue' : emp.productivityScore >= 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-rose-600 to-rose-500'}`}
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
        <div className="space-y-6">
          <div className="bg-bg-secondary/60 backdrop-blur-md border border-border/50 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-text-primary font-outfit">Project Performance & Delivery Status</h3>
              <p className="text-sm font-medium text-text-secondary mt-1">Monitor delivery speed, completion rate, and delayed milestones across active projects.</p>
            </div>
            <span className="text-[11px] font-extrabold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm">
              {projectsPerformance?.length || 0} Total Projects
            </span>
          </div>

          {(!projectsPerformance || projectsPerformance.length === 0) ? (
            <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl p-16 text-center text-sm font-medium text-text-secondary">
              <FolderKanban size={48} className="mx-auto mb-4 opacity-20" />
              No projects initiated in this workspace yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectsPerformance.map((proj) => (
                <div key={proj._id} className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 hover:border-accent-blue/30 transition-all duration-300 rounded-3xl p-6 shadow-[0_5px_30px_rgba(0,0,0,0.05)] hover:shadow-lg flex flex-col justify-between group transform hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-accent-blue/10 transition-colors"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-purple-500/20 text-accent-blue flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
                        <FolderKanban size={24} />
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${
                        proj.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
                      }`}>
                        {proj.status}
                      </span>
                    </div>

                    <h4 className="text-xl font-extrabold text-text-primary mb-2 line-clamp-1 group-hover:text-accent-blue transition-colors font-outfit">
                      {proj.title}
                    </h4>
                    <p className="text-sm font-medium text-text-secondary line-clamp-2 mb-8 h-10">
                      {proj.description || 'No detailed project specifications provided.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-3 mb-8 bg-bg-primary/50 p-4 rounded-2xl border border-border/50">
                      <div className="flex justify-between text-[11px] font-extrabold uppercase tracking-widest">
                        <span className="text-text-secondary">Milestone Completion</span>
                        <span className={proj.progress === 100 ? 'text-emerald-500' : 'text-text-primary'}>{proj.progress}%</span>
                      </div>
                      <div className="h-3 w-full bg-bg-primary rounded-full overflow-hidden shadow-inner border border-border/30">
                        <div
                          style={{ width: `${proj.progress}%` }}
                          className={`h-full rounded-full transition-all duration-1000 shadow-sm ${proj.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-accent-blue to-purple-500'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="pt-5 border-t border-border/50 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-widest relative z-10">
                    <div className="flex items-center gap-2 text-text-secondary bg-bg-primary px-3 py-1.5 rounded-lg border border-border/30 shadow-sm">
                      <CheckSquare size={14} className="text-emerald-500" />
                      <span>{proj.tasksDone} / {proj.tasksCount} Tasks Done</span>
                    </div>

                    {proj.overdue > 0 ? (
                      <span className="text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                        <AlertCircle size={14} /> {proj.overdue} Overdue
                      </span>
                    ) : (
                      <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shadow-sm">On Schedule</span>
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
    </div>
  );
};

export default AnalyticsReports;
