const Note = require('../models/Note');
const Workspace = require('../models/Workspace');

// Get all notes for the current user in a workspace
exports.getNotes = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Verify workspace access
    const workspace = await Workspace.findOne({ _id: workspaceId, 'members.user': req.user._id });
    if (!workspace) {
      return res.status(403).json({ message: 'Access denied to this workspace' });
    }

    const notes = await Note.find({ 
      workspace: workspaceId, 
      user: req.user._id 
    }).sort({ isPinned: -1, updatedAt: -1 });

    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ message: 'Server error fetching notes' });
  }
};

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, content, color, isPinned, attachment } = req.body;
    
    // Verify workspace access
    const workspace = await Workspace.findOne({ _id: workspaceId, 'members.user': req.user._id });
    if (!workspace) {
      return res.status(403).json({ message: 'Access denied to this workspace' });
    }

    const newNote = new Note({
      user: req.user._id,
      workspace: workspaceId,
      title: title || '',
      content: content || '',
      color: color || '#ffffff',
      isPinned: isPinned || false,
    });

    if (attachment) {
      newNote.attachments.push(attachment);
    }

    await newNote.save();
    res.status(201).json(newNote);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ message: 'Server error creating note' });
  }
};

// Update a note
exports.updateNote = async (req, res) => {
  try {
    const { workspaceId, id } = req.params;
    const updates = req.body; // Can include title, content, color, isPinned, attachment

    const note = await Note.findOne({ _id: id, workspace: workspaceId, user: req.user._id });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (updates.title !== undefined) note.title = updates.title;
    if (updates.content !== undefined) note.content = updates.content;
    if (updates.color !== undefined) note.color = updates.color;
    if (updates.isPinned !== undefined) note.isPinned = updates.isPinned;
    
    if (updates.attachment) {
      note.attachments.push(updates.attachment);
    }

    if (updates.removeAttachmentId) {
      note.attachments = note.attachments.filter(att => String(att._id) !== String(updates.removeAttachmentId));
    }

    await note.save();
    res.json(note);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ message: 'Server error updating note' });
  }
};

// Delete a note
exports.deleteNote = async (req, res) => {
  try {
    const { workspaceId, id } = req.params;
    const note = await Note.findOneAndDelete({ _id: id, workspace: workspaceId, user: req.user._id });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ message: 'Server error deleting note' });
  }
};
