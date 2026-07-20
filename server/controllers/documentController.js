const Document = require('../models/Document');

// @desc    Get documents for a project
// @route   GET /api/projects/:projectId/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ project: req.params.projectId })
      .populate('author', 'name email avatar')
      .populate('lastUpdatedBy', 'name email avatar');

    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new document
// @route   POST /api/projects/:projectId/documents
// @access  Private
const createDocument = async (req, res) => {
  try {
    const { title, content, workspace } = req.body;

    if (!title || !workspace) {
      return res.status(400).json({ message: 'Please add title and workspace ID' });
    }

    const document = await Document.create({
      title,
      content,
      project: req.params.projectId,
      workspace,
      author: req.user.id,
      lastUpdatedBy: req.user.id
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
    document.lastUpdatedBy = req.user.id;
    
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
