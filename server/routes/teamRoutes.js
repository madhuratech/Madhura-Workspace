const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam
} = require('../controllers/teamController');

router.route('/')
  .get(protect, getTeams)
  .post(protect, createTeam);

router.route('/:id')
  .put(protect, updateTeam)
  .delete(protect, deleteTeam);

module.exports = router;
