const Task = require('../models/Task');
const Workspace = require('../models/Workspace');
const { sendNotification } = require('./notificationController');
const { logActivity } = require('./auditController');

// @desc    Get tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = { project: req.params.projectId };

    // Employees only see tasks assigned to them
    // team_leader, hr, super_admin see all
    if (req.user.role === 'employee') {
      query.assignees = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('assignees', 'name email avatar')
      .lean();

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all tasks assigned to the current user across a workspace
// @route   GET /api/workspaces/:workspaceId/my-tasks
// @access  Private
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      workspace: req.params.workspaceId,
      assignees: req.user._id
    })
    .select('title description status priority dueDate project assignees workspace')
    .populate('project', 'title')
    .populate('assignees', 'name email avatar')
    .sort({ dueDate: 1 })
    .lean();

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new task
// @route   POST /api/projects/:projectId/tasks
// @access  Private (super_admin, hr)
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, workspace, assignees } = req.body;

    if (!title || !workspace) {
      return res.status(400).json({ message: 'Please add title and workspace ID' });
    }

    // Only super_admin, hr, and team_leader can create/assign tasks
    if (req.user.role === 'employee') {
      return res.status(401).json({ message: 'Not authorized. Only MD, HR, and Team Leaders can create tasks.' });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      project: req.params.projectId,
      workspace,
      assignees: assignees && assignees.length > 0 ? assignees : [req.user._id]
    });

    const populated = await task.populate('assignees', 'name email avatar');

    if (req.io) {
      req.io.emit('taskCreated', populated);
    }

    // Log Activity
    await logActivity({
      workspace,
      user: req.user._id,
      action: 'CREATE_TASK',
      entityType: 'Task',
      entityId: task._id,
      details: `Created task "${title}"`
    });

    // Send notifications to assignees
    populated.assignees.forEach(assignee => {
      sendNotification(
        req,
        assignee._id,
        'task_assigned',
        'New Task Assigned',
        `You have been assigned to a new task: ${title}`,
        `/project/${req.params.projectId}`
      );
    });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task (e.g. for kanban drag drop)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignees', 'name email avatar');

    if (!task) {
       return res.status(404).json({ message: 'Task not found' });
    }

    if (req.io) {
      req.io.emit('taskUpdated', task);
    }

    let updateDetails = `Updated task "${task.title}"`;
    if (req.body.status) updateDetails = `Moved task "${task.title}" to ${req.body.status}`;

    await logActivity({
      workspace: task.workspace,
      user: req.user._id,
      action: 'UPDATE_TASK',
      entityType: 'Task',
      entityId: task._id,
      details: updateDetails
    });

    // If status changed, notify assignees (excluding the person who made the change)
    if (req.body.status) {
      task.assignees.forEach(assignee => {
        if (assignee._id.toString() !== req.user._id.toString()) {
          sendNotification(
            req,
            assignee._id,
            'task_updated',
            'Task Status Updated',
            `The task "${task.title}" was moved to ${req.body.status}`,
            `/project/${task.project}`
          );
        }
      });

      // If marked as Done by an employee, notify the workspace admin
      if (req.body.status === 'Done' && req.user.role === 'employee') {
        const workspace = await Workspace.findById(task.workspace).populate('owner');
        if (workspace && workspace.owner) {
          sendNotification(
            req,
            workspace.owner._id,
            'task_completed',
            'Task Completed',
            `${req.user.name} has completed the task: "${task.title}"`,
            `/project/${task.project}`
          );
        }
      }
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTasks,
  getMyTasks,
  createTask,
  updateTask
};
