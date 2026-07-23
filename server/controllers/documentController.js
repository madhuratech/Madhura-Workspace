const Document = require('../models/Document');

// @desc    Get documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    let query = {};
    
    // Role-based access control
    // If super_admin or hr, they can see all documents
    // If employee or team_leader, they can only see their own uploaded documents
    if (req.user.role === 'employee' || req.user.role === 'team_leader') {
      query.author = req.user._id;
    }
    
    // Optional filtering by project or workspace
    if (req.query.projectId) query.project = req.query.projectId;
    if (req.query.workspaceId) query.workspace = req.query.workspaceId;

    const documents = await Document.find(query)
      .populate('author', 'name email avatar')
      .populate('lastUpdatedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new document
// @route   POST /api/documents
// @access  Private
const createDocument = async (req, res) => {
  try {
    const { title, content, fileUrl, originalName, mimeType, size, project, workspace } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Please add a title' });
    }

    const document = await Document.create({
      title,
      content,
      fileUrl,
      originalName,
      mimeType,
      size,
      project: project || undefined,
      workspace: workspace || undefined,
      author: req.user._id,
      lastUpdatedBy: req.user._id
    });
    
    if(req.io) {
      req.io.emit('documentCreated', document);
    }

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
const updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
       return res.status(404).json({ message: 'Document not found' });
    }
    
    document.title = req.body.title || document.title;
    document.content = req.body.content || document.content;
    document.lastUpdatedBy = req.user._id;
    
    await document.save();

    if(req.io) {
      req.io.emit('documentUpdated', document);
    }

    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDocuments,
  createDocument,
  updateDocument
};
