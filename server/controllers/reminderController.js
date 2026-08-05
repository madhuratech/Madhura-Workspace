const Task = require('../models/Task');
const Meeting = require('../models/Meeting');

exports.getUpcomingReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.query;

    const now = new Date();

    // 1. Fetch upcoming tasks where user is assignee
    let taskQuery = {
      assignees: userId,
      dueDate: { $gte: now },
      status: { $ne: 'Completed' }
    };
    if (workspaceId) taskQuery.workspace = workspaceId;

    const tasks = await Task.find(taskQuery)
      .populate('workspace', 'name')
      .populate('project', 'name')
      .lean();

    // 2. Fetch upcoming meetings where user is participant
    let meetingQuery = {
      participants: userId,
      date: { $gte: now }
    };
    if (workspaceId) meetingQuery.workspace = workspaceId;

    const meetings = await Meeting.find(meetingQuery)
      .populate('workspace', 'name')
      .lean();

    // 3. Format and Merge
    const reminders = [];

    tasks.forEach(task => {
      reminders.push({
        _id: task._id,
        type: 'task',
        title: task.title,
        time: task.dueDate,
        workspaceName: task.workspace?.name || 'Unknown',
        projectName: task.project?.name || null,
        status: task.status,
        priority: task.priority
      });
    });

    meetings.forEach(meeting => {
      let meetingDate = meeting.date;
      
      reminders.push({
        _id: meeting._id,
        type: 'meeting',
        title: meeting.title,
        time: meetingDate,
        workspaceName: meeting.workspace?.name || 'Unknown',
        meetingType: meeting.type,
        timeString: meeting.time
      });
    });

    // 4. Sort chronologically (closest first)
    reminders.sort((a, b) => new Date(a.time) - new Date(b.time));

    res.status(200).json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ message: 'Server error fetching reminders' });
  }
};
