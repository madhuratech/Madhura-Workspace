const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getTasks,
  createTask,
  updateTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getTasks).post(protect, createTask);
router.route('/:id').put(protect, updateTask);

module.exports = router;
