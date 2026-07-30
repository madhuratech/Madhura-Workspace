const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Invitation = require('../models/Invitation');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

// Setup Ethereal for testing or use provided SMTP credentials (you can set these in .env later)
const createTransporter = async () => {
  let config = {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  };

  // If no credentials provided, create a test account on the fly for development
  if (!process.env.SMTP_USER) {
    console.log('No SMTP credentials found, creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    config.auth = {
      user: testAccount.user,
      pass: testAccount.pass,
    };
  }

  return nodemailer.createTransport(config);
};

// @desc    Send an invitation
// @route   POST /api/invitations
// @access  Private
exports.inviteUser = async (req, res) => {
  try {
    const { email, role, designation, workspaceId } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Auth check
    const currentMember = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    const isAuthorized = workspace.owner.toString() === req.user._id.toString() || 
                        (currentMember && ['super_admin', 'hr', 'team_leader'].includes(currentMember.role));
    
    if (!isAuthorized) {
      return res.status(401).json({ message: 'Not authorized to send invites' });
    }

    if (currentMember && currentMember.role === 'team_leader' && role !== 'employee') {
      return res.status(403).json({ message: 'Team leaders can only invite employees' });
    }

    // Check if user exists and is already in workspace
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const alreadyInWorkspace = workspace.members.some(m => m.user && m.user.toString() === existingUser._id.toString());
      if (alreadyInWorkspace) {
        return res.status(400).json({ message: 'User is already in this workspace' });
      }
    }

    // Create token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save invitation
    const invitation = await Invitation.create({
      email,
      role: role || 'employee',
      designation: designation || '',
      workspace: workspaceId,
      invitedBy: req.user._id,
      token,
      expiresAt
    });

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/register?token=${token}`;

    const transporter = await createTransporter();
    
    const mailOptions = {
      from: '"Madhura Workspace" <noreply@madhuraworkspace.com>',
      to: email,
      subject: `You've been invited to join ${workspace.name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h2 style="color: #333;">You're Invited!</h2>
          <p style="font-size: 16px; color: #555;">
            You have been invited to join the <strong>${workspace.name}</strong> workspace as a <strong>${role || 'employee'}</strong>.
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #777;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteLink}">${inviteLink}</a>
          </p>
          <p style="font-size: 12px; color: #aaa; margin-top: 40px;">
            This invitation will expire in 7 days.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    // For local dev with Ethereal
    if (!process.env.SMTP_USER) {
      console.log('--- TEST EMAIL URL ---');
      console.log(nodemailer.getTestMessageUrl(info));
      console.log('----------------------');
    }

    res.status(200).json({ message: 'Invitation sent successfully', previewUrl: nodemailer.getTestMessageUrl(info) });

  } catch (error) {
    console.error('Invite Error:', error);
    res.status(500).json({ message: 'Error sending invitation' });
  }
};

// @desc    Validate an invitation token
// @route   GET /api/invitations/validate/:token
// @access  Public
exports.validateToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    const invitation = await Invitation.findOne({ token }).populate('workspace', 'name');
    
    if (!invitation) {
      return res.status(404).json({ message: 'Invalid or expired invitation token.' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: 'This invitation has expired.' });
    }

    res.status(200).json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      workspaceName: invitation.workspace.name
    });
  } catch (error) {
    console.error('Validate Token Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept an invitation and register/join
// @route   POST /api/invitations/accept
// @access  Public
exports.acceptInvitation = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const invitation = await Invitation.findOne({ token });
    
    if (!invitation) {
      return res.status(404).json({ message: 'Invalid or expired invitation token.' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: 'This invitation has expired.' });
    }

    // Check if user already exists
    let user = await User.findOne({ email: invitation.email });

    if (user) {
      // Just make sure name/password are updated if they want, but usually we just log them in 
      // For simplicity in this flow, we will update the password.
      user.name = name;
      user.password = password; // pre-save hook will hash it
      await user.save();
    } else {
      user = await User.create({
        name,
        email: invitation.email,
        password,
        role: invitation.role, // Global role
        designation: invitation.designation || ''
      });
    }

    // Add to workspace
    const workspace = await Workspace.findById(invitation.workspace);
    if (!workspace) {
       return res.status(404).json({ message: 'Workspace no longer exists.' });
    }

    const alreadyInWorkspace = workspace.members.some(m => m.user && m.user.toString() === user._id.toString());
    
    if (!alreadyInWorkspace) {
      workspace.members.push({ user: user._id, role: invitation.role });
      await workspace.save();
    }

    // Delete the invitation
    await Invitation.findByIdAndDelete(invitation._id);

    // Return token for login
    const jwtToken = user.getSignedJwtToken();
    
    res.status(201).json({
      success: true,
      token: jwtToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation
      }
    });

  } catch (error) {
    console.error('Accept Invitation Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};
