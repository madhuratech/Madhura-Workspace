const Task = require('../models/Task');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

// @desc    Get comprehensive analytics and performance reports for a workspace
// @route   GET /api/workspaces/:workspaceId/analytics
// @access  Private (super_admin, hr, team_leader, employee)
const getWorkspaceAnalytics = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // 1. Fetch Workspace with populated member info using lean() for speed
    const workspace = await Workspace.findById(workspaceId)
      .populate('members.user', 'name email avatar role designation presenceStatus')
      .lean();

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // 2. Fetch all Tasks, Projects, and Attendance records in parallel
    const [tasks, projects, attendances] = await Promise.all([
      Task.find({ workspace: workspaceId }).lean(),
      Project.find({ workspace: workspaceId }).populate('members', 'name email').lean(),
      Attendance.find({ workspace: workspaceId }).lean()
    ]);

    const now = new Date();

    // ---------------------------------------------------------
    // A. TASK PROGRESS & METRICS
    // ---------------------------------------------------------
    const totalTasks = tasks.length;
    const tasksByStatus = { 'To Do': 0, 'In Progress': 0, 'Done': 0 };
    const tasksByPriority = { 'Low': 0, 'Medium': 0, 'High': 0 };
    let overdueTasksCount = 0;

    tasks.forEach(task => {
      tasksByStatus[task.status || 'To Do'] = (tasksByStatus[task.status || 'To Do'] || 0) + 1;
      tasksByPriority[task.priority || 'Medium'] = (tasksByPriority[task.priority || 'Medium'] || 0) + 1;

      if (task.status !== 'Done' && task.dueDate && new Date(task.dueDate) < now) {
        overdueTasksCount++;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((tasksByStatus['Done'] / totalTasks) * 100) : 0;

    // ---------------------------------------------------------
    // B. ATTENDANCE TRENDS & STATS
    // ---------------------------------------------------------
    const attendanceSummary = { Present: 0, Absent: 0, 'Half-Day': 0 };
    const dateTrendMap = {}; // date -> { present: count, absent: count, halfDay: count }

    attendances.forEach(att => {
      const status = att.status || 'Present';
      attendanceSummary[status] = (attendanceSummary[status] || 0) + 1;

      const dateStr = att.date || new Date(att.createdAt || Date.now()).toISOString().split('T')[0];
      if (!dateTrendMap[dateStr]) {
        dateTrendMap[dateStr] = { date: dateStr, present: 0, absent: 0, halfDay: 0 };
      }
      if (status === 'Present') dateTrendMap[dateStr].present++;
      else if (status === 'Absent') dateTrendMap[dateStr].absent++;
      else if (status === 'Half-Day') dateTrendMap[dateStr].halfDay++;
    });

    // Sort recent dates (up to last 14 active recorded days)
    const attendanceTrend = Object.values(dateTrendMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const totalAttendanceRecords = attendances.length;
    const overallAttendanceRate = totalAttendanceRecords > 0
      ? Math.round(((attendanceSummary['Present'] + (attendanceSummary['Half-Day'] * 0.5)) / totalAttendanceRecords) * 100)
      : 100;

    // ---------------------------------------------------------
    // C. EMPLOYEE PERFORMANCE & PRODUCTIVITY TRACKING
    // ---------------------------------------------------------
    const employeePerformance = (workspace.members || []).map(m => {
      const u = m.user;
      if (!u) return null;
      const uId = String(u._id);

      // Tasks assigned to this employee
      const userTasks = tasks.filter(t => 
        t.assignees && t.assignees.some(a => String(a) === uId || String(a._id) === uId)
      );

      const assignedCount = userTasks.length;
      const completedCount = userTasks.filter(t => t.status === 'Done').indexOf === -1 ? userTasks.filter(t => t.status === 'Done').length : userTasks.filter(t => t.status === 'Done').length;
      const inProgressCount = userTasks.filter(t => t.status === 'In Progress').length;
      const overdueCount = userTasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < now).length;
      
      const taskSuccessRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

      // Attendance records for this employee
      const userAttendances = attendances.filter(a => String(a.user) === uId || String(a.user?._id) === uId);
      const presentDays = userAttendances.filter(a => a.status === 'Present').length;
      const absentDays = userAttendances.filter(a => a.status === 'Absent').length;
      const halfDays = userAttendances.filter(a => a.status === 'Half-Day').length;
      const attRate = userAttendances.length > 0
        ? Math.round(((presentDays + halfDays * 0.5) / userAttendances.length) * 100)
        : 100;

      // Productivity Score computation (weighted mix of task completion rate & attendance punctuality)
      let productivityScore = 100;
      if (assignedCount > 0 || userAttendances.length > 0) {
        const taskWeight = assignedCount > 0 ? taskSuccessRate : 100;
        const attWeight = attRate;
        const penalty = overdueCount * 5; // deduct 5% per overdue task
        productivityScore = Math.max(0, Math.min(100, Math.round(taskWeight * 0.7 + attWeight * 0.3 - penalty)));
      }

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        designation: u.designation || 'Team Member',
        role: m.role || u.role,
        presenceStatus: u.presenceStatus || 'Active',
        tasks: {
          assigned: assignedCount,
          completed: completedCount,
          inProgress: inProgressCount,
          overdue: overdueCount,
          completionRate: taskSuccessRate
        },
        attendance: {
          present: presentDays,
          absent: absentDays,
          halfDay: halfDays,
          rate: attRate
        },
        productivityScore
      };
    }).filter(Boolean);

    // Sort employees by productivity score high to low
    employeePerformance.sort((a, b) => b.productivityScore - a.productivityScore);

    // ---------------------------------------------------------
    // D. PROJECTS PERFORMANCE
    // ---------------------------------------------------------
    const projectsPerformance = projects.map(proj => {
      const pId = String(proj._id);
      const projTasks = tasks.filter(t => String(t.project) === pId || String(t.project?._id) === pId);
      const projTotal = projTasks.length;
      const projDone = projTasks.filter(t => t.status === 'Done').length;
      const projInProgress = projTasks.filter(t => t.status === 'In Progress').length;
      const projRate = projTotal > 0 ? Math.round((projDone / projTotal) * 100) : 0;
      const projOverdue = projTasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < now).length;

      return {
        _id: proj._id,
        title: proj.title,
        description: proj.description,
        status: proj.status || 'Active',
        membersCount: proj.members ? proj.members.length : 0,
        tasksCount: projTotal,
        tasksDone: projDone,
        tasksInProgress: projInProgress,
        overdue: projOverdue,
        progress: projRate
      };
    });

    // Send complete structured report
    res.status(200).json({
      success: true,
      workspaceName: workspace.name,
      timestamp: Date.now(),
      summary: {
        totalMembers: workspace.members ? workspace.members.length : 0,
        totalProjects: projects.length,
        totalTasks,
        completionRate,
        overdueTasks: overdueTasksCount,
        overallAttendanceRate
      },
      taskProgress: {
        byStatus: tasksByStatus,
        byPriority: tasksByPriority,
        completionRate
      },
      attendanceTrends: {
        summary: attendanceSummary,
        rate: overallAttendanceRate,
        dailyTrend: attendanceTrend
      },
      employeePerformance,
      projectsPerformance
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error fetching analytics reports', error: error.message });
  }
};

module.exports = {
  getWorkspaceAnalytics
};
