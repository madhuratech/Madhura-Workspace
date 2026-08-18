const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// @desc    Get all workspaces for user
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    })
      .select('name description owner members createdAt')
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar designation presenceStatus')
      .lean();

    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Please add a workspace name' });
    }

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only MD can create workspaces' });
    }

    // Prepare members list: Owner is super_admin. Other selected members get their global roles or default to employee.
    const workspaceMembers = [{ user: req.user._id, role: 'super_admin' }];
    
    if (members && Array.isArray(members)) {
      // members should be an array of objects { user: id, role: string } or just an array of user IDs
      for (const memberId of members) {
        if (memberId.toString() !== req.user._id.toString()) {
           // We could fetch user to get role, but for simplicity let's default to employee if role not specified in request, 
           // though the client could send it. For now, default to employee if just IDs are sent.
           const userDetails = await User.findById(memberId);
           if (userDetails) {
             workspaceMembers.push({ user: memberId, role: userDetails.role || 'employee' });
           }
        }
      }
    }

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      members: workspaceMembers,
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single workspace
// @route   GET /api/workspaces/:id
// @access  Private
const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .select('name description owner members createdAt')
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar designation presenceStatus')
      .lean();

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is member or owner
    const isMember = workspace.members.find(m => m.user && m.user._id.toString() === req.user._id.toString());
    if (workspace.owner._id.toString() !== req.user._id.toString() && !isMember) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Only owner or super_admin can update
    const member = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    if (workspace.owner.toString() !== req.user._id.toString() && (!member || member.role !== 'super_admin')) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    let updateData = { ...req.body };
    
    // If members array is provided as simple IDs, convert it to the required format
    if (req.body.members && Array.isArray(req.body.members)) {
      const newMembers = [{ user: workspace.owner, role: 'super_admin' }];
      for (const memberId of req.body.members) {
        if (memberId.toString() !== workspace.owner.toString()) {
           // Preserve existing role if already a member
           const existingMember = workspace.members.find(m => m.user && m.user.toString() === memberId.toString());
           if (existingMember) {
             newMembers.push({ user: memberId, role: existingMember.role });
           } else {
             // Otherwise assign their global role
             const userDetails = await User.findById(memberId);
             if (userDetails) {
               newMembers.push({ user: memberId, role: userDetails.role || 'employee' });
             }
           }
        }
      }
      updateData.members = newMembers;
    }

    const updatedWorkspace = await Workspace.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json(updatedWorkspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
// @access  Private
const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized. Only owner can delete.' });
    }

    await workspace.deleteOne();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to workspace
// @route   POST /api/workspaces/:id/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { email, role, name, password, designation } = req.body;

    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check auth
    const currentMember = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    const isAuthorized = workspace.owner.toString() === req.user._id.toString() || 
                        (currentMember && ['super_admin', 'hr', 'team_leader'].includes(currentMember.role));
    
    if (!isAuthorized) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (currentMember && currentMember.role === 'team_leader' && role !== 'employee') {
      return res.status(403).json({ message: 'Team leaders can only add employees' });
    }

    let userToAdd = await User.findOne({ email });

    // If user does not exist, CREATE the user account instantly with global role!
    if (!userToAdd) {
      if (!name || !password) {
        return res.status(400).json({ message: 'User does not exist. Please provide a Name and Password to create the account.' });
      }
      userToAdd = await User.create({
        name,
        email,
        password,
        role: role || 'employee',   // ← Set global role so backend filters work
        designation: designation || ''
      });
      
      if (resend) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'https://workspace.madhuratech.com';
          const senderEmail = 'onboarding@resend.dev'; // Fixed to onboarding email for Resend free tier
          const senderName = workspace.name || 'Madhura Workspace';
          
          console.log(`[ADD_MEMBER DEBUG] Attempting to send password email to: ${email}`);
          console.log(`[ADD_MEMBER DEBUG] Using sender email: ${senderEmail}`);

          console.log('[ADD_MEMBER DEBUG] Calling Resend API...');
          const resendResponse = await resend.emails.send({
            from: senderEmail,
            to: email,
            subject: `Welcome to ${workspace.name}!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Welcome to ${workspace.name}!</h2>
                <p style="font-size: 16px; color: #555;">
                  Your account has been created successfully as a <strong>${role || 'employee'}</strong>.
                </p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Login Details:</strong></p>
                  <p style="margin: 0 0 5px 0;">Email: ${email}</p>
                  <p style="margin: 0;">Password: ${password}</p>
                </div>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${frontendUrl}/login" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Login to Workspace
                  </a>
                </div>
                <p style="font-size: 12px; color: #aaa; margin-top: 40px; text-align: center;">
                  Please change your password after logging in for the first time.
                </p>
              </div>
            `
          });
          console.log('[ADD_MEMBER DEBUG] Resend API responded with Success:', resendResponse);
        } catch (emailError) {
          console.error('[ADD_MEMBER DEBUG] Failed to send registration email. Resend Error:', emailError);
        }
      }
    } else {
      // If user exists, sync their global role too
      userToAdd.role = role || 'employee';
      if (designation !== undefined) {
        userToAdd.designation = designation;
      }
      await userToAdd.save();
    }

    // Check if user is already in the workspace
    const memberExists = workspace.members.find(m => m.user && m.user.toString() === userToAdd.id.toString());
    if (memberExists) {
      return res.status(400).json({ message: 'User already in workspace' });
    }

    workspace.members.push({ user: userToAdd._id, role: role || 'employee' });
    await workspace.save();

    res.status(200).json({ workspace, userId: userToAdd._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update/Remove member in workspace
// @route   PUT /api/workspaces/:id/members/:userId
// @access  Private
const updateMember = async (req, res) => {
  try {
    const { role, action, designation } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Check auth
    const currentMember = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    const isAuthorized = workspace.owner.toString() === req.user._id.toString() || 
                        (currentMember && ['super_admin', 'hr'].includes(currentMember.role));
                        
    if (!isAuthorized) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const memberIndex = workspace.members.findIndex(m => m.user && m.user.toString() === req.params.userId);
    if (memberIndex === -1) return res.status(404).json({ message: 'Member not found' });

    if (action === 'remove') {
      workspace.members.splice(memberIndex, 1);
    } else {
      workspace.members[memberIndex].role = role;
      // Sync global User role so backend filters (tasks, projects) work correctly
      const updateData = { role };
      if (designation !== undefined) updateData.designation = designation;
      await User.findByIdAndUpdate(req.params.userId, updateData);

      sendNotification(
        req,
        req.params.userId,
        'role_changed',
        'Role Updated',
        `Your role in the workspace has been updated to ${role.replace('_', ' ')}.`,
        '/team'
      );
    }

    await workspace.save();

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  updateMember
};
