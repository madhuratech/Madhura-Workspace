const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res) => {
  try {
    let query = {};
    const userId = req.user._id.toString();
    const userRole = req.user.role;

    if (req.query.workspaceId) query.workspace = req.query.workspaceId;

    if (userRole === 'super_admin') {
      // Super admins see all tickets (as per the open question fallback, super admins maintain oversight)
    } else if (userRole === 'employee') {
      // Employees only see their own tickets
      query.createdBy = userId;
    } else {
      // HR and Team Leaders see tickets they created OR tickets assigned to their role
      query.$or = [
        { createdBy: userId },
        { assignedRole: userRole }
      ];
    }

    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name email avatar role')
      .populate('assignedTo', 'name email avatar role')
      .populate('comments.author', 'name email avatar role')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email avatar role')
      .populate('assignedTo', 'name email avatar role')
      .populate('comments.author', 'name email avatar role')
      .lean();
      
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    // Auth check
    const isCreator = ticket.createdBy._id.toString() === req.user._id.toString();
    const isAssignedRole = req.user.role === ticket.assignedRole;
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isCreator && !isAssignedRole && !isSuperAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a ticket
// @route   POST /api/tickets
// @access  Private
const createTicket = async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      return res.status(403).json({ message: 'Super admins cannot create support tickets.' });
    }

    const { title, description, priority, department, workspace, assignedRole } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Please provide title and description' });
    }

    const ticket = await Ticket.create({
      title,
      description,
      priority: priority || 'Medium',
      department: department || 'General',
      workspace,
      assignedRole: assignedRole || 'super_admin',
      createdBy: req.user._id
    });
    
    // Populate to return the full object structure immediately
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email avatar role');

    if (req.io) {
      req.io.emit('ticketCreated', populatedTicket);
    }
    
    // Notify all Super Admins, HR, and the assigned team members if any
    const notifyUsers = async () => {
      try {
        const admins = await User.find({ role: { $in: ['super_admin', 'hr', 'team_leader'] } }).select('_id');
        for (const admin of admins) {
          if (admin._id.toString() !== req.user._id.toString()) {
            await sendNotification(
              { user: req.user, io: req.io, onlineUsers: req.onlineUsers },
              admin._id,
              'ticket_created',
              'New Support Ticket',
              `A new ticket "${title}" was submitted.`,
              '/tickets'
            );
          }
        }
      } catch (err) {
        console.error('Failed to notify admins for ticket:', err);
      }
    };
    notifyUsers();

    res.status(201).json(populatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a ticket (Status, Assignee)
// @route   PUT /api/tickets/:id
// @access  Private (HR/SuperAdmin)
const updateTicket = async (req, res) => {
  try {
    // Only HR or Admin should change status/assignee typically, but we will allow the creator to close it
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const isCreator = ticket.createdBy.toString() === req.user._id.toString();
    const isResolver = req.user.role === 'hr' || req.user.role === 'super_admin' || req.user.role === 'team_leader';

    if (!isCreator && !isResolver) {
      return res.status(403).json({ message: 'Not authorized to update this ticket' });
    }

    const { status, assignedTo } = req.body;
    
    if (status) ticket.status = status;
    if (assignedTo && isResolver) ticket.assignedTo = assignedTo;

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email avatar role')
      .populate('assignedTo', 'name email avatar role')
      .populate('comments.author', 'name email avatar role');

    if (req.io) {
      req.io.emit('ticketUpdated', updatedTicket);
    }

    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
const addTicketComment = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    const isCreator = ticket.createdBy.toString() === req.user._id.toString();
    const isAssignedRole = req.user.role === ticket.assignedRole;
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isCreator && !isAssignedRole && !isSuperAdmin) {
      return res.status(403).json({ message: 'Not authorized to comment on this ticket' });
    }

    const newComment = {
      text,
      author: req.user._id
    };

    ticket.comments.push(newComment);
    await ticket.save();
    
    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email avatar role')
      .populate('assignedTo', 'name email avatar role')
      .populate('comments.author', 'name email avatar role');

    if (req.io) {
      req.io.emit('ticketUpdated', updatedTicket);
    }

    res.status(201).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  addTicketComment
};
