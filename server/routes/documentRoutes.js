const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getDocuments,
  createDocument,
  updateDocument
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getDocuments).post(protect, createDocument);
router.route('/:id').put(protect, updateDocument);

module.exports = router;
