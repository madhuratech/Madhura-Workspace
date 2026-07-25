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
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-blue/15 text-accent-blue uppercase tracking-wider">
              Live Reports
            </span>
            {workspaces.length > 1 && (
              <div className="relative inline-block">
                <select
                  className="bg-bg-secondary text-text-primary text-xs font-semibold px-3 py-1 rounded-lg border border-white/10 outline-none cursor-pointer"
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
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-3 font-outfit">
            <BarChart3 className="text-accent-blue" size={32} />
            Analytics & Reports Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Comprehensive track of employee productivity, project milestones, and attendance trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalytics(selectedWorkspace._id, true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-bg-card hover:bg-bg-secondary text-text-primary rounded-xl border border-white/10 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-accent-blue' : 'text-text-secondary'} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/25'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <PieChart size={18} />
          Overview & Trends
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
            activeTab === 'employees'
              ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/25'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <Users size={18} />
          Employee Performance ({employeePerformance?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
            activeTab === 'projects'
              ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/25'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <FolderKanban size={18} />
          Project Milestones ({projectsPerformance?.length || 0})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-bg-card border border-white/5 rounded-2xl p-6 shadow-soft flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Task Completion</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-text-primary font-outfit">{summary.completionRate}%</span>
                  <span className="text-xs font-semibold text-emerald-500 flex items-center">
                    <ArrowUpRight size={14} /> Live Rate
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">Of {summary.totalTasks} total workspace tasks</p>
              </div>
            </div>

            <div className="bg-bg-card border border-white/5 rounded-2xl p-6 shadow-soft flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Attendance Trend</span>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Calendar size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-text-primary font-outfit">{summary.overallAttendanceRate}%</span>
                  <span className="text-xs font-semibold text-blue-400">Avg Presence</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">Present vs Absent logs</p>
              </div>
            </div>

            <div className="bg-bg-card border border-white/5 rounded-2xl p-6 shadow-soft flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Overdue Alerts</span>
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-rose-500 font-outfit">{summary.overdueTasks}</span>
                  <span className="text-xs font-semibold text-text-secondary">Delayed</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">Tasks past scheduled due date</p>
              </div>
            </div>

            <div className="bg-bg-card border border-white/5 rounded-2xl p-6 shadow-soft flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Team Strength</span>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <Users size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-text-primary font-outfit">{summary.totalMembers}</span>
                  <span className="text-xs font-semibold text-purple-400">Active Members</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">Across {summary.totalProjects} active projects</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Task Progress & Status Breakdown */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-6 shadow-soft space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 font-outfit">
                    <CheckSquare className="text-accent-blue" size={20} />
                    Task Progress Distribution
                  </h3>
                  <p className="text-xs text-text-secondary">Breakdown by current workflow stage</p>
                </div>
                <span className="text-sm font-extrabold text-text-primary px-3 py-1 rounded-lg bg-white/5">
                  {summary.totalTasks} Tasks
                </span>
              </div>

              {summary.totalTasks === 0 ? (
                <div className="p-8 text-center text-text-secondary text-sm">No tasks assigned in this workspace yet.</div>
              ) : (
                <div className="space-y-5">
                  {/* Visual Multi-Segment Bar */}
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-bg-secondary rounded-full overflow-hidden flex gap-0.5 p-0.5">
                      <div
                        style={{ width: `${(taskProgress.byStatus['Done'] / summary.totalTasks) * 100}%` }}
                        className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                        title="Done"
                      />
                      <div
                        style={{ width: `${(taskProgress.byStatus['In Progress'] / summary.totalTasks) * 100}%` }}
                        className="bg-blue-500 h-full transition-all duration-500"
                        title="In Progress"
                      />
                      <div
                        style={{ width: `${(taskProgress.byStatus['To Do'] / summary.totalTasks) * 100}%` }}
                        className="bg-slate-500 h-full rounded-r-full transition-all duration-500"
                        title="To Do"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-text-secondary uppercase">
                      <span className="text-emerald-500">Done ({Math.round((taskProgress.byStatus['Done'] / summary.totalTasks) * 100 || 0)}%)</span>
                      <span className="text-blue-500">In Progress ({Math.round((taskProgress.byStatus['In Progress'] / summary.totalTasks) * 100 || 0)}%)</span>
                      <span className="text-slate-400">To Do ({Math.round((taskProgress.byStatus['To Do'] / summary.totalTasks) * 100 || 0)}%)</span>
                    </div>
                  </div>

                  {/* Individual Status Bars */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <span className="text-2xl font-black text-emerald-500 font-outfit">{taskProgress.byStatus['Done'] || 0}</span>
                      <p className="text-xs font-bold text-text-secondary mt-1">Completed</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                      <span className="text-2xl font-black text-blue-500 font-outfit">{taskProgress.byStatus['In Progress'] || 0}</span>
                      <p className="text-xs font-bold text-text-secondary mt-1">In Progress</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-500/5 border border-slate-500/20 text-center">
                      <span className="text-2xl font-black text-slate-400 font-outfit">{taskProgress.byStatus['To Do'] || 0}</span>
                      <p className="text-xs font-bold text-text-secondary mt-1">Pending</p>
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">By Priority Level</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> High Priority
                        </span>
                        <span className="font-extrabold">{taskProgress.byPriority['High'] || 0} tasks</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium Priority
                        </span>
                        <span className="font-extrabold">{taskProgress.byPriority['Medium'] || 0} tasks</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Low Priority
                        </span>
                        <span className="font-extrabold">{taskProgress.byPriority['Low'] || 0} tasks</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Attendance Trends & Rate */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-6 shadow-soft space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 font-outfit">
                    <TrendingUp className="text-blue-500" size={20} />
                    Attendance Trends
                  </h3>
                  <p className="text-xs text-text-secondary">Workforce presence and availability logs</p>
                </div>
                <span className="text-sm font-extrabold text-emerald-400 px-3 py-1 rounded-lg bg-emerald-500/10">
                  {summary.overallAttendanceRate}% Rate
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-bg-secondary border border-white/5 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-text-secondary mb-1">Present Days</span>
                  <span className="text-2xl font-extrabold text-emerald-500 font-outfit">{attendanceTrends.summary.Present || 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-bg-secondary border border-white/5 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-text-secondary mb-1">Half-Day</span>
                  <span className="text-2xl font-extrabold text-amber-500 font-outfit">{attendanceTrends.summary['Half-Day'] || 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-bg-secondary border border-white/5 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-text-secondary mb-1">Absent</span>
                  <span className="text-2xl font-extrabold text-rose-500 font-outfit">{attendanceTrends.summary.Absent || 0}</span>
                </div>
              </div>

              {/* Daily Trend Visual Chart */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Recent Daily Presence Activity</h4>
                
                {(!attendanceTrends.dailyTrend || attendanceTrends.dailyTrend.length === 0) ? (
                  <div className="p-6 bg-bg-secondary/50 rounded-xl text-center text-xs text-text-secondary">
                    No historical attendance logs recorded for recent dates yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-36 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-white/10">
                      {attendanceTrends.dailyTrend.map((day, idx) => {
                        const totalDay = (day.present + day.absent + day.halfDay) || 1;
                        const presentHeight = Math.max(15, Math.min(100, Math.round((day.present / totalDay) * 100)));
                        
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-8 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                              {day.date}: {day.present} Present / {day.absent} Absent
                            </div>
                            <div className="w-full max-w-[28px] bg-bg-secondary rounded-t-lg h-full flex flex-col justify-end overflow-hidden">
                              <div
                                style={{ height: `${presentHeight}%` }}
                                className="bg-gradient-to-t from-blue-600 to-accent-blue w-full rounded-t-md transition-all duration-500 group-hover:brightness-110"
                              />
                            </div>
                            <span className="text-[10px] text-text-secondary font-semibold truncate max-w-[36px]">
                              {day.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-secondary px-2">
                      <span>Timeline: Last {attendanceTrends.dailyTrend.length} recorded days</span>
                      <span className="flex items-center gap-1.5 text-accent-blue font-bold">
                        <span className="w-2 h-2 rounded-full bg-accent-blue"></span> Present Proportion
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card border border-white/5 p-4 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-text-primary">Workforce Productivity Scoreboard</h3>
              <p className="text-xs text-text-secondary">Real-time performance ranking based on tasks completion, deadline adherence, and attendance.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="text"
                placeholder="Search employee or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-secondary text-text-primary text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-blue transition-colors"
              />
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center text-sm text-text-secondary">
              No employees found matching your filter criteria.
            </div>
          ) : (
            <div className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-extrabold text-text-secondary uppercase tracking-wider">
                      <th className="py-4 px-6">Employee</th>
                      <th className="py-4 px-4 text-center">Role / Status</th>
                      <th className="py-4 px-4 text-center">Tasks Done</th>
                      <th className="py-4 px-4 text-center">Overdue</th>
                      <th className="py-4 px-4 text-center">Attendance</th>
                      <th className="py-4 px-6 text-right">Productivity Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm font-medium">
                    {filteredEmployees.map((emp, idx) => {
                      const badge = getProductivityBadge(emp.productivityScore);
                      const Icon = badge.icon;

                      return (
                        <tr key={emp._id || idx} className="hover:bg-white/[0.02] transition-colors">
                          
                          {/* Employee Info */}
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-indigo to-accent-blue flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0">
                                {formatInitials(emp.name)}
                              </div>
                              <div>
                                <p className="font-bold text-text-primary">{emp.name}</p>
                                <p className="text-xs text-text-secondary">{emp.designation || emp.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role & Presence */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold capitalize bg-white/5 text-text-primary border border-white/10">
                                {emp.role?.replace('_', ' ') || 'Employee'}
                              </span>
                              <span className="text-[11px] text-text-secondary flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${emp.presenceStatus === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                {emp.presenceStatus || 'Active'}
                              </span>
                            </div>
                          </td>

                          {/* Tasks Completed */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-extrabold text-text-primary">
                                {emp.tasks.completed} / {emp.tasks.assigned}
                              </span>
                              <span className="text-[11px] text-emerald-400 font-semibold">
                                {emp.tasks.completionRate}% Rate
                              </span>
                            </div>
                          </td>

                          {/* Overdue Tasks */}
                          <td className="py-4 px-4 text-center">
                            {emp.tasks.overdue > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                {emp.tasks.overdue} Delayed
                              </span>
                            ) : (
                              <span className="text-xs text-text-secondary/60 font-semibold">On Time</span>
                            )}
                          </td>

                          {/* Attendance */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-text-primary">{emp.attendance.rate}%</span>
                              <span className="text-[11px] text-text-secondary">
                                {emp.attendance.present}P / {emp.attendance.absent}A
                              </span>
                            </div>
                          </td>

                          {/* Productivity Score */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badge.color}`}>
                                  <Icon size={12} />
                                  {badge.label}
                                </span>
                                <span className="text-lg font-black text-text-primary font-outfit w-10 text-right">
                                  {emp.productivityScore}
                                </span>
                              </div>
                              <div className="w-28 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${emp.productivityScore}%` }}
                                  className={`h-full rounded-full ${emp.productivityScore >= 75 ? 'bg-accent-blue' : emp.productivityScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
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
          <div className="bg-bg-card border border-white/5 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-text-primary">Project Performance & Delivery Status</h3>
              <p className="text-xs text-text-secondary">Monitor delivery speed, completion rate, and delayed milestones across active projects.</p>
            </div>
            <span className="text-xs font-extrabold text-accent-blue bg-accent-blue/10 px-3 py-1.5 rounded-xl">
              {projectsPerformance?.length || 0} Total Projects
            </span>
          </div>

          {(!projectsPerformance || projectsPerformance.length === 0) ? (
            <div className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center text-sm text-text-secondary">
              No projects initiated in this workspace yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projectsPerformance.map((proj) => (
                <div key={proj._id} className="bg-bg-card border border-white/5 hover:border-white/15 transition-all duration-300 rounded-2xl p-6 shadow-soft flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center font-bold">
                        <FolderKanban size={20} />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                        proj.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {proj.status}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-text-primary mb-1 line-clamp-1 group-hover:text-accent-blue transition-colors font-outfit">
                      {proj.title}
                    </h4>
                    <p className="text-xs text-text-secondary line-clamp-2 mb-6 h-8">
                      {proj.description || 'No detailed project specifications provided.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-text-secondary">Milestone Completion</span>
                        <span className="text-text-primary">{proj.progress}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-bg-secondary rounded-full overflow-hidden p-0.5">
                        <div
                          style={{ width: `${proj.progress}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${proj.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-accent-indigo to-accent-blue'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <CheckSquare size={14} className="text-emerald-500" />
                      <span>{proj.tasksDone} / {proj.tasksCount} Tasks Done</span>
                    </div>

                    {proj.overdue > 0 ? (
                      <span className="text-rose-400 flex items-center gap-1 font-bold">
                        <AlertCircle size={14} /> {proj.overdue} Overdue
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">On Schedule</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AnalyticsReports;
