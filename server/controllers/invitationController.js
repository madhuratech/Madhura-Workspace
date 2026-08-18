const crypto = require('crypto');
const { Resend } = require('resend');
const Invitation = require('../models/Invitation');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const frontendUrl = process.env.FRONTEND_URL || 'https://workspace.madhuratech.com';
    const inviteLink = `${frontendUrl}/register?token=${token}`;

    const senderEmail = 'onboarding@resend.dev'; // Fixed to onboarding email for Resend free tier
    const senderName = workspace.name || 'Madhura Workspace';

    console.log(`[INVITE DEBUG] Attempting to send invite to: ${email}`);
    console.log(`[INVITE DEBUG] Using sender email: ${senderEmail}`);

    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('[INVITE DEBUG] RESEND_API_KEY is not defined in the environment. Skipping actual email send. Invitation link:');
        console.log(inviteLink);
      } else {
        console.log('[INVITE DEBUG] Calling Resend API...');
        const resendResponse = await resend.emails.send({
          from: senderEmail,
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
        });
        console.log('[INVITE DEBUG] Resend API responded with Success:', resendResponse);
      }
    } catch (emailError) {
      console.error('[INVITE DEBUG] Resend Error:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send email. If you used a custom Company Email, make sure its domain is verified in Resend.' 
      });
    }

    res.status(200).json({ message: 'Invitation sent successfully' });

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
    const jwtToken = require('jsonwebtoken').sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
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
