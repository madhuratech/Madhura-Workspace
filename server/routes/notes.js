const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const noteController = require('../controllers/noteController');

// All note routes are protected
router.use(protect);

router.route('/')
  .get(noteController.getNotes)
  .post(noteController.createNote);

router.route('/:id')
  .put(noteController.updateNote)
  .delete(noteController.deleteNote);

module.exports = router;
