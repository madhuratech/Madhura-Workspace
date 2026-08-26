import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  BarChart3, Users, FolderKanban, CheckCircle2,
  Calendar, AlertCircle, Search, RefreshCw, Activity,
  ChevronDown, ArrowUpRight
} from 'lucide-react';
import {
  PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

// Minimalist status badge
const STATUS_MAP = {
  Active:  { label: 'Available', color: 'bg-green-500' },
  Busy:    { label: 'Busy', color: 'bg-red-500' },
  Break:   { label: 'Do not disturb', color: 'bg-red-500' },
  Lunch:   { label: 'Be right back', color: 'bg-yellow-500' },
  Away:    { label: 'Appear away', color: 'bg-yellow-500' },
  Leave:   { label: 'Offline', color: 'bg-gray-400' },
};

const StatusDot = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.Active;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${s.color}`}></span>
      <span className="text-sm text-text-secondary">{s.label}</span>
    </div>
  );
};

// Recharts Custom Tooltip
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-secondary border border-border/50 p-3 rounded-lg shadow-lg">
        <p className="text-xs font-semibold text-gray-500 mb-1">{payload[0].payload.name || payload[0].payload.date}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium text-gray-900">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsReports = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); 
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

  const formatInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading && !analyticsData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px] bg-bg-primary">
        <div className="w-8 h-8 border-2 border-border border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!selectedWorkspace || !analyticsData) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center h-full flex flex-col justify-center items-center bg-bg-primary">
        <BarChart3 size={32} className="text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-text-primary mb-2">No Analytics Available</h3>
        <p className="text-sm text-text-secondary">Please join or create an active workspace to view reports.</p>
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

  // Minimalist chart colors
  const taskChartData = [
    { name: 'Completed', value: taskProgress.byStatus['Done'] || 0, color: '#10B981' }, // Green
    { name: 'In Progress', value: taskProgress.byStatus['In Progress'] || 0, color: '#3B82F6' }, // Blue
    { name: 'Pending', value: taskProgress.byStatus['To Do'] || 0, color: '#E2E8F0' }, // Light Gray
  ].filter(d => d.value > 0);

  const hasTaskData = taskChartData.length > 0;

  const attendanceChartData = (attendanceTrends.dailyTrend || []).map(day => ({
    date: day.date.slice(5),
    Present: day.present,
    Absent: day.absent
  }));

  return (
    <div className="p-6 md:p-10 w-full h-full bg-bg-primary overflow-y-auto font-sans">
      <div className="max-w-[1200px] mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Analytics</h1>
            <p className="text-sm text-text-secondary mt-1">Workspace performance and telemetry.</p>
          </div>

          <div className="flex items-center gap-4">
            {workspaces.length > 1 && (
              <div className="relative">
                <select
                  className="appearance-none bg-bg-secondary border border-border text-text-primary text-sm font-medium px-4 py-2 pr-10 rounded-lg outline-none hover:border-gray-300 transition-colors shadow-sm cursor-pointer"
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
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => fetchAnalytics(selectedWorkspace._id, true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-gray-50 border border-border text-text-primary rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-px">
          {['overview', 'employees', 'projects'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary" />
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-bg-secondary border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Completion</span>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>
                <div className="text-3xl font-semibold text-text-primary mt-2">{summary.completionRate}%</div>
                <p className="text-sm text-text-secondary mt-1">{summary.totalTasks} total tasks</p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Attendance</span>
                  <Calendar size={16} className="text-blue-500" />
                </div>
                <div className="text-3xl font-semibold text-text-primary mt-2">{summary.overallAttendanceRate}%</div>
                <p className="text-sm text-text-secondary mt-1">Average presence</p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Overdue</span>
                  <AlertCircle size={16} className="text-red-500" />
                </div>
                <div className="text-3xl font-semibold text-text-primary mt-2">{summary.overdueTasks}</div>
                <p className="text-sm text-text-secondary mt-1">Past deadline</p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Headcount</span>
                  <Users size={16} className="text-purple-500" />
                </div>
                <div className="text-3xl font-semibold text-text-primary mt-2">{summary.totalMembers}</div>
                <p className="text-sm text-text-secondary mt-1">Active members</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Donut */}
              <div className="bg-bg-secondary border border-border rounded-xl p-6 shadow-sm flex flex-col">
                <h3 className="text-sm font-semibold text-text-primary mb-6">Task Distribution</h3>
                <div className="flex-1 min-h-[250px] relative">
                  {!hasTaskData ? (
                    <div className="h-full flex items-center justify-center text-sm text-text-secondary">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Pie
                          data={taskChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {taskChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {hasTaskData && (
                  <div className="flex justify-center gap-6 mt-4">
                    {taskChartData.map((stat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }}></span>
                        <span className="text-sm text-text-secondary">{stat.name}</span>
                        <span className="text-sm font-medium text-text-primary ml-1">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chart 2: Area */}
              <div className="bg-bg-secondary border border-border rounded-xl p-6 shadow-sm flex flex-col">
                <h3 className="text-sm font-semibold text-text-primary mb-6">Attendance Trends</h3>
                <div className="flex-1 min-h-[250px]">
                  {attendanceChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-text-secondary">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={attendanceChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="date" stroke="#94A3B8" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#94A3B8" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} dx={-10} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Present" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" activeDot={{ r: 4, fill: '#3B82F6', stroke: '#fff' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WORKFORCE */}
        {activeTab === 'employees' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search personnel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary text-sm pl-9 pr-4 py-2 rounded-lg outline-none focus:border-gray-300 transition-colors shadow-sm"
                />
              </div>
            </div>

            <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border/50 bg-gray-50/50">
                      <th className="py-3 px-5 text-xs font-semibold text-text-secondary">Name</th>
                      <th className="py-3 px-5 text-xs font-semibold text-text-secondary">Role & Status</th>
                      <th className="py-3 px-5 text-xs font-semibold text-text-secondary">Tasks</th>
                      <th className="py-3 px-5 text-xs font-semibold text-text-secondary">Attendance</th>
                      <th className="py-3 px-5 text-right text-xs font-semibold text-text-secondary">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-sm text-text-secondary">No personnel found</td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                                {formatInitials(emp.name)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-text-primary">{emp.name}</p>
                                <p className="text-xs text-text-secondary">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-text-primary capitalize">{emp.role?.replace('_', ' ')}</span>
                              <StatusDot status={emp.presenceStatus} />
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <p className="text-sm text-text-primary">
                              {emp.tasks.completed} <span className="text-text-secondary">/ {emp.tasks.assigned}</span>
                            </p>
                            <p className="text-xs text-green-600 mt-0.5">{emp.tasks.completionRate}% Done</p>
                          </td>
                          <td className="py-3 px-5">
                            <p className="text-sm text-text-primary">{emp.attendance.rate}%</p>
                            <p className="text-xs text-text-secondary mt-0.5">{emp.attendance.present} Present</p>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-sm font-semibold text-text-primary">{emp.productivityScore}</span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${emp.productivityScore}%` }}
                                  className={`h-full rounded-full ${emp.productivityScore >= 75 ? 'bg-green-500' : emp.productivityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {(!projectsPerformance || projectsPerformance.length === 0) ? (
              <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center shadow-sm">
                <FolderKanban size={24} className="text-gray-400 mx-auto mb-3" />
                <h4 className="text-base font-medium text-text-primary">No Active Projects</h4>
                <p className="text-sm text-text-secondary mt-1">Project metrics will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectsPerformance.map((proj) => (
                  <div key={proj._id} className="bg-bg-secondary border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-gray-300 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <FolderKanban size={18} className="text-text-secondary" />
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wide ${
                          proj.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {proj.status}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-text-primary mb-1 line-clamp-1">{proj.title}</h4>
                      <p className="text-xs text-text-secondary line-clamp-2 mb-4 h-8">{proj.description}</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs text-text-secondary mb-1.5">
                        <span>Progress</span>
                        <span className="font-medium text-text-primary">{proj.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div
                          style={{ width: `${proj.progress}%` }}
                          className={`h-full rounded-full ${proj.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border/50 pt-3">
                        <span>{proj.tasksDone} / {proj.tasksCount} Tasks</span>
                        {proj.overdue > 0 ? (
                          <span className="text-red-600 font-medium">{proj.overdue} Overdue</span>
                        ) : (
                          <span className="text-green-600 font-medium">On Track</span>
                        )}
                      </div>
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
