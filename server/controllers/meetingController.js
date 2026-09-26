const Meeting = require('../models/Meeting');
const { sendNotification } = require('./notificationController');

// @desc    Get meetings for a workspace
// @route   GET /api/workspaces/:workspaceId/meetings
// @access  Private
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ workspace: req.params.workspaceId })
      .populate('participants', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .lean();

    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new meeting
// @route   POST /api/workspaces/:workspaceId/meetings
// @access  Private
const createMeeting = async (req, res) => {
  try {
    const { title, date, time, participants, type, link, description } = req.body;

    if (!title || !date) {
      return res.status(400).json({ message: 'Please add title and date' });
    }

    const meeting = await Meeting.create({
      title,
      date,
      time: time || '',
      type: type || 'direct_meet',
      link: link || '',
      description: description || '',
      workspace: req.params.workspaceId,
      participants: participants || [req.user._id],
      createdBy: req.user._id
    });
    
    // Emit event via socket.io
    if(req.io) {
       req.io.emit('meetingCreated', meeting);
    }
    
    // Send persistent notifications to all participants
    meeting.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        sendNotification(
          req,
          participantId,
          'meeting_scheduled',
          'New Meeting Scheduled',
          `You have been invited to: ${title} on ${new Date(date).toLocaleDateString()}`,
          `/meetings`
        );
      }
    });

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a meeting
// @route   PUT /api/meetings/:id
// @access  Private
const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (!meeting) {
       return res.status(404).json({ message: 'Meeting not found' });
    }

    if(req.io) {
      req.io.emit('meetingUpdated', meeting);
    }

    res.status(200).json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
// @access  Private
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    
    if (!meeting) {
       return res.status(404).json({ message: 'Meeting not found' });
    }

    if(req.io) {
      req.io.emit('meetingDeleted', req.params.id);
    }

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting
};
