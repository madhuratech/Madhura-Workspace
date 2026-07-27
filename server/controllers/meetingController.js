const Meeting = require('../models/Meeting');
const { sendNotification } = require('./notificationController');

// @desc    Get meetings for a workspace
// @route   GET /api/workspaces/:workspaceId/meetings
// @access  Private
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ workspace: req.params.workspaceId })
      .populate('participants', 'name email avatar')
      .populate('createdBy', 'name email avatar');

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

    let videoCallId = '';
    if (type === 'google_meet' && !link) {
      videoCallId = `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const meeting = await Meeting.create({
      title,
      date,
      time: time || '',
      type: type || 'direct_meet',
      link: link || '',
      videoCallId,
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

// @desc    Join meeting (mark as attended)
// @route   POST /api/meetings/:id/join
// @access  Private
const joinMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (!meeting.attendedBy.includes(req.user._id)) {
      meeting.attendedBy.push(req.user._id);
    }
    if (meeting.status === 'scheduled') {
      meeting.status = 'in_progress';
    }
    await meeting.save();
    
    res.status(200).json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    End meeting and generate AI notes
// @route   POST /api/meetings/:id/end
// @access  Private
const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    meeting.status = 'completed';
    // Mock AI notes generation based on title and description
    meeting.aiNotes = `**AI Generated Notes for ${meeting.title}**\n\n- Discussed project status and upcoming deadlines.\n- Reviewed Action items from previous week.\n- Addressed roadblocks mentioned by team members.\n- Decision: Proceed with current architecture.\n\n_Generated from transcript..._`;
    // Mock recording URL
    meeting.recordingUrl = `https://storage.googleapis.com/mock-bucket/recordings/${meeting._id}.mp4`;
    
    await meeting.save();
    
    if (req.io) {
      req.io.emit('meetingUpdated', meeting);
    }
    
    res.status(200).json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  endMeeting
};
