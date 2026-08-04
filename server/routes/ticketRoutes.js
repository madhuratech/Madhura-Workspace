const express = require('express');
const router = express.Router();
const { 
  getTickets, 
  getTicket, 
  createTicket, 
  updateTicket, 
  addTicketComment 
} = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getTickets)
  .post(protect, createTicket);

router.route('/:id')
  .get(protect, getTicket)
  .put(protect, updateTicket);

router.post('/:id/comments', protect, addTicketComment);

module.exports = router;
