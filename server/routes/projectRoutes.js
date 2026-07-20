const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams allows us to access workspaceId from parent router
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getWorkspaceMembers
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const taskRouter = require('./taskRoutes');
const documentRouter = require('./documentRoutes');

router.use('/:projectId/tasks', taskRouter);
router.use('/:projectId/documents', documentRouter);

router.route('/').get(protect, getProjects).post(protect, createProject);
router.route('/members').get(protect, getWorkspaceMembers);
router.route('/:projectId').put(protect, updateProject).delete(protect, deleteProject);

module.exports = router;
