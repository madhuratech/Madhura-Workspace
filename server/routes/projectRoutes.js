const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams allows us to access workspaceId from parent router
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getWorkspaceMembers,
  advanceStage,
  requestRollback,
  approveRollback
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const taskRouter = require('./taskRoutes');
const documentRouter = require('./documentRoutes');

router.use('/:projectId/tasks', taskRouter);
router.use('/:projectId/documents', documentRouter);

router.route('/').get(protect, getProjects).post(protect, createProject);
router.route('/members').get(protect, getWorkspaceMembers);
router.route('/:projectId').get(protect, getProject).put(protect, updateProject).delete(protect, deleteProject);
router.route('/:projectId/advance').put(protect, advanceStage);
router.route('/:projectId/rollback').post(protect, requestRollback);
router.route('/:projectId/rollback/approve').post(protect, approveRollback);

module.exports = router;
