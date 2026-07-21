const express = require('express');
const router = express.Router();
const {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  updateMember
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');
const projectRouter = require('./projectRoutes');
const meetingRouter = require('./meetingRoutes');
const messageRouter = require('./messageRoutes');
const teamRouter = require('./teamRoutes');
const attendanceRouter = require('./attendance');
const leaveRouter = require('./leave');

router.use('/:workspaceId/projects', projectRouter);
router.use('/:workspaceId/meetings', meetingRouter);
router.use('/:workspaceId/channels', messageRouter);
router.use('/:workspaceId/teams', teamRouter);
router.use('/:workspaceId/attendance', attendanceRouter);
router.use('/:workspaceId/leaves', leaveRouter);

router.route('/').get(protect, getWorkspaces).post(protect, createWorkspace);
router.route('/:id').get(protect, getWorkspace).put(protect, updateWorkspace).delete(protect, deleteWorkspace);
router.route('/:id/members').post(protect, addMember);
router.route('/:id/members/:userId').put(protect, updateMember);

module.exports = router;
