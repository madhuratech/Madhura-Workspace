const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');

// @desc    Get projects for a workspace
// @route   GET /api/workspaces/:workspaceId/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    let query = { workspace: req.params.workspaceId };

    // Employees only see projects they are assigned to
    // team_leader, hr, super_admin see all
    if (req.user.role === 'employee') {
      query.members = req.user._id;
    }

    const projects = await Project.find(query)
      .populate('members', 'name email avatar');

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/workspaces/:workspaceId/projects
// @access  Private (super_admin, hr)
const createProject = async (req, res) => {
  try {
    const { title, description, members } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Please add a project title' });
    }

    // Only super_admin, hr, team_leader can create projects
    if (req.user.role === 'employee') {
      return res.status(401).json({ message: 'Not authorized. Only Super Admins, HR, and Team Leaders can create projects.' });
    }

    const project = await Project.create({
      title,
      description,
      workspace: req.params.workspaceId,
      members: members && members.length > 0 ? members : [req.user._id]
    });

    const populated = await project.populate('members', 'name email avatar');

    if (req.io) {
      req.io.emit('projectCreated', populated);
    }

    // Send notifications to project members
    populated.members.forEach(member => {
      if (member._id.toString() !== req.user._id) {
        sendNotification(
          req,
          member._id,
          'project_added',
          'Added to New Project',
          `You have been added to the project: ${title}`,
          `/projects`
        );
      }
    });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/workspaces/:workspaceId/projects/:projectId
// @access  Private
const updateProject = async (req, res) => {
  try {
    const { title, description, members, status } = req.body;

    if (req.user.role === 'employee') {
      return res.status(401).json({ message: 'Not authorized to update projects.' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.projectId, 
      { title, description, members, status }, 
      { new: true }
    ).populate('members', 'name email avatar');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.io) {
      req.io.emit('projectUpdated', project);
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/workspaces/:workspaceId/projects/:projectId
// @access  Private
const deleteProject = async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(401).json({ message: 'Not authorized to delete projects.' });
    }

    const project = await Project.findByIdAndDelete(req.params.projectId);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.io) {
      req.io.emit('projectDeleted', req.params.projectId);
    }

    res.status(200).json({ message: 'Project removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get workspace members (for assignment dropdown)
// @route   GET /api/workspaces/:workspaceId/projects/members
// @access  Private
const getWorkspaceMembers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate('members.user', 'name email avatar role');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    res.status(200).json(workspace.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getWorkspaceMembers
};
