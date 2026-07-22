const express = require('express');
const router = express.Router();
const { getUsers, updatePresence } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getUsers);
router.route('/status').put(protect, updatePresence);

module.exports = router;
