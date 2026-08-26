const Document = require('../models/Document');

// @desc    Get documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    let query = {};
    
    // Role-based access control for folders
    const userRole = req.user.role;
    
    if (userRole === 'super_admin' || userRole === 'hr') {
      // HR and Super Admin can see everything
    } else if (userRole === 'team_leader') {
      // TL can see Project Files and General
      query.folderType = { $in: ['Project Files', 'General'] };
    } else if (userRole === 'employee') {
      // Employee sees General, and only their own files if they uploaded them
      query.$or = [
        { folderType: 'General' },
        { author: req.user._id }
      ];
    }
    
    if (req.query.projectId) query.project = req.query.projectId;
    if (req.query.workspaceId) query.workspace = req.query.workspaceId;

    const documents = await Document.find(query)
      .populate('author', 'name email avatar role')
      .populate('lastUpdatedBy', 'name email avatar')
      .populate('versionHistory.updatedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    // Enforce privacy: Documents uploaded by TLs or Employees are only visible to MD, HR, and the author themselves.
    // Documents uploaded by MD or HR are visible to everyone (subject to folder permissions above).
    let filteredDocuments = documents;
    
    if (userRole !== 'super_admin' && userRole !== 'hr') {
      filteredDocuments = documents.filter(doc => {
        // Allow if the user is the author
        if (doc.author && doc.author._id.toString() === req.user._id.toString()) {
          return true;
        }
        // Allow if the author is Management (super_admin or hr)
        if (doc.author && (doc.author.role === 'super_admin' || doc.author.role === 'hr')) {
          return true;
        }
        // If author is missing (legacy), hide it just to be safe
        return false;
      });
    }

    res.status(200).json(filteredDocuments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new document
// @route   POST /api/documents
// @access  Private
const createDocument = async (req, res) => {
  try {
    const { title, content, fileUrl, originalName, mimeType, size, project, workspace, folderType } = req.body;

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
      folderType: folderType || 'General',
      project: project || undefined,
      workspace: workspace || undefined,
      author: req.user._id,
      lastUpdatedBy: req.user._id,
      versionHistory: [{ fileUrl, originalName, updatedBy: req.user._id }]
    });
    
    // Populate before emit
    const populatedDoc = await Document.findById(document._id)
      .populate('author', 'name email avatar')
      .populate('lastUpdatedBy', 'name email avatar')
      .populate('versionHistory.updatedBy', 'name email avatar');

    if(req.io) {
      req.io.emit('documentCreated', populatedDoc);
    }

    res.status(201).json(populatedDoc);
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
    
    if (req.body.fileUrl && req.body.fileUrl !== document.fileUrl) {
      document.fileUrl = req.body.fileUrl;
      document.originalName = req.body.originalName || document.originalName;
      document.mimeType = req.body.mimeType || document.mimeType;
      document.size = req.body.size || document.size;
      document.versionHistory.push({
        fileUrl: req.body.fileUrl,
        originalName: req.body.originalName,
        updatedBy: req.user._id
      });
    }
    
    await document.save();

    const updatedDoc = await Document.findById(document._id)
      .populate('author', 'name email avatar')
      .populate('lastUpdatedBy', 'name email avatar')
      .populate('versionHistory.updatedBy', 'name email avatar');

    if(req.io) {
      req.io.emit('documentUpdated', updatedDoc);
    }

    res.status(200).json(updatedDoc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
       return res.status(404).json({ message: 'Document not found' });
    }
    
    // Authorization check
    if (req.user.role !== 'super_admin' && req.user.role !== 'hr') {
       if (document.author.toString() !== req.user._id.toString()) {
           return res.status(403).json({ message: 'Not authorized to delete this document' });
       }
    }
    
    await document.deleteOne();
    
    if(req.io) {
      req.io.emit('documentDeleted', req.params.id);
    }
    
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument
};
