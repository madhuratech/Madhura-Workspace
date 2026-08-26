const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');
const { logActivity } = require('./auditController');

// @desc    Get projects for a workspace
// @route   GET /api/workspaces/:workspaceId/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    let query = { workspace: req.params.workspaceId };

    // Employees and team leaders only see projects they are assigned to
    // hr, super_admin see all
    if (!['super_admin', 'hr'].includes(req.user.role)) {
      query.members = req.user._id;
    }

    const projects = await Project.find(query)
      .select('title description projectType status stage coordinator workflowTeams members workspace createdAt updatedAt')
      .populate('members', 'name email avatar')
      .populate('coordinator', 'name email avatar')
      .populate('workflowTeams.uiux')
      .populate('workflowTeams.tech')
      .populate('workflowTeams.test')
      .populate('workflowTeams.devops')
      .populate('workflowTeams.digitalMarketing')
      .populate('workflowTeams.seo')
      .lean();

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/workspaces/:workspaceId/projects/:projectId
// @access  Private
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('members', 'name email avatar')
      .populate('coordinator', 'name email avatar')
      .populate('workflowTeams.uiux')
      .populate('workflowTeams.tech')
      .populate('workflowTeams.test')
      .populate('workflowTeams.devops')
      .lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/workspaces/:workspaceId/projects
// @access  Private (super_admin, hr)
  const createProject = async (req, res) => {
    try {
      const { title, description, projectType, members, coordinator, workflowTeams } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'Please add a project title' });
      }

      // Only super_admin, hr, and Project Coordinators can create projects
      if (!['super_admin', 'hr'].includes(req.user.role) && !(req.user.designation || '').toLowerCase().includes('coordinator')) {
        return res.status(401).json({ message: 'Not authorized. Only MD, HR, and Project Coordinators can create projects.' });
      }

      // Determine initial stage based on project type
      const types = projectType || ['Software'];
      const hasSoftware = types.some(t => ['Software', 'Website', 'SaaS', 'PaaS'].includes(t));
      
      let initialStage = 'Proposal'; // default for software
      if (!hasSoftware) {
        if (types.includes('Digital Marketing')) initialStage = 'Digital Marketing';
        else if (types.includes('SEO')) initialStage = 'SEO';
        else initialStage = 'Completed';
      }

      const project = await Project.create({
        title,
        description,
        projectType,
        workspace: req.params.workspaceId,
        coordinator: coordinator || req.user._id,
        workflowTeams,
        stage: initialStage,
        members: members && members.length > 0 ? members : [req.user._id]
      });

    const populated = await project
      .populate('members', 'name email avatar')
      .then(p => p.populate('coordinator', 'name email avatar'))
      .then(p => p.populate('workflowTeams.uiux workflowTeams.tech workflowTeams.test workflowTeams.devops'));

    if (req.io) {
      req.io.emit('projectCreated', populated);
    }

    await logActivity({
      workspace: req.params.workspaceId,
      user: req.user._id,
      action: 'CREATE_PROJECT',
      entityType: 'Project',
      entityId: project._id,
      details: `Created project "${title}"`
    });

    // Send notifications to project members
    populated.members.forEach(member => {
      if (member._id.toString() !== req.user._id.toString()) {
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
    const { title, description, projectType, members, status, workflowTeams, coordinator } = req.body;

    if (!['super_admin', 'hr'].includes(req.user.role) && !(req.user.designation || '').toLowerCase().includes('coordinator')) {
      return res.status(401).json({ message: 'Not authorized to update projects.' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.projectId, 
      { title, description, projectType, members, status, workflowTeams, coordinator }, 
      { new: true }
    ).populate('members', 'name email avatar');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.io) {
      req.io.emit('projectUpdated', project);
    }

    await logActivity({
      workspace: req.params.workspaceId,
      user: req.user._id,
      action: 'UPDATE_PROJECT',
      entityType: 'Project',
      entityId: project._id,
      details: `Updated project "${title || project.title}"`
    });

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
    if (!['super_admin', 'hr'].includes(req.user.role) && !(req.user.designation || '').toLowerCase().includes('coordinator')) {
      return res.status(401).json({ message: 'Not authorized to delete projects.' });
    }

    const project = await Project.findByIdAndDelete(req.params.projectId);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.io) {
      req.io.emit('projectDeleted', req.params.projectId);
    }

    await logActivity({
      workspace: req.params.workspaceId,
      user: req.user._id,
      action: 'DELETE_PROJECT',
      entityType: 'Project',
      entityId: project._id,
      details: `Deleted project "${project.title}"`
    });

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
      .populate('members.user', 'name email avatar role designation');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    res.status(200).json(workspace.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Advance project stage
// @route   PUT /api/workspaces/:workspaceId/projects/:projectId/advance
// @access  Private
const advanceStage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // In a real app we'd verify the user is Coordinator or TL of the current stage's team
    // For now we allow non-employees and Coordinators
    if (req.user.role === 'employee' && String(project.coordinator) !== String(req.user._id)) {
       return res.status(401).json({ message: 'Not authorized to advance project stage.' });
    }

    const hasSoftware = project.projectType.some(t => ['Software', 'Website', 'SaaS', 'PaaS'].includes(t));
    let stages = [];
    if (hasSoftware) {
      stages.push('Proposal', 'UI/UX', 'Tech', 'Test', 'DevOps');
    }
    if (project.projectType.includes('Digital Marketing')) stages.push('Proposal', 'Digital Marketing');
    if (project.projectType.includes('SEO')) stages.push('Proposal', 'SEO');
    stages.push('Completed');

    if (stages.length === 1) stages.unshift('Proposal'); // Fallback if somehow empty

    const currentIndex = stages.indexOf(project.stage);
    
    if (currentIndex === -1 || currentIndex >= stages.length - 1) {
      return res.status(400).json({ message: 'Project is already at the final stage.' });
    }

    // Save deliverable if provided
    const { deliverableLink, deliverableNotes } = req.body;
    if (deliverableLink || deliverableNotes) {
      project.deliverables.push({
        stage: project.stage,
        link: deliverableLink,
        notes: deliverableNotes,
        submittedBy: req.user._id
      });
    }

    project.stage = stages[currentIndex + 1];
    if (project.stage === 'Completed') {
       project.status = 'Completed';
    }
    await project.save();

    const populated = await Project.findById(project._id)
      .populate('members', 'name email avatar')
      .populate('coordinator', 'name email avatar')
      .populate('workflowTeams.uiux')
      .populate('workflowTeams.tech')
      .populate('workflowTeams.test')
      .populate('workflowTeams.devops')
      .populate('workflowTeams.digitalMarketing')
      .populate('workflowTeams.seo')
      .lean();

    if (req.io) {
      req.io.emit('projectUpdated', populated);
    }

    // Send notifications to the incoming team
    const nextStage = project.stage;
    let targetTeam = null;
    if (nextStage === 'Tech' && populated.workflowTeams?.tech) targetTeam = populated.workflowTeams.tech;
    else if (nextStage === 'Test' && populated.workflowTeams?.test) targetTeam = populated.workflowTeams.test;
    else if (nextStage === 'DevOps' && populated.workflowTeams?.devops) targetTeam = populated.workflowTeams.devops;
    else if (nextStage === 'Digital Marketing' && populated.workflowTeams?.digitalMarketing) targetTeam = populated.workflowTeams.digitalMarketing;
    else if (nextStage === 'SEO' && populated.workflowTeams?.seo) targetTeam = populated.workflowTeams.seo;

    if (targetTeam && targetTeam.members) {
      const allTeamMembers = [...targetTeam.members];
      if (targetTeam.leader && !allTeamMembers.includes(targetTeam.leader)) {
        allTeamMembers.push(targetTeam.leader);
      }
      
      allTeamMembers.forEach(memberId => {
        sendNotification(
          req,
          memberId,
          'project_update',
          `Project Handoff: ${project.title}`,
          `The project has advanced to the ${nextStage} stage. Your team is now up!`,
          `/projects`
        );
      });
    } else if (nextStage === 'Completed' && populated.coordinator) {
      sendNotification(
        req, 
        populated.coordinator._id, 
        'success', 
        'Project Completed', 
        `The project ${project.title} has reached the final stage!`, 
        `/projects`
      );
    }

    await logActivity({
      workspace: req.params.workspaceId,
      user: req.user._id,
      action: 'UPDATE_PROJECT_STAGE',
      entityType: 'Project',
      entityId: project._id,
      details: `Advanced project "${project.title}" to stage ${project.stage}`
    });

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request a rollback to a previous stage
// @route   POST /api/workspaces/:workspaceId/projects/:projectId/rollback
// @access  Private
const requestRollback = async (req, res) => {
  try {
    const { reason, targetStage } = req.body;
    const project = await Project.findById(req.params.projectId);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    project.rollbackRequest = {
      isRequested: true,
      requestedBy: req.user._id,
      reason,
      targetStage
    };
    
    await project.save();

    if (req.io) {
      req.io.emit('projectUpdated', project);
    }
    
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve or reject a rollback request
// @route   POST /api/workspaces/:workspaceId/projects/:projectId/rollback/approve
// @access  Private (Team Leaders, HR, Super Admin)
const approveRollback = async (req, res) => {
  try {
    const { approved } = req.body;
    
    // Authorization check
    if (!['super_admin', 'hr', 'team_leader'].includes(req.user.role) && !(req.user.designation || '').toLowerCase().includes('coordinator')) {
      return res.status(401).json({ message: 'Not authorized to approve rollbacks.' });
    }

    const project = await Project.findById(req.params.projectId);
    if (!project || !project.rollbackRequest?.isRequested) {
      return res.status(400).json({ message: 'No active rollback request found' });
    }
    
    if (approved) {
      project.stage = project.rollbackRequest.targetStage;
    }
    
    // Clear the request regardless of approval
    project.rollbackRequest = {
      isRequested: false,
      requestedBy: null,
      reason: '',
      targetStage: ''
    };
    
    await project.save();

    const populated = await Project.findById(project._id)
      .populate('members', 'name email avatar')
      .populate('coordinator', 'name email avatar')
      .populate('workflowTeams.uiux')
      .populate('workflowTeams.tech')
      .populate('workflowTeams.test')
      .populate('workflowTeams.devops')
      .populate('workflowTeams.digitalMarketing')
      .populate('workflowTeams.seo')
      .lean();

    if (req.io) {
      req.io.emit('projectUpdated', populated);
    }
    
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getWorkspaceMembers,
  advanceStage,
  requestRollback,
  approveRollback
};
