const Team = require('../models/Team');
const Workspace = require('../models/Workspace');

// @desc    Get teams for workspace
// @route   GET /api/workspaces/:workspaceId/teams
// @access  Private
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ workspace: req.params.workspaceId })
      .populate('leader', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a team
// @route   POST /api/workspaces/:workspaceId/teams
// @access  Private
const createTeam = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const currentMember = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    const isAuthorized = workspace.owner.toString() === req.user._id.toString() || 
                        (currentMember && ['super_admin', 'hr'].includes(currentMember.role));
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only super admin and hr can create teams' });
    }

    const { name, leader, members } = req.body;

    if (!name || !leader) {
      return res.status(400).json({ message: 'Please provide team name and a leader' });
    }

    const team = await Team.create({
      name,
      leader,
      members: members || [],
      workspace: req.params.workspaceId,
      createdBy: req.user._id
    });

    const populatedTeam = await team.populate('leader members', 'name email avatar');
    
    // Notify users
    if (req.io) {
      req.io.emit('teamCreated', populatedTeam);
    }

    res.status(201).json(populatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a team
// @route   PUT /api/workspaces/:workspaceId/teams/:id
// @access  Private
const updateTeam = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    const currentMember = workspace ? workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString()) : null;
    const isAuthorized = workspace && (workspace.owner.toString() === req.user._id.toString() || 
                        (currentMember && ['super_admin', 'hr'].includes(currentMember.role)));
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only super admin and hr can update teams' });
    }

    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('leader members', 'name email avatar');
      
    if (!team) return res.status(404).json({ message: 'Team not found' });

    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a team
// @route   DELETE /api/workspaces/:workspaceId/teams/:id
// @access  Private
const deleteTeam = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    const currentMember = workspace ? workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString()) : null;
    const isAuthorized = workspace && (workspace.owner.toString() === req.user._id.toString() || 
                        (currentMember && ['super_admin', 'hr'].includes(currentMember.role)));

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only super admin and hr can delete teams' });
    }

    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam
};
