const Task = require('../models/Task');
const { sendNotification } = require('./notificationController');

// @desc    Get tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = { project: req.params.projectId };

    // Employees only see tasks assigned to them
    // team_leader, hr, super_admin see all
    if (req.user.role === 'employee') {
      query.assignees = req.user.id;
    }

    const tasks = await Task.find(query)
      .populate('assignees', 'name email avatar');

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
      return res.status(401).json({ message: 'Not authorized. Only Super Admins, HR, and Team Leaders can create tasks.' });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      project: req.params.projectId,
      workspace,
      assignees: assignees && assignees.length > 0 ? assignees : [req.user.id]
    });

    const populated = await task.populate('assignees', 'name email avatar');

    if (req.io) {
      req.io.emit('taskCreated', populated);
    }

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

    // If status changed, notify assignees (excluding the person who made the change)
    if (req.body.status) {
      task.assignees.forEach(assignee => {
        if (assignee._id.toString() !== req.user.id) {
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
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask
};
